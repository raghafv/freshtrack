import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateAIResponse, getProviderLogs } from "./ai-service.server";
import {
  dishRecipeRequest,
  historyMessages,
  ideasRequest,
  loadPantryContext,
  normalizeIdeas,
  normalizeNameList,
  normalizeRecipes,
  normalizePantryAdds,
  normalizeShoppingAdds,
  normalizeSuggestions,
  pantrySystemPrompt,
  dataSystemPrompt,
  recipeRequest,
  shoppingRequest,
  type DishIdea,
  type SupabaseLike,
} from "./ai-pantry.server";

export type { DishIdea };


export type {
  AssistantReply,
  PantryRecipe,
  ShoppingSuggestion,
  AiProviderLog,
} from "./ai-types";

import type { AssistantReply, PantryRecipe, ShoppingSuggestion, AiProviderLog } from "./ai-types";
import { splitIngredients } from "./food-guard";

/** Records one AI call for the owner-only usage dashboard. Never throws. */
async function logUsage(feature: string, userId: string | null, chars: number) {
  try {
    const last = getProviderLogs()[0];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("ai_usage_log").insert({
      user_id: userId,
      feature,
      provider: last?.provider ?? null,
      model: null,
      ok: last?.ok ?? true,
      ms: last?.ms ?? null,
      chars,
      error: last?.error ?? null,
    });
  } catch (error) {
    console.error("[ai] usage log failed", error);
  }
}

const AskInput = z.object({ question: z.string().min(1).max(1000) });

/**
 * Hard, non-negotiable scope gate. These requests are refused before any model
 * is called, so no amount of prompt-wrangling can talk the assistant into
 * writing a poem, a song or code.
 */
const BANNED_PATTERNS: RegExp[] = [
  /\b(poem|poetry|haiku|sonnet|limerick|rap|lyrics?|song|shayari)\b/i,
  /\b(joke|riddle|pun|meme)\b/i,
  /\b(story|short story|novel|essay|speech|letter|email|caption|slogan|tagline)\b/i,
  /\b(code|program|script|function|python|javascript|sql|html|css|regex|api)\b/i,
  /\b(translate|translation)\b/i,
  /\b(politic|election|religion|horoscope|astrolog|cricket score|stock|crypto|homework|exam)\b/i,
  /\b(roleplay|pretend to be|act as|ignore (all |your )?(previous |above )?instructions|system prompt|jailbreak|dan mode)\b/i,
];

function isBanned(question: string) {
  return BANNED_PATTERNS.some((re) => re.test(question));
}

/** How many off-topic questions in a row before the assistant takes a break. */
const OFFTOPIC_LIMIT = 4;
const COOLDOWN_MINUTES = 15;

