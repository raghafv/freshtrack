import { supabase } from "@/integrations/supabase/client";

/**
 * FreshTrack's global, self-learning barcode database.
 *
 * Lookup order: Supabase `products` → Open Food Facts (auto-saved back into
 * Supabase) → unknown, which the UI turns into a "teach me this product" flow.
 */

export interface ProductRecord {
  barcode: string;
  name: string;
  brand: string | null;
  category: string;
  size: string | null;
  image_url: string | null;
  shelf_life_days: number;
  storage: string;
  source: string;
}

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
  if (/milk|curd|yogurt|paneer|cheese|butter|egg|meat|fish|seafood|juice|fruit|vegetable/.test(haystack))
    return "Fridge";
  return "Pantry";
}

function normaliseBarcode(code: string): string {
  return code.replace(/\D/g, "");
}

/** Step 1 — internal database. */
export async function findProductByBarcode(code: string): Promise<ProductRecord | null> {
  const barcode = normaliseBarcode(code);
  if (!barcode) return null;
  const { data, error } = await supabase
    .from("products")
    .select("barcode,name,brand,category,size,image_url,shelf_life_days,storage,source")
    .eq("barcode", barcode)
    .maybeSingle();
  if (error) return null;
  return (data as ProductRecord | null) ?? null;
}

/** Step 2 — Open Food Facts, saved back into Supabase when found. */
export async function fetchFromOpenFoodFacts(code: string): Promise<ProductRecord | null> {
  const barcode = normaliseBarcode(code);
  if (!barcode) return null;
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,brands,image_url,quantity,categories`,
    );
    const json = (await res.json()) as {
      status?: number;
      product?: {
        product_name?: string;
        brands?: string;
        image_url?: string;
        quantity?: string;
        categories?: string;
      };
    };
    const p = json.product;
    if (json.status !== 1 || !p?.product_name?.trim()) return null;

    const category = p.categories?.split(",")[0]?.trim() || "Other";
    return {
      barcode,
      name: p.product_name.trim(),
      brand: p.brands?.split(",")[0]?.trim() || null,
      category,
      size: p.quantity?.trim() || null,
      image_url: p.image_url || null,
      shelf_life_days: shelfDaysForCategory(category, p.product_name),
      storage: storageForCategory(category, p.product_name),
      source: "Open Food Facts",
    };
  } catch {
    return null;
  }
}

/**
 * Writes a product into the global database without ever downgrading data:
 * new barcodes are inserted, known ones only get their missing fields filled.
 */
export async function saveProduct(product: ProductRecord, userId?: string): Promise<void> {
  const barcode = normaliseBarcode(product.barcode);
  if (!barcode) return;
  const existing = await findProductByBarcode(barcode);

  if (!existing) {
    await supabase.from("products").insert({ ...product, barcode, created_by: userId ?? null });
    return;
  }

  const patch: Partial<ProductRecord> = {};
  if (!existing.brand && product.brand) patch.brand = product.brand;
  if (!existing.size && product.size) patch.size = product.size;
  if (!existing.image_url && product.image_url) patch.image_url = product.image_url;
  if ((!existing.category || existing.category === "Other") && product.category !== "Other")
    patch.category = product.category;
  if (Object.keys(patch).length === 0) return;
  await supabase.from("products").update(patch).eq("barcode", barcode);
}

export interface BarcodeLookup {
  product: ProductRecord | null;
  /** Where the answer came from — "db" means no external call was needed. */
  origin: "db" | "openfoodfacts" | "unknown";
}

/** Full lookup chain: Supabase first, Open Food Facts only when necessary. */
export async function lookupBarcode(code: string, userId?: string): Promise<BarcodeLookup> {
  const local = await findProductByBarcode(code);
  if (local) return { product: local, origin: "db" };

  const remote = await fetchFromOpenFoodFacts(code);
  if (remote) {
    // Grow the global database so the next scan skips Open Food Facts.
    void saveProduct(remote, userId).catch(() => undefined);
    return { product: remote, origin: "openfoodfacts" };
  }
  return { product: null, origin: "unknown" };
}
