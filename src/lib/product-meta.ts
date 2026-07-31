/**
 * Pure, dependency-free product metadata heuristics.
 * Kept separate from product-db.ts so server code can use it without
 * pulling in the browser Supabase client.
 */

/** Default shelf life (days) per grocery category, used when nothing better is known. */
const CATEGORY_SHELF_DAYS: Record<string, number> = {
  milk: 5,
  dairy: 7,
  curd: 5,
  yogurt: 7,
  cheese: 21,
  butter: 60,
  paneer: 4,
  eggs: 21,
  bread: 4,
  bakery: 5,
  rice: 365,
  pasta: 365,
  noodles: 240,
  grains: 365,
  flour: 180,
  pulses: 365,
  sugar: 730,
  salt: 1095,
  spices: 540,
  masala: 540,
  oil: 365,
  ghee: 270,
  ketchup: 240,
  sauces: 180,
  jam: 240,
  pickle: 365,
  honey: 730,
  snacks: 120,
  biscuits: 180,
  chocolate: 240,
  confectionery: 180,
  beverages: 180,
  juice: 90,
  tea: 540,
  coffee: 365,
  frozen: 180,
  "frozen foods": 180,
  "ready to eat": 240,
  canned: 540,
  meat: 3,
  seafood: 2,
  fruits: 7,
  vegetables: 7,
  produce: 7,
  other: 30,
};

/** Best-guess shelf life from a category / product name. */
export function shelfDaysForCategory(category?: string | null, name?: string | null): number {
  const haystack = `${category ?? ""} ${name ?? ""}`.toLowerCase();
  for (const [key, days] of Object.entries(CATEGORY_SHELF_DAYS)) {
    if (haystack.includes(key)) return days;
  }
  return 30;
}

/** Storage guess matching the shelf-life estimate. */
export function storageForCategory(category?: string | null, name?: string | null): string {
  const haystack = `${category ?? ""} ${name ?? ""}`.toLowerCase();
  if (/frozen|ice cream|peas frozen/.test(haystack)) return "Freezer";
  if (
    /milk|curd|yogurt|paneer|cheese|butter|egg|meat|fish|seafood|juice|fruit|vegetable/.test(
      haystack,
    )
  )
    return "Fridge";
  return "Pantry";
}

const CATEGORY_KEYWORDS: [RegExp, string][] = [
  [/milk|curd|yogurt|dahi|paneer|cheese|butter|ghee|cream/, "Dairy"],
  [/bread|bun|rusk|cake|pav|bakery/, "Bakery"],
  [/rice|atta|flour|dal|pulses|maida|suji|poha|grain/, "Staples"],
  [/oil|masala|spice|salt|sugar|sauce|ketchup|vinegar|jam|pickle|honey/, "Condiments"],
  [/biscuit|chips|namkeen|snack|chocolate|candy|cookie/, "Snacks"],
  [/juice|soda|cola|tea|coffee|water|drink|beverage/, "Beverages"],
  [/noodle|pasta|maggi|ready|instant|soup/, "Ready to eat"],
  [/frozen|ice cream/, "Frozen"],
  [/soap|shampoo|detergent|cleaner|tissue|brush/, "Household"],
  [/egg|chicken|mutton|fish|prawn|meat/, "Meat & Eggs"],
  [/fruit|vegetable|onion|potato|tomato|apple|banana/, "Produce"],
];

/** Guesses a friendly category from the product name. */
export function categoryForName(name: string): string {
  const n = name.toLowerCase();
  for (const [re, cat] of CATEGORY_KEYWORDS) if (re.test(n)) return cat;
  return "Other";
}

/** Guesses the brand as the first word(s) of a typical Indian label name. */
export function brandForName(name: string): string | null {
  const first = name.trim().split(/\s+/)[0];
  if (!first || first.length < 3) return null;
  return first.charAt(0).toUpperCase() + first.slice(1);
}