/** Natural-language pantry assistant grounded in the user's live pantry. */
export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data, context }): Promise<AssistantReply> => {
    const supabase = context.supabase as unknown as SupabaseLike;

    // ---- abuse throttle ----------------------------------------------------
    const { data: settingsRow } = await supabase
      .from("user_settings")
      .select("assistant_offtopic_count, assistant_blocked_until")
      .maybeSingle();
    const blockedUntil = (settingsRow as { assistant_blocked_until?: string | null } | null)
      ?.assistant_blocked_until;
    if (blockedUntil && new Date(blockedUntil).getTime() > Date.now()) {
      const mins = Math.max(
        1,
        Math.ceil((new Date(blockedUntil).getTime() - Date.now()) / 60_000),
      );
      return {
        reply: `I'm a pantry and cooking assistant, and the last few questions were outside that. Let's take a short break — ask me about your food, recipes or shopping list again in about ${mins} minute${mins === 1 ? "" : "s"}.`,
        added: [],
        removed: [],
        checked: [],
        cleared: false,
        pantryAdded: [],
      };
    }
    const offtopicCount =
      (settingsRow as { assistant_offtopic_count?: number } | null)?.assistant_offtopic_count ?? 0;

    // Hard scope gate — refuse outright, count it as off-topic, no model call.
    if (isBanned(data.question)) {
      const nextCount = offtopicCount + 1;
      const blocked = nextCount >= OFFTOPIC_LIMIT;
      await supabase.from("user_settings").upsert(
        {
          user_id: context.userId,
          assistant_offtopic_count: blocked ? 0 : nextCount,
          assistant_blocked_until: blocked
            ? new Date(Date.now() + COOLDOWN_MINUTES * 60_000).toISOString()
            : null,
        },
        { onConflict: "user_id" },
      );
      return {
        reply:
          "I only help with your pantry, food and cooking — I can't write that. Want a recipe from what's expiring soon instead?",
        added: [],
        removed: [],
        checked: [],
        cleared: false,
        pantryAdded: [],
      };
    }

    const ctx = await loadPantryContext(supabase);

    const { data: history } = await supabase
      .from("assistant_messages")
      .select("role, content")
      .order("created_at", { ascending: false })
      .limit(20);

    const parsed = await generateAIResponse("assistant", [
      { role: "system", content: pantrySystemPrompt(ctx) },
      ...historyMessages((history ?? []) as { role: string; content: string }[]),
      { role: "user", content: data.question },
    ]);

    // Record the off-topic streak (or clear it on a genuine pantry question).
    const offTopic = parsed.offTopic === true;
    const nextCount = offTopic ? offtopicCount + 1 : 0;
    const patch: Record<string, unknown> = {
      user_id: context.userId,
      assistant_offtopic_count: offTopic && nextCount >= OFFTOPIC_LIMIT ? 0 : nextCount,
      assistant_blocked_until:
        offTopic && nextCount >= OFFTOPIC_LIMIT
          ? new Date(Date.now() + COOLDOWN_MINUTES * 60_000).toISOString()
          : null,
    };
    if (offTopic || offtopicCount > 0) {
      const { error: throttleError } = await supabase
        .from("user_settings")
        .upsert(patch, { onConflict: "user_id" });
      if (throttleError) console.error("[assistant] throttle update failed", throttleError);
    }


    let reply = String(parsed.reply ?? "").trim() || "I couldn't work that out — try rephrasing.";

    // Only skip items already on the shopping list — owning something in the
    // pantry must never block an explicit "add this to my list" request.
    const existing = new Set(ctx.shoppingNames.map((n) => n.toLowerCase()));
    const adds = normalizeShoppingAdds(parsed, existing);

    if (adds.length > 0) {
      const { error } = await supabase
        .from("shopping_items")
        .insert(adds.map((a) => ({ ...a, user_id: context.userId })));
      if (error) {
        console.error("[assistant] shopping insert failed", error);
        throw new Error("Could not add those items to your shopping list.");
      }
    }

    // ---- pantry adds -------------------------------------------------------
    const pantryAdds = normalizePantryAdds(parsed);
    const pantryAdded: string[] = [];
    if (pantryAdds.length > 0) {
      const today = new Date();
      const rows = pantryAdds.map((a) => {
        const expiry = new Date(today);
        expiry.setDate(expiry.getDate() + a.shelfLifeDays);
        return {
          user_id: context.userId,
          name: a.name,
          category: a.category,
          quantity: a.quantity,
          unit: a.unit,
          storage: a.storage,
          purchase_date: today.toISOString().slice(0, 10),
          expiry_date: expiry.toISOString().slice(0, 10),
          source: "assistant",
        };
      });
      const { error } = await supabase.from("pantry_items").insert(rows);
      if (error) {
        console.error("[assistant] pantry insert failed", error);
        throw new Error("Could not add those items to your pantry.");
      }
      pantryAdded.push(...pantryAdds.map((a) => a.name));
    }

    // ---- list actions (remove / clear / check off) -------------------------
    const question = data.question.toLowerCase();
    const wantsClear =
      /\b(clear|empty|delete|remove|wipe)\b/.test(question) &&
      /\b(everything|all|entire|whole)\b/.test(question) &&
      /(shopping|grocery|list)/.test(question);

    let cleared = parsed.clearShopping === true || wantsClear;
    let removed: string[] = [];
    const checked: string[] = [];

    if (cleared) {
      const { error } = await supabase
        .from("shopping_items")
        .delete()
        .eq("user_id", context.userId);
      if (error) {
        console.error("[assistant] shopping clear failed", error);
        cleared = false;
      } else {
        removed = ctx.shoppingNames;
      }
    } else {
      const requested = normalizeNameList(parsed.shoppingRemoves);
      const match = (wanted: string) =>
        ctx.shoppingNames.filter(
          (n) =>
            n.toLowerCase() === wanted.toLowerCase() ||
            n.toLowerCase().includes(wanted.toLowerCase()) ||
            wanted.toLowerCase().includes(n.toLowerCase()),
        );
      const targets = [...new Set(requested.flatMap(match))];
      if (targets.length > 0) {
        const { error } = await supabase
          .from("shopping_items")
          .delete()
          .eq("user_id", context.userId)
          .in("name", targets);
        if (error) console.error("[assistant] shopping remove failed", error);
        else removed = targets;
      }

      const toCheck = [...new Set(normalizeNameList(parsed.shoppingChecked).flatMap(match))];
      if (toCheck.length > 0) {
        const { error } = await supabase
          .from("shopping_items")
          .update({ checked: true })
          .eq("user_id", context.userId)
          .in("name", toCheck);
        if (error) console.error("[assistant] shopping check failed", error);
        else checked.push(...toCheck);
      }
    }

    if (cleared && !/clear|empt|remov|delete/i.test(reply)) {
      reply = `Cleared your shopping list — ${removed.length} item${removed.length === 1 ? "" : "s"} removed.\n\n${reply}`;
    }

    const { error: saveError } = await supabase.from("assistant_messages").insert([
      { user_id: context.userId, role: "user", content: data.question },
      { user_id: context.userId, role: "assistant", content: reply },
    ]);
    if (saveError) console.error("[assistant] message save failed", saveError);

    await logUsage("assistant", context.userId, data.question.length + reply.length);

    return { reply, added: adds.map((a) => a.name), removed, checked, cleared, pantryAdded };
  });


