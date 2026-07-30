import { daysUntil, getStatus, type PantryItem } from "@/lib/freshtrack";
import { findProduct } from "@/lib/grocery-catalog";

/**
 * Natural-language-ish pantry search: understands categories, storage,
 * expiry status, synonyms, partial names and phrases like
 * "dairy expiring this week in the fridge".
 */

const SYNONYMS: Record<string, string[]> = {
  milk: ["doodh", "toned", "dairy drink"],
  curd: ["dahi", "yogurt", "yoghurt"],
  paneer: ["cottage cheese"],
  brinjal: ["eggplant", "aubergine", "baingan"],
  capsicum: ["bell pepper", "shimla mirch"],
  coriander: ["cilantro", "dhania"],
  chickpeas: ["chana", "chole"],
  lentils: ["dal", "daal", "pulses"],
  flour: ["atta", "maida"],
  ladyfinger: ["okra", "bhindi"],
  cauliflower: ["gobi"],
  potato: ["aloo"],
  onion: ["pyaz"],
  tomato: ["tamatar"],
  rice: ["chawal", "basmati"],
  oil: ["tel", "refined"],
  chicken: ["murgh", "poultry"],
  fish: ["machli", "seafood"],
  bread: ["loaf", "pav"],
  sugar: ["cheeni"],
  butter: ["makhan"],
  ghee: ["clarified butter"],
  lemon: ["nimbu", "lime"],
  banana: ["kela"],
  apple: ["seb"],
  mango: ["aam"],
};

const CATEGORY_WORDS: Record<string, string> = {
  dairy: "Dairy",
  milk_products: "Dairy",
  fruit: "Fruits",
  fruits: "Fruits",
  veg: "Vegetables",
  vegetable: "Vegetables",
  vegetables: "Vegetables",
  veggies: "Vegetables",
  produce: "Produce",
  meat: "Meat & Seafood",
  seafood: "Meat & Seafood",
  fish: "Meat & Seafood",
  bakery: "Bakery",
  bread: "Bakery",
  frozen: "Frozen",
  drinks: "Beverages",
  beverage: "Beverages",
  beverages: "Beverages",
  grains: "Grains & Pasta",
  pasta: "Grains & Pasta",
  snacks: "Snacks",
  snack: "Snacks",
  condiments: "Condiments",
  sauces: "Condiments",
  spices: "Spices",
  masala: "Spices",
};

const STORAGE_WORDS: Record<string, string> = {
  fridge: "Fridge",
  refrigerator: "Fridge",
  chiller: "Fridge",
  freezer: "Freezer",
  frozen_storage: "Freezer",
  pantry: "Pantry",
  cupboard: "Pantry",
  shelf: "Pantry",
};

const STOP_WORDS = new Set([
  "what",
  "whats",
  "show",
  "me",
  "my",
  "the",
  "in",
  "is",
  "are",
  "of",
  "on",
  "all",
  "any",
  "do",
  "i",
  "have",
  "items",
  "item",
  "list",
  "find",
  "search",
  "and",
  "with",
  "that",
  "which",
  "please",
  "food",
  "stuff",
  "stock",
]);

export interface ParsedQuery {
  terms: string[];
  category: string | null;
  storage: string | null;
  status: "fresh" | "soon" | "expired" | null;
  /** Explicit day window, e.g. "this week" => 7. */
  withinDays: number | null;
  lowStock: boolean;
}

