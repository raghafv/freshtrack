import data from "@/data/curated-recipes.json";

export interface CuratedRecipe {
  title: string;
  cuisine: string;
  difficulty: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  minutes: number;
  description: string;
  ingredients: { name: string; amount: string }[];
  steps: string[];
  tips?: string[];
}

export const CURATED_RECIPES = data as CuratedRecipe[];

/** Basics most kitchens always have; not counted as "missing". */
const STAPLES = /^(water|salt|sugar|oil|cooking oil|ice)$/;

const ALIASES: Record<string, string> = {
  capsicum: "bell pepper", "shimla mirch": "bell pepper", aloo: "potato", potatoes: "potato",
  pyaz: "onion", onions: "onion", tamatar: "tomato", tomatoes: "tomato", jeera: "cumin",
  "cumin seeds": "cumin", gobi: "cauliflower", matar: "peas", "green peas": "peas",
  palak: "spinach", bhindi: "okra", "lady finger": "okra", baingan: "eggplant", brinjal: "eggplant",
  dahi: "curd", yogurt: "curd", yoghurt: "curd", atta: "wheat flour", "whole wheat flour": "wheat flour",
  besan: "gram flour", chillies: "chilli", chilies: "chilli", "green chillies": "green chilli",
  lauki: "bottle gourd", methi: "fenugreek", haldi: "turmeric", dhania: "coriander",
  lemons: "lemon", nimbu: "lemon", chawal: "rice", "basmati rice": "rice", sooji: "semolina", rava: "semolina",
};

export function normalize(name: string): string {
  let n = name.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
  n = n.replace(/^(fresh|chopped|grated|dried|whole|ripe|small|large|medium)\s+/, "");
  n = n.replace(/\s+(powder|leaves|juice)$/, (m) => (/(turmeric|chilli|coriander)/.test(n) ? m : ""));
  return ALIASES[n] ?? n;
}

function same(a: string, b: string) {
  if (!a || !b) return false;
  if (a === b) return true;
  const wa = a.split(" "), wb = b.split(" ");
  // "paneer" matches "malai paneer"; avoid "butter" matching "peanut butter".
  if (/peanut|chocolate|nut butter/.test(a + " " + b) && a !== b) return false;
  return wb.every((w) => wa.includes(w)) || wa.every((w) => wb.includes(w));
}

export function isStaple(name: string) {
  return STAPLES.test(normalize(name));
}

export function matchRecipe(recipe: CuratedRecipe, pantry: string[]) {
  const keys = pantry.map(normalize);
  const essential = recipe.ingredients.filter((i) => !isStaple(i.name));
  const have: string[] = [], missing: string[] = [];
  for (const ing of essential) {
    const n = normalize(ing.name);
    (keys.some((k) => same(n, k)) ? have : missing).push(ing.name);
  }
  const score = essential.length ? have.length / essential.length : 0;
  return { have, missing, score, percent: Math.round(score * 100) };
}

export function recipeUses(recipe: CuratedRecipe, ingredient: string) {
  const k = normalize(ingredient);
  return recipe.ingredients.some((i) => same(normalize(i.name), k));
}