const RecipeInput = z.object({
  mode: z.enum(["surprise", "selected"]).default("surprise"),
  ingredients: z.array(z.string().min(1).max(80)).max(20).default([]),
  dish: z.string().min(1).max(120).optional(),
});

/**
 * Recipe ideas built strictly from the pantry. "surprise" lets the AI pick;
 * "selected" restricts the dishes to the ingredients the user chose. Results are
 * saved so they stay on the home screen after the app is closed.
 */
export const suggestRecipes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RecipeInput.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<{ recipes: PantryRecipe[] }> => {
    const supabase = context.supabase as unknown as SupabaseLike;
    const ctx = await loadPantryContext(supabase);
    const split = splitIngredients(data.mode === "selected" ? data.ingredients : []);
    if (split.rejected.length > 0) {
      throw new Error(`I do not recognize this product as food: ${split.rejected.join(", ")}`);
    }
    const chosen = split.usable;
    if (data.mode === "selected" && chosen.length < 3) {
      throw new Error("Please pick at least 3 recognized food ingredients.");
    }
    if (ctx.items.length === 0 && chosen.length === 0 && !data.dish) return { recipes: [] };

    const focus = data.dish
      ? dishRecipeRequest(data.dish)
      : chosen.length > 0
        ? `\nThe user chose these ingredients: ${chosen.join(", ")}. Build the dish STRICTLY around them — use ONLY these ingredients plus salt, water, oil and common spices, and do NOT pull in any other pantry item. Return EXACTLY ONE recipe (the "recipes" array must contain a single object) and make it insanely detailed: a rich description, exact measurements for every ingredient, 8-14 numbered steps with heat levels, timings and visual cues, plating notes, tips, storage advice and nutrition. If something essential is genuinely missing, keep the dish and list it as a substitution rather than adding unrelated pantry items.`
        : "\nSurprise the user with 4-5 varied dishes.";

    const parsed = await generateAIResponse("recipes", [
      { role: "system", content: dataSystemPrompt(ctx) },
      { role: "user", content: recipeRequest + focus },
    ]);

    const single = Boolean(data.dish) || chosen.length > 0;
    const recipes = normalizeRecipes(parsed).slice(0, single ? 1 : 5);
    await logUsage("recipes", context.userId, JSON.stringify(recipes).length);

    // Recipes are not auto-saved — the user explicitly saves the ones they like.

    return { recipes };
  });

