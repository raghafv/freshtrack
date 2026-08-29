/**
 * Shared "is this actually food?" guard.
 *
 * The AI must never invent a shelf life for a pen, an ID card or a phone, and
 * the recipe maker must never cook with something that isn't an ingredient.
 * Both paths run through the checks below.
 */
import { findProduct, GROCERY_CATALOG } from "@/lib/grocery-catalog";

/** Things that are definitely not edible, no matter how confident a model is. */
const NON_FOOD = [
  "id card", "identity", "aadhaar", "aadhar", "pan card", "licence", "license", "passport",
  "credit card", "debit card", "business card", "ticket", "receipt", "invoice", "document",
  "notebook", "book", "diary", "pen", "pencil", "marker", "ink", "pen ink", "eraser", "stapler", "scissors",
  "battery", "charger", "cable", "phone", "mobile", "laptop", "keyboard", "mouse", "remote",
  "watch", "earphone", "headphone", "wallet", "purse", "key", "coin", "currency", "cash", "currency note",
  "glasses", "spectacle", "shoe", "sock", "shirt", "cloth", "towel", "soap", "shampoo",
  "detergent", "bleach", "phenyl", "cleaner", "sanitizer", "sanitiser", "deodorant", "perfume",
  "lotion", "cream lotion", "cosmetic", "lipstick", "makeup", "toothpaste", "toothbrush", "razor",
  "tissue", "napkin", "diaper", "medicine", "tablet", "capsule", "syrup", "injection",
  "pill", "bandage", "cigarette", "tobacco", "lighter", "matchbox", "candle", "bulb",
  "plastic bag", "carry bag", "wrapper", "packaging", "box", "container", "bottle cap",
  "toy", "plant pot", "fertilizer", "pesticide", "petrol", "diesel", "oil engine",
  "person", "human", "face", "hand", "dog", "cat", "animal",
  "furniture", "chair", "table", "desk", "sofa", "lamp", "light", "fan", "ac", "tv", "television",
  "monitor", "camera", "gadget", "device", "electronic", "appliance", "tool", "car", "bike",
  "wood", "metal", "plastic", "glass", "paper", "magazine", "newspaper", "leaflet",
  "toilet", "bathroom", "sanitary", "pad", "diaper", "dustbin", "bin", "trash", "garbage",
];

/** Basic staples that cannot be the main building block of a real recipe. */
export const STAPLES = new Set([
  "salt", "namak", "sugar", "water", "oil", "ghee", "butter", "black pepper", "pepper",
  "spice", "masala", "turmeric", "haldi", "cumin", "jeera", "coriander powder", "dhaniya powder",
]);

/** Broad edible vocabulary, so home-made and regional dishes still pass. */
const FOOD_WORDS = [
  "milk", "curd", "dahi", "yogurt", "yoghurt", "paneer", "cheese", "butter", "ghee", "cream",
  "egg", "chicken", "mutton", "lamb", "beef", "pork", "fish", "prawn", "shrimp", "crab", "meat",
  "rice", "atta", "flour", "maida", "suji", "rava", "poha", "bread", "bun", "roti", "chapati",
  "paratha", "naan", "pasta", "noodle", "maggi", "oats", "cereal", "corn", "makai",
  "dal", "daal", "lentil", "chana", "rajma", "moong", "masoor", "toor", "urad", "bean", "pea",
  "soy", "tofu", "peanut", "nut", "almond", "cashew", "walnut", "raisin", "kishmish", "date",
  "sugar", "jaggery", "gur", "honey", "salt", "namak", "spice", "masala", "haldi", "turmeric",
  "chilli", "chili", "mirch", "jeera", "cumin", "dhania", "coriander", "pepper", "elaichi",
  "cardamom", "clove", "laung", "cinnamon", "dalchini", "hing", "ajwain", "methi", "saunf",
  "oil", "mustard", "sarson", "sesame", "til", "coconut", "nariyal", "vinegar", "sauce",
  "ketchup", "mayo", "mayonnaise", "jam", "pickle", "achar", "chutney", "papad", "biscuit",
  "cookie", "cake", "chocolate", "candy", "sweet", "mithai", "laddu", "barfi", "halwa", "kheer",
  "ice cream", "chips", "namkeen", "snack", "juice", "water", "soda", "cola", "tea", "chai",
  "coffee", "drink", "beverage", "syrup sugar", "lassi", "buttermilk", "chaas",
  "apple", "banana", "mango", "orange", "grape", "papaya", "guava", "amrud", "pear", "peach",
  "plum", "melon", "watermelon", "pineapple", "pomegranate", "anar", "kiwi", "litchi", "berry",
  "strawberry", "lemon", "nimbu", "lime", "fruit", "chikoo", "sitaphal", "jamun",
  "potato", "aloo", "onion", "pyaz", "tomato", "tamatar", "garlic", "lehsun", "lahsun",
  "ginger", "adrak", "carrot", "gajar", "beet", "radish", "mooli", "cabbage", "patta gobhi",
  "cauliflower", "gobhi", "broccoli", "spinach", "palak", "methi leaves", "lettuce", "cucumber",
  "kheera", "capsicum", "shimla", "brinjal", "baingan", "eggplant", "okra", "bhindi", "lauki",
  "gourd", "karela", "tinda", "parwal", "arbi", "arvi", "taro", "yam", "jimikand", "mushroom",
  "sweet corn", "vegetable", "sabzi", "greens", "herb", "curry", "gravy", "soup", "salad",
  "biryani", "pulao", "idli", "dosa", "upma", "poori", "samosa", "pakora", "tikka", "kebab",
];

const norm = (value: string) => value.toLowerCase().trim();

/**
 * Word-boundary match so short entries ("car", "pad", "key") don't catch
 * foods like carrot, papad or turkey, and so multi-word entries
 * ("id card", "id") behave sensibly.
 */
function containsWholePhrase(haystack: string, phrase: string) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`).test(haystack);
}

/** Obvious non-food object? */
export function isNonFood(name: string) {
  const n = norm(name);
  if (!n) return true;
  return NON_FOOD.some((bad) => containsWholePhrase(n, bad));
}

/** Passes the loose gate used by the camera scanner. */
export function isLikelyFood(name: string) {
  return !isNonFood(name) && isCookingIngredient(name);
}

/**
 * Strict gate used by the recipe maker: the ingredient must be recognisable as
 * a real cooking ingredient, otherwise it is dropped no matter what the user
 * typed or scanned.
 */
export function isCookingIngredient(name: string) {
  const n = norm(name);
  if (!n || n.length < 2 || isNonFood(n)) return false;
  if (findProduct(n)) return true;
  if (FOOD_WORDS.some((word) => n.includes(word))) return true;
  return GROCERY_CATALOG.some((p) => {
    const pn = norm(p.name);
    return n.includes(pn) || pn.includes(n);
  });
}

/** Splits a user's ingredient list into usable ingredients and rejected junk. */
export function splitIngredients(names: string[]) {
  const usable: string[] = [];
  const rejected: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    (isCookingIngredient(name) ? usable : rejected).push(name);
  }
  return { usable, rejected };
}

