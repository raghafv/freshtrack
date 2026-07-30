import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function callAi(messages: ChatMessage[]): Promise<Record<string, unknown>> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI is not configured for this project.");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages,
    }),
  });

  if (res.status === 429) throw new Error("The assistant is busy — try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits to keep chatting.");
  if (!res.ok) {
    const body = await res.text();
    console.error(`[assistant] gateway ${res.status}: ${body}`);
    throw new Error("The assistant could not answer right now. Please try again.");
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = json.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    return match ? (JSON.parse(match[0]) as Record<string, unknown>) : { reply: raw };
  }
}

function daysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${dateStr}T00:00:00`).getTime() - today.getTime()) / 86_400_000);
}

type PantryRow = {
  name: string;
  brand: string | null;
  category: string;
  quantity: number;
  unit: string;
  storage: string;
  expiry_date: string;
  price: number | null;
};

type SupabaseLike = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

async function loadPantryContext(supabase: SupabaseLike) {
  const [pantry, shopping, settings, activity] = await Promise.all([
    supabase.from("pantry_items").select("*").order("expiry_date", { ascending: true }),
    supabase.from("shopping_items").select("*"),
    supabase.from("user_settings").select("*").maybeSingle(),
    supabase
      .from("activity_log")
      .select("action, item_name, created_at")
      .order("created_at", { ascending: false })
      .limit(120),
  ]);

  const items = ((pantry.data ?? []) as PantryRow[]).map((i) => ({
    name: i.name,
    brand: i.brand,
    category: i.category,
    quantity: i.quantity,
    unit: i.unit,
    storage: i.storage,
    expiry_date: i.expiry_date,
    days_left: daysUntil(i.expiry_date),
    price: i.price,
  }));

  const shoppingNames = ((shopping.data ?? []) as { name: string; checked: boolean }[])
    .filter((s) => !s.checked)
    .map((s) => s.name);

  const soonDays =
    (settings.data as { expiry_reminder_days?: number } | null)?.expiry_reminder_days ?? 3;

  const events = (activity.data ?? []) as { action: string; item_name: string | null }[];
  const counts = new Map<string, number>();
  for (const e of events) {
    if (e.action !== "added" || !e.item_name) continue;
    counts.set(e.item_name, (counts.get(e.item_name) ?? 0) + 1);
  }
  const repeatBuys = [...counts.entries()]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, n]) => ({ name, times: n }));

  const value = items.reduce((sum, i) => sum + (i.price ?? 0), 0);
  const atRisk = items
    .filter((i) => i.days_left >= 0 && i.days_left <= soonDays)
    .reduce((sum, i) => sum + (i.price ?? 0), 0);
  const wasted = items.filter((i) => i.days_left < 0).reduce((sum, i) => sum + (i.price ?? 0), 0);

  return { items, shoppingNames, soonDays, repeatBuys, value, atRisk, wasted };
}

function pantrySystemPrompt(ctx: Awaited<ReturnType<typeof loadPantryContext>>) {
  return [
    "You are FreshTrack's pantry assistant for a household in India. Currency is Indian Rupees (₹).",
    `Today is ${new Date().toISOString().slice(0, 10)}. Items with days_left <= ${ctx.soonDays} count as "expiring soon"; negative days_left means already expired.`,
    "You answer questions ONLY from the live pantry data given below. Never invent items that are not in the pantry.",
    "Recipes must use only ingredients present in the pantry (basic salt, water, oil and common spices may be assumed), and should prioritise ingredients with the smallest days_left.",
    "When the user asks to generate or add to a shopping list, suggest items they do NOT already have in the pantry and that are not already on the shopping list — never duplicate a purchase.",
    "Be concise and practical. Use short markdown (bold, bullet lists, small tables) and give real numbers from the data.",
    "You can handle all of these well: what expires this week, what to cook today, what to freeze (name the items whose shelf life the freezer actually extends), what to buy, a shopping list under a ₹ budget (stay under it and show the running total), multi-day meal plans (a table with day, meal, items used), and concrete food-waste reduction advice.",
    "For budget lists, use realistic Indian retail prices and never exceed the stated budget.",
    "For meal plans, spread items so the shortest days_left are eaten first and say which items would otherwise be wasted.",
    "",
    `PANTRY (${ctx.items.length} items): ${JSON.stringify(ctx.items)}`,
    `SHOPPING LIST (unchecked): ${JSON.stringify(ctx.shoppingNames)}`,
    `VALUE: total ₹${ctx.value.toFixed(0)}, at risk in the next ${ctx.soonDays} days ₹${ctx.atRisk.toFixed(0)}, already expired ₹${ctx.wasted.toFixed(0)}.`,
    `REPEAT PURCHASES (name, times bought): ${JSON.stringify(ctx.repeatBuys)}`,
    "",
    'Reply with JSON only: {"reply":"markdown answer","shoppingAdds":[{"name":"","quantity":1,"unit":"pcs","category":""}]}.',
    "shoppingAdds must be an empty array unless the user explicitly asked to add things to the shopping list.",
  ].join("\n");
}

const AskInput = z.object({ question: z.string().min(1).max(1000) });

export interface AssistantReply {
  reply: string;
  added: string[];
}

/** Natural-language pantry assistant grounded in the user's live pantry. */
export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data, context }): Promise<AssistantReply> => {
    const supabase = context.supabase as unknown as SupabaseLike;
    const ctx = await loadPantryContext(supabase);

    const { data: history } = await supabase
      .from("assistant_messages")
      .select("role, content")
      .order("created_at", { ascending: false })
      .limit(20);

    const prior = ((history ?? []) as { role: string; content: string }[])
      .reverse()
      .map(
        (m) =>
          ({ role: m.role === "user" ? "user" : "assistant", content: m.content }) as ChatMessage,
      );

    const parsed = await callAi([
      { role: "system", content: pantrySystemPrompt(ctx) },
      ...prior,
      { role: "user", content: data.question },
    ]);

    const reply = String(parsed.reply ?? "").trim() || "I couldn't work that out — try rephrasing.";

    const existing = new Set(
      [...ctx.shoppingNames, ...ctx.items.map((i) => i.name)].map((n) => n.toLowerCase()),
    );
    const rawAdds = Array.isArray(parsed.shoppingAdds) ? parsed.shoppingAdds : [];
    const adds = rawAdds
      .map((raw) => {
        const it = raw as Record<string, unknown>;
        const name = String(it.name ?? "").trim();
        if (!name || existing.has(name.toLowerCase())) return null;
        existing.add(name.toLowerCase());
        const qty = Number(it.quantity);
        return {
          name,
          quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
          unit: ["g", "kg", "mL", "L", "pcs"].includes(String(it.unit)) ? String(it.unit) : "pcs",
          category: String(it.category ?? "Other"),
        };
      })
      .filter(
        (v): v is { name: string; quantity: number; unit: string; category: string } => v !== null,
      )
      .slice(0, 20);

    if (adds.length > 0) {
      const { error } = await supabase
        .from("shopping_items")
        .insert(adds.map((a) => ({ ...a, user_id: context.userId })));
      if (error) console.error("[assistant] shopping insert failed", error);
    }

    const { error: saveError } = await supabase.from("assistant_messages").insert([
      { user_id: context.userId, role: "user", content: data.question },
      { user_id: context.userId, role: "assistant", content: reply },
    ]);
    if (saveError) console.error("[assistant] message save failed", saveError);

    return { reply, added: adds.map((a) => a.name) };
  });

export interface PantryRecipe {
  title: string;
  minutes: number;
  uses: string[];
  priority: string[];
  steps: string[];
  substitutions: { missing: string; use: string }[];
  savesWaste: string | null;
  note: string | null;
}

/** Recipe ideas built strictly from what is currently in the pantry. */
export const suggestRecipes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ recipes: PantryRecipe[] }> => {
    const supabase = context.supabase as unknown as SupabaseLike;
    const ctx = await loadPantryContext(supabase);
    if (ctx.items.length === 0) return { recipes: [] };

    const parsed = await callAi([
      { role: "system", content: pantrySystemPrompt(ctx) },
      {
        role: "user",
        content: [
          "Suggest 4 realistic home recipes I can cook right now.",
          "Every ingredient must already be in my pantry (salt, water, oil and common spices excepted).",
          "Prioritise the ingredients with the smallest days_left.",
          "If a classic version of the dish needs something I do not have, keep the dish and swap in a pantry item instead — list that as a substitution.",
          'Reply with JSON only: {"recipes":[{"title":"","minutes":20,"uses":[""],"priority":[""],"steps":["",""],"substitutions":[{"missing":"","use":""}],"savesWaste":"short line","note":null}]}.',
          'uses: pantry item names used. priority: the expiring items this recipe rescues. steps: 3-6 short steps. substitutions: [] when nothing is missing. savesWaste: what this rescues, e.g. "uses 250 g spinach expiring in 1 day".',
        ].join("\n"),
      },
    ]);

    const raw = Array.isArray(parsed.recipes) ? parsed.recipes : [];
    const recipes = raw
      .map((entry) => {
        const r = entry as Record<string, unknown>;
        const title = String(r.title ?? "").trim();
        if (!title) return null;
        const minutes = Number(r.minutes);
        return {
          title,
          minutes: Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : 20,
          uses: Array.isArray(r.uses) ? r.uses.map(String).slice(0, 12) : [],
          priority: Array.isArray(r.priority) ? r.priority.map(String).slice(0, 6) : [],
          steps: Array.isArray(r.steps) ? r.steps.map(String).slice(0, 8) : [],
          substitutions: Array.isArray(r.substitutions)
            ? r.substitutions
                .map((sub) => {
                  const o = sub as Record<string, unknown>;
                  const missing = String(o.missing ?? "").trim();
                  const use = String(o.use ?? "").trim();
                  return missing && use ? { missing, use } : null;
                })
                .filter((v): v is { missing: string; use: string } => v !== null)
                .slice(0, 6)
            : [],
          savesWaste: r.savesWaste ? String(r.savesWaste) : null,
          note: r.note ? String(r.note) : null,
        } satisfies PantryRecipe;
      })
      .filter((v): v is PantryRecipe => v !== null)
      .slice(0, 6);

    return { recipes };
  });

export interface ShoppingSuggestion {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  reason: string;
}

/** Auto-generate a shopping list from pantry gaps, without duplicating what you own. */
export const suggestShoppingList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ suggestions: ShoppingSuggestion[] }> => {
    const supabase = context.supabase as unknown as SupabaseLike;
    const ctx = await loadPantryContext(supabase);

    const parsed = await callAi([
      { role: "system", content: pantrySystemPrompt(ctx) },
      {
        role: "user",
        content: [
          "Build my next grocery shopping list.",
          "Include staples that are expired, running out, or missing for everyday Indian cooking.",
          "Never include something already fresh in the pantry or already on the shopping list.",
          'Reply with JSON only: {"suggestions":[{"name":"","quantity":1,"unit":"pcs","category":"","reason":"short reason"}]}, at most 12 items.',
        ].join("\n"),
      },
    ]);

    const existing = new Set(
      [...ctx.shoppingNames, ...ctx.items.filter((i) => i.days_left >= 0).map((i) => i.name)].map(
        (n) => n.toLowerCase(),
      ),
    );
    const raw = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
    const suggestions = raw
      .map((entry) => {
        const s = entry as Record<string, unknown>;
        const name = String(s.name ?? "").trim();
        if (!name || existing.has(name.toLowerCase())) return null;
        existing.add(name.toLowerCase());
        const qty = Number(s.quantity);
        return {
          name,
          quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
          unit: ["g", "kg", "mL", "L", "pcs"].includes(String(s.unit)) ? String(s.unit) : "pcs",
          category: String(s.category ?? "Other"),
          reason: String(s.reason ?? ""),
        } satisfies ShoppingSuggestion;
      })
      .filter((v): v is ShoppingSuggestion => v !== null)
      .slice(0, 12);

    return { suggestions };
  });