export function parsePantryQuery(raw: string): ParsedQuery {
  const q = ` ${raw.toLowerCase().trim()} `;
  let category: string | null = null;
  let storage: string | null = null;
  let status: ParsedQuery["status"] = null;
  let withinDays: number | null = null;
  let lowStock = false;

  const consumed: string[] = [];

  for (const [word, value] of Object.entries(CATEGORY_WORDS)) {
    if (q.includes(` ${word} `)) {
      category = value;
      consumed.push(word);
    }
  }
  for (const [word, value] of Object.entries(STORAGE_WORDS)) {
    if (q.includes(` ${word} `)) {
      storage = value;
      consumed.push(word);
    }
  }

  if (/expired|gone bad|spoiled|wasted/.test(q)) status = "expired";
  else if (/expiring|expire|use soon|about to|going bad|nearly/.test(q)) status = "soon";
  else if (/fresh|good|safe/.test(q)) status = "fresh";

  if (/this week|next 7|7 days|week/.test(q)) withinDays = 7;
  else if (/today|tonight/.test(q)) withinDays = 0;
  else if (/tomorrow/.test(q)) withinDays = 1;
  else if (/this month|30 days|month/.test(q)) withinDays = 30;
  else {
    const m = q.match(/(\d{1,3})\s*(day|days)/);
    if (m) withinDays = Number(m[1]);
  }

  if (/low stock|running low|almost out|finish/.test(q)) lowStock = true;

  const terms = q
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 1 &&
        !STOP_WORDS.has(w) &&
        !consumed.includes(w) &&
        !/^(expired|expiring|expire|soon|fresh|week|days|day|today|tomorrow|month|low|stock|running|out)$/.test(
          w,
        ),
    );

  return { terms, category, storage, status, withinDays, lowStock };
}

function expandTerm(term: string): string[] {
  const out = new Set<string>([term]);
  for (const [key, list] of Object.entries(SYNONYMS)) {
    if (key.startsWith(term) || term.startsWith(key)) {
      out.add(key);
      list.forEach((s) => out.add(s));
    }
    if (list.some((s) => s.includes(term))) {
      out.add(key);
      list.forEach((s) => out.add(s));
    }
  }
  const product = findProduct(term);
  if (product) {
    out.add(product.name.toLowerCase());
    product.aliases.forEach((a) => out.add(a.toLowerCase()));
  }
  return [...out];
}

const LOW_STOCK: Record<string, number> = { pcs: 2, L: 0.5, mL: 300, kg: 0.3, g: 200 };

function matchesTerm(item: PantryItem, term: string): boolean {
  const haystack = `${item.name} ${item.brand ?? ""} ${item.category} ${item.storage}`.toLowerCase();
  return expandTerm(term).some((t) => haystack.includes(t));
}

/** Filters pantry items using a free-form query. Returns items in relevance order. */
export function smartFilter(
  items: PantryItem[],
  query: string,
  soonDays = 3,
): { items: PantryItem[]; parsed: ParsedQuery; interpreted: string | null } {
  const parsed = parsePantryQuery(query);
  const hasFilter =
    parsed.terms.length > 0 ||
    parsed.category ||
    parsed.storage ||
    parsed.status ||
    parsed.withinDays !== null ||
    parsed.lowStock;

  if (!query.trim() || !hasFilter) return { items, parsed, interpreted: null };

  const scored: { item: PantryItem; score: number }[] = [];

  for (const item of items) {
    if (parsed.category && item.category !== parsed.category) continue;
    if (parsed.storage && item.storage !== parsed.storage) continue;
    if (parsed.status && getStatus(item, soonDays) !== parsed.status) continue;
    if (parsed.withinDays !== null) {
      const d = daysUntil(item.expiry_date);
      if (d < 0 || d > parsed.withinDays) continue;
    }
    if (parsed.lowStock && Number(item.quantity) > (LOW_STOCK[item.unit] ?? 1)) continue;

    let score = 0;
    if (parsed.terms.length > 0) {
      const name = item.name.toLowerCase();
      let matched = 0;
      for (const term of parsed.terms) {
        if (name.startsWith(term)) {
          matched++;
          score += 3;
        } else if (matchesTerm(item, term)) {
          matched++;
          score += 1;
        }
      }
      if (matched === 0) continue;
    }
    scored.push({ item, score });
  }

  const describe: string[] = [];
  if (parsed.terms.length) describe.push(`"${parsed.terms.join(" ")}"`);
  if (parsed.category) describe.push(parsed.category.toLowerCase());
  if (parsed.storage) describe.push(`in the ${parsed.storage.toLowerCase()}`);
  if (parsed.status) describe.push(parsed.status === "soon" ? "expiring soon" : parsed.status);
  if (parsed.withinDays !== null) describe.push(`within ${parsed.withinDays} day(s)`);
  if (parsed.lowStock) describe.push("low stock");

  return {
    items: scored
      .sort((a, b) => b.score - a.score || a.item.expiry_date.localeCompare(b.item.expiry_date))
      .map((s) => s.item),
    parsed,
    interpreted: describe.length ? describe.join(" · ") : null,
  };
}
