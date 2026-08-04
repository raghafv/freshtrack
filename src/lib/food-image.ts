import milk from "@/assets/food/milk.jpg";
import eggs from "@/assets/food/eggs.jpg";
import yogurt from "@/assets/food/yogurt.jpg";
import cheese from "@/assets/food/cheese.jpg";
import paneer from "@/assets/food/paneer.jpg";
import tomato from "@/assets/food/tomato.jpg";
import onion from "@/assets/food/onion.jpg";
import potato from "@/assets/food/potato.jpg";
import spinach from "@/assets/food/spinach.jpg";
import banana from "@/assets/food/banana.jpg";
import fruits from "@/assets/food/fruits.jpg";
import vegetables from "@/assets/food/vegetables.jpg";
import grains from "@/assets/food/grains.jpg";
import bakery from "@/assets/food/bakery.jpg";
import meat from "@/assets/food/meat.jpg";
import fish from "@/assets/food/fish.jpg";
import frozen from "@/assets/food/frozen.jpg";
import beverages from "@/assets/food/beverages.jpg";
import snacks from "@/assets/food/snacks.jpg";
import condiments from "@/assets/food/condiments.jpg";
import spices from "@/assets/food/spices.jpg";
import other from "@/assets/food/other.jpg";

/**
 * Curated realistic food photography used across FreshTrack.
 * Presentation-only: nothing here touches data or business logic.
 */

/**
 * Keyword → photo. First match on the item name wins.
 * Only exact, unambiguous matches live here: a generic "fruits" photo of apples
 * shown for dates or mangoes is worse than no photo, so everything else falls
 * back to an emoji (see <FoodThumb />).
 */
const NAME_MATCHES: Array<[string[], string]> = [
  [["milk", "doodh"], milk],
  [["egg", "anda"], eggs],
  [["yogurt", "yoghurt", "curd", "dahi"], yogurt],
  [["cheese", "mozzarella"], cheese],
  [["paneer"], paneer],
  [["tomato", "tamatar"], tomato],
  [["onion", "pyaz"], onion],
  [["potato", "aloo"], potato],
  [["spinach", "palak"], spinach],
  [["banana", "kela"], banana],
  [["apple"], fruits],
  [["bread"], bakery],
  [["chicken"], meat],
  [["fish"], fish],
];


const CATEGORY_IMAGES: Record<string, string> = {
  Dairy: milk,
  Fruits: fruits,
  Vegetables: vegetables,
  Produce: vegetables,
  "Meat & Seafood": meat,
  Bakery: bakery,
  Frozen: frozen,
  Beverages: beverages,
  "Grains & Pasta": grains,
  Snacks: snacks,
  Condiments: condiments,
  Spices: spices,
  Other: other,
};

/**
 * Photo for an item, but ONLY when we are confident it matches:
 * a real scanned product image, or a specific keyword match on the name.
 * Returns null when we'd otherwise show a misleading generic category photo —
 * callers should render an emoji instead (see <FoodThumb />).
 */
export function foodPhoto(
  name?: string | null,
  _category?: string | null,
  imageUrl?: string | null,
): string | null {
  if (imageUrl) return imageUrl;
  const n = (name ?? "").toLowerCase();
  if (!n) return null;
  for (const [keys, src] of NAME_MATCHES) {
    if (keys.some((k) => n.includes(k))) return src;
  }
  return null;
}

/**
 * Resolve the best thumbnail for a pantry/shopping/recipe item.
 * A real product photo from a scanned barcode always wins.
 */
export function foodImage(
  name?: string | null,
  category?: string | null,
  imageUrl?: string | null,
): string {
  return foodPhoto(name, category, imageUrl) ?? CATEGORY_IMAGES[category ?? ""] ?? other;
}

export const FALLBACK_FOOD_IMAGE = other;

