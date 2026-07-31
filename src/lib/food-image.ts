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

/** Keyword → photo. First match on the item name wins. */
const NAME_MATCHES: Array<[string[], string]> = [
  [["milk", "doodh", "cream", "lassi", "buttermilk"], milk],
  [["egg", "anda"], eggs],
  [["yogurt", "yoghurt", "curd", "dahi", "shrikhand"], yogurt],
  [["cheese", "butter", "ghee", "mozzarella", "amul"], cheese],
  [["paneer", "tofu"], paneer],
  [["tomato", "tamatar", "ketchup"], tomato],
  [["onion", "pyaz", "garlic", "shallot"], onion],
  [["potato", "aloo", "yam", "sweet potato"], potato],
  [["spinach", "palak", "lettuce", "kale", "methi", "coriander", "herb", "leaf"], spinach],
  [["banana", "kela"], banana],
  [["apple", "mango", "orange", "grape", "berry", "papaya", "pear", "melon", "fruit"], fruits],
  [["carrot", "broccoli", "pepper", "cabbage", "cauliflower", "cucumber", "peas", "beans", "brinjal", "gourd", "vegetable"], vegetables],
  [["rice", "atta", "flour", "dal", "lentil", "pasta", "noodle", "maggi", "oats", "quinoa", "poha", "suji", "grain", "cereal"], grains],
  [["bread", "bun", "pav", "roti", "cake", "croissant", "biscuit bread", "bakery"], bakery],
  [["chicken", "mutton", "lamb", "beef", "pork", "sausage", "meat", "keema"], meat],
  [["fish", "prawn", "shrimp", "seafood", "salmon", "tuna"], fish],
  [["frozen", "ice cream", "kulfi"], frozen],
  [["juice", "water", "soda", "cola", "tea", "coffee", "drink", "beverage", "shake"], beverages],
  [["chips", "namkeen", "biscuit", "cookie", "chocolate", "snack", "nuts", "almond", "cashew", "wafer"], snacks],
  [["oil", "sauce", "mayo", "jam", "honey", "vinegar", "pickle", "achar", "spread", "chutney"], condiments],
  [["masala", "spice", "turmeric", "haldi", "chilli", "cumin", "jeera", "salt", "pepper powder"], spices],
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
 * Resolve the best thumbnail for a pantry/shopping/recipe item.
 * A real product photo from a scanned barcode always wins.
 */
export function foodImage(
  name?: string | null,
  category?: string | null,
  imageUrl?: string | null,
): string {
  if (imageUrl) return imageUrl;
  const n = (name ?? "").toLowerCase();
  if (n) {
    for (const [keys, src] of NAME_MATCHES) {
      if (keys.some((k) => n.includes(k))) return src;
    }
  }
  return CATEGORY_IMAGES[category ?? ""] ?? other;
}

export const FALLBACK_FOOD_IMAGE = other;
