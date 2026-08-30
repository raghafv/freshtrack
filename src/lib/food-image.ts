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
import apple from "@/assets/food/apple.jpg";
import mango from "@/assets/food/mango.jpg";
import orange from "@/assets/food/orange.jpg";
import grapes from "@/assets/food/grapes.jpg";
import pomegranate from "@/assets/food/pomegranate.jpg";
import carrot from "@/assets/food/carrot.jpg";
import cucumber from "@/assets/food/cucumber.jpg";
import capsicum from "@/assets/food/capsicum.jpg";
import cauliflower from "@/assets/food/cauliflower.jpg";
import cabbage from "@/assets/food/cabbage.jpg";
import garlic from "@/assets/food/garlic.jpg";
import ginger from "@/assets/food/ginger.jpg";
import lemon from "@/assets/food/lemon.jpg";
import rice from "@/assets/food/rice.jpg";
import atta from "@/assets/food/atta.jpg";
import dal from "@/assets/food/dal.jpg";
import butter from "@/assets/food/butter.jpg";
import sugar from "@/assets/food/sugar.jpg";
import tea from "@/assets/food/tea.jpg";
import coffee from "@/assets/food/coffee.jpg";
import honey from "@/assets/food/honey.jpg";
import oil from "@/assets/food/oil.jpg";
import chickpeas from "@/assets/food/chickpeas.jpg";
import rajma from "@/assets/food/rajma.jpg";
import brinjal from "@/assets/food/brinjal.jpg";
import okra from "@/assets/food/okra.jpg";
import peas from "@/assets/food/peas.jpg";
import coriander from "@/assets/food/coriander.jpg";
import chilli from "@/assets/food/chilli.jpg";
import dates from "@/assets/food/dates.jpg";
import papaya from "@/assets/food/papaya.jpg";
import strawberry from "@/assets/food/strawberry.jpg";
import guava from "@/assets/food/guava.jpg";
import pineapple from "@/assets/food/pineapple.jpg";
import watermelon from "@/assets/food/watermelon.jpg";
import biscuits from "@/assets/food/biscuits.jpg";
import pasta from "@/assets/food/pasta.jpg";
import masala from "@/assets/food/masala.jpg";
import nuts from "@/assets/food/nuts.jpg";
import arbi from "@/assets/food/arbi.jpg";
import juice from "@/assets/food/juice.jpg";

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
  [["onion", "pyaz", "pyaaz"], onion],
  [["potato", "aloo", "alu"], potato],
  [["spinach", "palak"], spinach],
  [["banana", "kela"], banana],
  [["apple"], apple],
  [["mango", "aam"], mango],
  [["orange", "santra", "mosambi"], orange],
  [["grape", "angoor"], grapes],
  [["pomegranate", "anar"], pomegranate],
  [["carrot", "gajar"], carrot],
  [["cucumber", "kheera", "khira"], cucumber],
  [["capsicum", "bell pepper", "shimla"], capsicum],
  [["cauliflower", "gobhi", "gobi"], cauliflower],
  [["cabbage", "patta gobhi"], cabbage],
  [["garlic", "lehsun", "lasun"], garlic],
  [["ginger", "adrak"], ginger],
  [["lemon", "lime", "nimbu", "neembu"], lemon],
  [["rice", "chawal", "basmati"], rice],
  [["atta", "flour", "maida"], atta],
  [["dal", "daal", "lentil", "toor", "moong", "masoor"], dal],
  [["butter", "makhan"], butter],
  [["sugar", "cheeni", "chini"], sugar],
  [["tea", "chai"], tea],
  [["coffee"], coffee],
  [["honey", "shahad"], honey],
  [["oil", "tel"], oil],
  [["chickpea", "chana", "chole"], chickpeas],
  [["rajma", "kidney bean"], rajma],
  [["brinjal", "eggplant", "baingan", "aubergine"], brinjal],
  [["okra", "bhindi", "lady finger", "ladyfinger"], okra],
  [["peas", "matar"], peas],
  [["coriander", "cilantro", "dhaniya"], coriander],
  [["chilli", "chili", "mirchi", "mirch"], chilli],
  [["dates", "khajoor"], dates],
  [["papaya", "papita"], papaya],
  [["strawberry"], strawberry],
  [["guava", "amrud"], guava],
  [["pineapple", "ananas"], pineapple],
  [["watermelon", "tarbuj", "tarbooz"], watermelon],
  [["biscuit", "cookie"], biscuits],
  [["pasta", "macaroni", "penne"], pasta],
  [["masala", "turmeric", "haldi", "cumin", "jeera"], masala],
  [["almond", "cashew", "badam", "kaju", "nuts"], nuts],
  [["arbi", "arvi", "taro"], arbi],
  [["juice"], juice],
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

