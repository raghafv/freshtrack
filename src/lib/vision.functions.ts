import { isLikelyFood } from "@/lib/food-guard";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ImageInput = z.object({
  /** data:image/...;base64,... */
  image: z.string().min(32),
});

function parseJsonish(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    return match ? (JSON.parse(match[0]) as Record<string, unknown>) : {};
  }
}

/** Records one vision call so the owner dashboard sees every provider, ok or not. */
async function logVision(
  feature: string,
  provider: string,
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
      model: null,
      ok,
      ms,
      chars: 0,
      error: error ? error.slice(0, 300) : null,
    });
  } catch (e) {
    console.error("[vision] usage log failed", e);
  }
}

type VisionCall = (image: string, system: string, instruction: string) => Promise<
  Record<string, unknown>
>;

/** Google Gemini directly on the user's own key — first choice, no Lovable credits. */
const GEMINI_VISION_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

const geminiVision: VisionCall = async (image, system, instruction) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("no key");

  const match = /^data:([^;]+);base64,(.+)$/.exec(image);
  if (!match) throw new Error("image must be a data URL");
  const [, mimeType, data] = match;

  let lastError = "gemini failed";
  for (const model of GEMINI_VISION_MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [
            { role: "user", parts: [{ text: instruction }, { inlineData: { mimeType, data } }] },
          ],
          generationConfig: { responseMimeType: "application/json" },
        }),
      },
    );

    if (res.ok) {
      const json = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      return parseJsonish(
        json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "{}",
      );
    }

    lastError = `${res.status} ${(await res.text()).slice(0, 200)}`;
    // Only a missing/unsupported model is worth retrying with the next model id.
    if (res.status !== 404 && res.status !== 400) break;
  }
  throw new Error(lastError);
};

/** Hugging Face router (OpenAI-compatible) — second free fallback. */
const HF_VISION_MODELS = [
  "Qwen/Qwen3-VL-30B-A3B-Instruct",
  "Qwen/Qwen2.5-VL-72B-Instruct",
  "google/gemma-3-27b-it",
];

const huggingFaceVision: VisionCall = async (image, system, instruction) => {
  const key = process.env.HUGGINGFACE_API_KEY;
  if (!key) throw new Error("no key");

  let lastError = "hugging face failed";
  for (const model of HF_VISION_MODELS) {
    const res = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: `${instruction}\n\nAnswer with raw JSON only, no markdown.` },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
        max_tokens: 1200,
      }),
    });

    if (res.ok) {
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return parseJsonish(json.choices?.[0]?.message?.content ?? "{}");
    }

    lastError = `${res.status} ${(await res.text()).slice(0, 200)}`;
    // A model that a provider no longer serves -> try the next vision model.
    if (res.status !== 400 && res.status !== 404) break;
  }
  throw new Error(lastError);
};

/** OpenRouter (OpenAI-compatible) — third fallback, works with free vision models. */
const openRouterVision: VisionCall = async (image, system, instruction) => {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("no key");

  const configured = (process.env.OPENROUTER_MODEL ?? "").trim();
  // "openrouter/free" is a routing alias, not a model id — map it to free vision models.
  const models =
    !configured || configured.toLowerCase() === "openrouter/free"
      ? [
          "meta-llama/llama-3.2-11b-vision-instruct:free",
          "qwen/qwen2.5-vl-72b-instruct:free",
          "google/gemma-3-27b-it:free",
        ]
      : [configured];

  let lastError = "openrouter failed";
  for (const model of models) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: `${instruction}\n\nAnswer with raw JSON only, no markdown.` },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
        max_tokens: 1200,
      }),
    });

    if (res.ok) {
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return parseJsonish(json.choices?.[0]?.message?.content ?? "{}");
    }

    lastError = `${res.status} ${(await res.text()).slice(0, 200)}`;
    if (res.status !== 400 && res.status !== 404) break;
  }
  throw new Error(lastError);
};

/** Lovable AI gateway — last resort, the only path that spends Lovable credits. */
const lovableVision: VisionCall = async (image, system, instruction) => {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("no key");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "text", text: instruction },
            { type: "image_url", image_url: { url: image } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return parseJsonish(json.choices?.[0]?.message?.content ?? "{}");
};

