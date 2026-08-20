import { isLikelyFood } from "@/lib/food-guard";
import type { DetectedGrocery, LabelDates, ReceiptLine } from "@/lib/vision.types";

const PROVIDER_TIMEOUT_MS = 14_000;
const TRANSIENT = new Set([429, 500, 502, 503, 504]);

type VisionResult = { value: Record<string, unknown>; model: string };
type VisionCall = (image: string, system: string, instruction: string) => Promise<VisionResult>;

function parseJsonish(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return {};
    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}

function asText(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

async function fetchBounded(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function withTransientRetry(run: () => Promise<Response>): Promise<Response> {
  let response = await run();
  if (!TRANSIENT.has(response.status)) return response;
  await response.body?.cancel();
  await new Promise((resolve) => setTimeout(resolve, 700));
  response = await run();
  return response;
}

async function logVision(
  feature: string,
  provider: string,
  model: string | null,
  ok: boolean,
  ms: number,
  error: string | null,
  userId: string | null,
) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("ai_usage_log").insert({
      user_id: userId,
      feature,
      provider,
      model,
      ok,
      ms,
      chars: 0,
      error: error ? error.slice(0, 300) : null,
    });
  } catch (error) {
    console.error("[vision] usage log failed", error);
  }
}

const geminiVision: VisionCall = async (image, system, instruction) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("no key");
  const model = "gemini-3.1-flash-lite";
  const match = /^data:([^;]+);base64,(.+)$/.exec(image);
  if (!match) throw new Error("image must be a data URL");
  const [, mimeType, data] = match;
  const response = await fetchBounded(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: instruction }, { inlineData: { mimeType, data } }] }],
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: 1200 },
      }),
    });
  if (!response.ok) throw new Error(`${model}: ${response.status} ${(await response.text()).slice(0, 200)}`);
  const json = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return {
    model,
    value: parseJsonish(json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "{}"),
  };
};

const huggingFaceVision: VisionCall = async (image, system, instruction) => {
  const key = process.env.HUGGINGFACE_API_KEY;
  if (!key) throw new Error("no key");
  const model = "google/gemma-3-4b-it";
  const response = await fetchBounded("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: [{ type: "text", text: `${instruction}\nAnswer with raw JSON only.` }, { type: "image_url", image_url: { url: image } }] },
        ],
        max_tokens: 1200,
      }),
    });
  if (!response.ok) throw new Error(`${model}: ${response.status} ${(await response.text()).slice(0, 200)}`);
  const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  return { model, value: parseJsonish(json.choices?.[0]?.message?.content ?? "{}") };
};

const gatewayVision: VisionCall = async (image, system, instruction) => {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("no key");
  const model = "google/gemini-3.6-flash";
  const response = await withTransientRetry(() =>
    fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: [{ type: "text", text: instruction }, { type: "image_url", image_url: { url: image } }] },
        ],
      }),
    }),
  );
  if (!response.ok) throw new Error(`${model}: ${response.status} ${(await response.text()).slice(0, 200)}`);
  const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  return { model, value: parseJsonish(json.choices?.[0]?.message?.content ?? "{}") };
};

const PROVIDERS = [
  { name: "gemini", model: "gemini-3.1-flash-lite", call: geminiVision },
  { name: "huggingface", model: "google/gemma-3-4b-it", call: huggingFaceVision },
  { name: "gateway", model: "google/gemini-3.6-flash", call: gatewayVision },
];

async function callVision(image: string, system: string, instruction: string, feature: string, userId: string) {
  let lastError = "No vision provider is configured.";
  for (const provider of PROVIDERS) {
    const started = Date.now();
    try {
      const result = await provider.call(image, system, instruction);
      void logVision(feature, provider.name, result.model, true, Date.now() - started, null, userId);
      return result.value;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === "no key") continue;
      lastError = message;
      console.error(`[vision:${feature}] ${provider.name} failed: ${message}`);
      void logVision(feature, provider.name, provider.model, false, Date.now() - started, message, userId);
    }
  }
  throw new Error(`Image analysis is temporarily unavailable. Add the item manually. ${lastError.slice(0, 100)}`);
}

