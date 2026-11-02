import type { PantryRecipe } from "@/lib/ai-types";

/**
 * Hand-off slot for the home screen's "Tonight's recommendation" so the
 * Recipes page can show the exact same recipe in full detail.
 */
const KEY = "freshtrack.tonight.recipe";

export function setTonightRecipe(recipe: PantryRecipe) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(recipe));
  } catch {
    /* ignore */
  }
}

export function takeTonightRecipe(): PantryRecipe | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(raw) as PantryRecipe;
  } catch {
    return null;
  }
}