const VISION_PROVIDERS: { name: string; call: VisionCall }[] = [
  { name: "gemini", call: geminiVision },
  { name: "huggingface", call: huggingFaceVision },
  { name: "openrouter", call: openRouterVision },
  { name: "lovable", call: lovableVision },
];


/**
 * Runs the image through every configured provider in order and returns the
 * first parsed answer. Personal keys go first so Lovable credits are only ever
 * touched when both of them fail.
 */
async function callVision(
  image: string,
  system: string,
  instruction: string,
  feature = "vision",
  userId: string | null = null,
) {
  let lastError = "AI is not configured for this project.";

  for (const provider of VISION_PROVIDERS) {
    const started = Date.now();
    try {
      const value = await provider.call(image, system, instruction);
      void logVision(feature, provider.name, true, Date.now() - started, null, userId);
      return value;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === "no key") continue; // provider not configured -> skip silently
      lastError = message;
      console.error(`[vision:${feature}] ${provider.name} failed: ${message}`);
      void logVision(feature, provider.name, false, Date.now() - started, message, userId);
    }
  }

  throw new Error(
    `AI is temporarily unavailable — add the item manually for now. (${lastError.slice(0, 80)})`,
  );
}



export interface DetectedGrocery {
  name: string;
  confidence: number;
  category: string;
  storage: string;
  shelfLifeDays: number;
  unit: string;
  brand: string | null;
  /** Visual freshness 0-1: 1 = just bought, 0 = clearly spoiled. */
  freshness: number;
  /** Short reason for the freshness judgement, shown to the user. */
  note: string | null;
  /** True when the product looks factory-sealed (shelf life starts from packing). */
  packaged: boolean;
}

/** Detect grocery products visible in a photo. */
export const detectGroceries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ImageInput.parse(input))
  .handler(async ({ data, context }): Promise<{ items: DetectedGrocery[] }> => {
    const parsed = await callVision(
      data.image,
      "You identify grocery products in photos for a pantry app used in India. You NEVER guess: anything that is not unmistakably edible food or drink is rejected. Always answer with JSON only.",
      [
        "Identify every distinct grocery product in this photo.",
        'Reply with JSON: {"items":[{"name":"","brand":null,"isFood":true,"confidence":0.0,"category":"","storage":"","shelfLifeDays":0,"unit":"","freshness":0.0,"packaged":false,"note":""}]}.',
        "HARD RULE: only include an item if you are certain it is edible food or drink sold as a grocery. Pens, ink, ID cards, documents, phones, cosmetics, medicines, cleaning products, packaging alone, people, pets and anything you cannot name confidently must be LEFT OUT entirely — never invent a shelf life for them.",
        "isFood: true only for edible food/drink. If in any doubt, set false (it will be discarded).",
        "If the photo contains no edible grocery at all, return an empty items array. An empty array is a correct answer — never pad it.",
        "name: short common product name (e.g. Milk, Tomatoes, Paneer).",
        "confidence: 0-1 how sure you are. Use below 0.45 whenever you are unsure what the item is.",
        "category: one of Dairy, Fruits, Vegetables, Produce, Meat & Seafood, Bakery, Frozen, Beverages, Grains & Pasta, Snacks, Condiments, Spices, Other.",
        "storage: best of Fridge, Freezer, Pantry.",
        "shelfLifeDays: typical days it stays good in that storage. Freezing does NOT make everything last longer — only give a longer freezer life for foods that genuinely freeze well (meat, fish, peas, bread, cooked food). Milk-based sweets, eggs in shell, fresh salad leaves, cucumbers, tomatoes, potatoes, onions, bananas and most fruit get WORSE in a freezer, so keep their shelf life short there.",
        'unit: one of "g", "kg", "mL", "L", "pcs".',
        "freshness: 0-1 judged from what you can SEE — bruising, wilting, mould, browning, condensation, ripeness. 1 = just harvested/packed, 0.5 = half-way through its life, 0 = spoiled.",
        "packaged: true if it is a sealed factory pack, false for loose fresh produce.",
        'note: max 12 words explaining the freshness call (e.g. "skin slightly spotted, ripe").',
      ].join("\n"),
      "scan-photo",
      context.userId,
    );

    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return {
      items: items
        .map((raw) => {
          const it = raw as Record<string, unknown>;
          const name = String(it.name ?? "").trim();
          if (!name) return null;
          // Never let a non-food object through — no shelf life is invented for it.
          if (it.isFood === false || !isLikelyFood(name)) return null;
          const confidence = Number(it.confidence);
          const score = Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0.5;
          if (score < 0.35) return null;
          const shelf = Number(it.shelfLifeDays);
          return {
            name,
            brand: it.brand ? String(it.brand) : null,
            confidence: score,
            category: String(it.category ?? "Other"),
            storage: ["Fridge", "Freezer", "Pantry"].includes(String(it.storage))
              ? String(it.storage)
              : "Pantry",
            shelfLifeDays: Number.isFinite(shelf) && shelf > 0 ? Math.round(shelf) : 7,
            unit: ["g", "kg", "mL", "L", "pcs"].includes(String(it.unit)) ? String(it.unit) : "pcs",
            freshness: (() => {
              const f = Number(it.freshness);
              return Number.isFinite(f) ? Math.min(1, Math.max(0, f)) : 0.8;
            })(),
            packaged: Boolean(it.packaged),
            note: it.note ? String(it.note).slice(0, 120) : null,
          } satisfies DetectedGrocery;
        })
        .filter((v): v is DetectedGrocery => v !== null)
        .slice(0, 12),
    };
  });