/**
 * "Surprise me" — a deliberately cheap call that returns only dish names and a
 * one-liner. The full recipe is generated later, once the user picks one.
 */
export const suggestDishIdeas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ideas: DishIdea[] }> => {
    const supabase = context.supabase as unknown as SupabaseLike;
    const ctx = await loadPantryContext(supabase);
    if (ctx.items.length === 0) return { ideas: [] };

    const parsed = await generateAIResponse("recipes", [
      { role: "system", content: dataSystemPrompt(ctx) },
      { role: "user", content: ideasRequest },
    ]);

    const ideas = normalizeIdeas(parsed);
    await logUsage("recipe-ideas", context.userId, JSON.stringify(ideas).length);
    return { ideas };
  });

/** Calendar date in India Standard Time — the daily recipe rolls over at 00:00 IST. */
function istDate(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * Tonight's recommendation. Generated once per IST day and stored, so it is the
 * same dish on every device and after the app is closed — until midnight India
 * time, when a new one is produced.
 */
export const getDailyRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ recipe: PantryRecipe | null }> => {
    const supabase = context.supabase as unknown as SupabaseLike;
    const day = istDate();

    const existing = await supabase
      .from("daily_recipes")
      .select("recipe")
      .eq("recipe_date", day)
      .maybeSingle();
    const stored = (existing as { data?: { recipe?: unknown } | null }).data?.recipe;
    if (stored) return { recipe: stored as PantryRecipe };

    const ctx = await loadPantryContext(supabase);
    if (ctx.items.length === 0) return { recipe: null };

    const parsed = await generateAIResponse("recipes", [
      { role: "system", content: dataSystemPrompt(ctx) },
      {
        role: "user",
        content:
          recipeRequest +
          "\nReturn EXACTLY ONE outstanding dinner recipe for tonight, prioritising the ingredients closest to expiry. Make it richly detailed with exact measurements and numbered steps.",
      },
    ]);

    const recipe = normalizeRecipes(parsed)[0] ?? null;
    await logUsage("recipes", context.userId, JSON.stringify(recipe ?? {}).length);
    if (!recipe) return { recipe: null };

    await supabase
      .from("daily_recipes")
      .upsert(
        { user_id: context.userId, recipe_date: day, recipe: recipe as unknown as never },
        { onConflict: "user_id,recipe_date" },
      );

    return { recipe };
  });




/** Auto-generate a shopping list from pantry gaps, without duplicating what you own. */
export const suggestShoppingList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ suggestions: ShoppingSuggestion[] }> => {
    const supabase = context.supabase as unknown as SupabaseLike;
    const ctx = await loadPantryContext(supabase);

    const parsed = await generateAIResponse("shopping", [
      { role: "system", content: dataSystemPrompt(ctx) },
      { role: "user", content: shoppingRequest },
    ]);

    const existing = new Set(
      [...ctx.shoppingNames, ...ctx.items.filter((i) => i.days_left >= 0).map((i) => i.name)].map(
        (n) => n.toLowerCase(),
      ),
    );
    const suggestions = normalizeSuggestions(parsed, existing);
    await logUsage("shopping", context.userId, JSON.stringify(suggestions).length);
    return { suggestions };
  });

/** Admin-only: recent AI provider activity (which provider answered, timing, fallbacks). */
export const getAiDebugLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ logs: AiProviderLog[] }> => {
    const { data: roleRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Forbidden");
    return { logs: getProviderLogs() };
  });
