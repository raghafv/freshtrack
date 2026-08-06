import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateAIResponse, getProviderLogs } from "./ai-service.server";
import {
  historyMessages,
  loadPantryContext,
  normalizeNameList,
  normalizeRecipes,
  normalizePantryAdds,
  normalizeShoppingAdds,
  normalizeSuggestions,
  pantrySystemPrompt,
  recipeRequest,
  shoppingRequest,
  type SupabaseLike,
} from "./ai-pantry.server";

export type {
  AssistantReply,
  PantryRecipe,
  ShoppingSuggestion,
  AiProviderLog,
} from "./ai-types";

import type { AssistantReply, PantryRecipe, ShoppingSuggestion, AiProviderLog } from "./ai-types";

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

    const parsed = await generateAIResponse("assistant", [
      { role: "system", content: pantrySystemPrompt(ctx) },
      ...historyMessages((history ?? []) as { role: string; content: string }[]),
      { role: "user", content: data.question },
    ]);

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
    const chosen = data.mode === "selected" ? data.ingredients.filter(Boolean) : [];
    if (ctx.items.length === 0 && chosen.length === 0) return { recipes: [] };

    const focus =
      chosen.length > 0
        ? `\nThe user specifically wants to cook with: ${chosen.join(", ")}. Return EXACTLY ONE recipe (the "recipes" array must contain a single object) and make it insanely detailed: a rich description, exact measurements for every ingredient, 8-14 numbered steps with heat levels, timings and visual cues, plating notes, tips, storage advice and nutrition. Centre it on these ingredients, even if some are not currently in the pantry — mark those as missing.`
        : "\nSurprise the user with 4-5 varied dishes.";

    const parsed = await generateAIResponse("recipes", [
      { role: "system", content: pantrySystemPrompt(ctx) },
      { role: "user", content: recipeRequest + focus },
    ]);

    const recipes = normalizeRecipes(parsed).slice(0, chosen.length > 0 ? 1 : 5);
    await logUsage("recipes", context.userId, JSON.stringify(recipes).length);

    // Recipes are not auto-saved — the user explicitly saves the ones they like.

    return { recipes };
  });


/** Auto-generate a shopping list from pantry gaps, without duplicating what you own. */
export const suggestShoppingList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ suggestions: ShoppingSuggestion[] }> => {
    const supabase = context.supabase as unknown as SupabaseLike;
    const ctx = await loadPantryContext(supabase);

    const parsed = await generateAIResponse("shopping", [
      { role: "system", content: pantrySystemPrompt(ctx) },
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