export interface ReceiptLine {
  name: string;
  quantity: number;
  unit: string;
  price: number | null;
}

/** OCR a grocery receipt photo into product lines. */
export const parseReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ImageInput.parse(input))
  .handler(async ({ data }): Promise<{ items: ReceiptLine[]; store: string | null }> => {
    const parsed = await callVision(
      data.image,
      "You read grocery receipts with OCR for a pantry app used in India. Always answer with JSON only.",
      [
        "Read this grocery receipt and extract only the purchased grocery products.",
        'Reply with JSON: {"store":null,"items":[{"name":"","quantity":1,"unit":"pcs","price":null}]}.',
        "name: clean product name without receipt codes or abbreviations.",
        'unit: one of "g", "kg", "mL", "L", "pcs".',
        "price: line total in rupees as a number, or null if unclear.",
        "Skip totals, taxes, discounts, bags and non-food lines.",
      ].join("\n"),
    );

    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return {
      store: parsed.store ? String(parsed.store) : null,
      items: items
        .map((raw) => {
          const it = raw as Record<string, unknown>;
          const name = String(it.name ?? "").trim();
          if (!name) return null;
          const qty = Number(it.quantity);
          const price = Number(it.price);
          return {
            name,
            quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
            unit: ["g", "kg", "mL", "L", "pcs"].includes(String(it.unit)) ? String(it.unit) : "pcs",
            price: Number.isFinite(price) && price > 0 ? price : null,
          } satisfies ReceiptLine;
        })
        .filter((v): v is ReceiptLine => v !== null)
        .slice(0, 40),
    };
  });

export interface LabelDates {
  /** ISO yyyy-mm-dd manufacturing / packed date, when printed on the label. */
  manufactured: string | null;
  /** ISO yyyy-mm-dd expiry / best-before date, when printed on the label. */
  expiry: string | null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function cleanDate(value: unknown): string | null {
  const s = String(value ?? "").trim();
  if (!ISO_DATE.test(s)) return null;
  const d = new Date(`${s}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  if (year < 2000 || year > 2100) return null;
  return s;
}

/** Read printed manufacturing / expiry dates from a packaged product label photo. */
export const extractLabelDates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ImageInput.parse(input))
  .handler(async ({ data }): Promise<LabelDates> => {
    const parsed = await callVision(
      data.image,
      "You read printed dates off packaged grocery labels. Always answer with JSON only.",
      [
        "Look at this packaged product photo, especially near the barcode and the printed batch details.",
        'Reply with JSON: {"manufactured":null,"expiry":null}.',
        "Find any MFG / PKD / packed date and any EXP / EXPIRY / BEST BEFORE / USE BY date.",
        'Return each as an ISO date string "YYYY-MM-DD". If only month and year are printed, use the last day of that month for expiry and the first day for manufacturing.',
        'If a label says "best before N months from manufacture", compute the expiry from the manufacturing date.',
        "Return null for any date that is not clearly printed. Never guess.",
      ].join("\n"),
    );

    return {
      manufactured: cleanDate(parsed.manufactured),
      expiry: cleanDate(parsed.expiry),
    };
  });