export async function detectGroceriesServer(image: string, userId: string): Promise<{ items: DetectedGrocery[] }> {
  const parsed = await callVision(
    image,
    "Identify unmistakable edible groceries for an Indian pantry. Never guess. Return JSON only.",
    [
      'Return {"items":[{"name":"","brand":null,"isFood":true,"confidence":0,"category":"","storage":"","shelfLifeDays":0,"unit":"pcs","freshness":0,"packaged":false,"note":""}]}.',
      "Exclude non-food objects, packaging without food, medicines, cosmetics, cleaners, people, pets, and anything uncertain.",
      "If no edible grocery is confidently identifiable, return an empty items array.",
      "Freezing does not extend every food's life. Do not recommend freezing eggs in shell, salad leaves, cucumber, tomato, potato, onion, banana, or delicate dairy sweets.",
    ].join("\n"),
    "scan-photo",
    userId,
  );
  const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
  const items = rawItems.map((raw) => {
    const item = raw as Record<string, unknown>;
    const name = asText(item.name);
    const confidence = Number(item.confidence);
    const score = Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0;
    if (!name || item.isFood !== true || !isLikelyFood(name) || score < 0.45) return null;
    const shelf = Number(item.shelfLifeDays);
    const freshness = Number(item.freshness);
    return {
      name,
      brand: asText(item.brand) || null,
      confidence: score,
      category: asText(item.category) || "Other",
      storage: ["Fridge", "Freezer", "Pantry"].includes(asText(item.storage)) ? asText(item.storage) : "Pantry",
      shelfLifeDays: Number.isFinite(shelf) && shelf > 0 ? Math.round(shelf) : 7,
      unit: ["g", "kg", "mL", "L", "pcs"].includes(asText(item.unit)) ? asText(item.unit) : "pcs",
      freshness: Number.isFinite(freshness) ? Math.min(1, Math.max(0, freshness)) : 0.8,
      packaged: item.packaged === true,
      note: asText(item.note).slice(0, 120) || null,
    } satisfies DetectedGrocery;
  }).filter((item): item is DetectedGrocery => item !== null).slice(0, 12);
  return { items };
}

export async function parseReceiptServer(image: string, userId: string): Promise<{ items: ReceiptLine[]; store: string | null }> {
  const parsed = await callVision(
    image,
    "Read grocery receipts for an Indian pantry. Return JSON only.",
    'Extract only edible grocery lines. Return {"store":null,"items":[{"name":"","quantity":1,"unit":"pcs","price":null}]}. Skip totals, taxes, bags, cosmetics, cleaners, medicines and other non-food products.',
    "scan-receipt",
    userId,
  );
  const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
  const items = rawItems.map((raw) => {
    const item = raw as Record<string, unknown>;
    const name = asText(item.name);
    if (!name || !isLikelyFood(name)) return null;
    const quantity = Number(item.quantity);
    const price = Number(item.price);
    return {
      name,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      unit: ["g", "kg", "mL", "L", "pcs"].includes(asText(item.unit)) ? asText(item.unit) : "pcs",
      price: Number.isFinite(price) && price > 0 ? price : null,
    } satisfies ReceiptLine;
  }).filter((item): item is ReceiptLine => item !== null).slice(0, 40);
  return { store: asText(parsed.store) || null, items };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
function cleanDate(value: unknown): string | null {
  const text = asText(value);
  if (!ISO_DATE.test(text)) return null;
  const date = new Date(`${text}T00:00:00`);
  return Number.isNaN(date.getTime()) || date.getFullYear() < 2000 || date.getFullYear() > 2100 ? null : text;
}

export async function extractLabelDatesServer(image: string, userId: string): Promise<LabelDates> {
  const parsed = await callVision(
    image,
    "Read printed dates from packaged grocery labels. Return JSON only and never guess.",
    'Return {"manufactured":null,"expiry":null}. Read MFG/PKD and EXP/BEST BEFORE/USE BY near the barcode. Use YYYY-MM-DD; return null unless clearly printed.',
    "scan-label",
    userId,
  );
  return { manufactured: cleanDate(parsed.manufactured), expiry: cleanDate(parsed.expiry) };
}