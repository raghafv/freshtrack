import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

const ImageInput = z.object({
  /** data:image/...;base64,... */
  image: z.string().min(32),
});

async function callVision(image: string, system: string, instruction: string) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI is not configured for this project.");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({
      model: MODEL,
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

  if (res.status === 429) throw new Error("AI is busy right now — try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits to keep scanning.");
  if (!res.ok) {
    const body = await res.text();
    console.error(`[vision] gateway ${res.status}: ${body}`);
    throw new Error("Could not analyse the photo. Try again or add the item manually.");
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = json.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    return match ? (JSON.parse(match[0]) as Record<string, unknown>) : {};
  }
}

export interface DetectedGrocery {
  name: string;
  confidence: number;
  category: string;
  storage: string;
  shelfLifeDays: number;
  unit: string;
  brand?: string | null;
}

/** Detect grocery products visible in a photo. */
export const detectGroceries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ImageInput.parse(input))
  .handler(async ({ data }): Promise<{ items: DetectedGrocery[] }> => {
    const parsed = await callVision(
      data.image,
      "You identify grocery products in photos for a pantry app used in India. Always answer with JSON only.",
      [
        "Identify every distinct grocery product in this photo.",
        'Reply with JSON: {"items":[{"name":"","brand":null,"confidence":0.0,"category":"","storage":"","shelfLifeDays":0,"unit":""}]}.',
        "name: short common product name (e.g. Milk, Tomatoes, Paneer).",
        "confidence: 0-1 how sure you are.",
        "category: one of Dairy, Fruits, Vegetables, Produce, Meat & Seafood, Bakery, Frozen, Beverages, Grains & Pasta, Snacks, Condiments, Spices, Other.",
        "storage: best of Fridge, Freezer, Pantry.",
        "shelfLifeDays: typical days it stays good in that storage.",
        'unit: one of "g", "kg", "mL", "L", "pcs".',
        "If nothing edible is visible, return an empty items array.",
      ].join("\n"),
    );

    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return {
      items: items
        .map((raw) => {
          const it = raw as Record<string, unknown>;
          const name = String(it.name ?? "").trim();
          if (!name) return null;
          const confidence = Number(it.confidence);
          const shelf = Number(it.shelfLifeDays);
          return {
            name,
            brand: it.brand ? String(it.brand) : null,
            confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0.5,
            category: String(it.category ?? "Other"),
            storage: ["Fridge", "Freezer", "Pantry"].includes(String(it.storage))
              ? String(it.storage)
              : "Pantry",
            shelfLifeDays: Number.isFinite(shelf) && shelf > 0 ? Math.round(shelf) : 7,
            unit: ["g", "kg", "mL", "L", "pcs"].includes(String(it.unit))
              ? String(it.unit)
              : "pcs",
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
