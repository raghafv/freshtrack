import pasta from "@/assets/dishes/pasta.jpg";
import curry from "@/assets/dishes/curry.jpg";
import stirfry from "@/assets/dishes/stirfry.jpg";
import salad from "@/assets/dishes/salad.jpg";
import soup from "@/assets/dishes/soup.jpg";
import breakfast from "@/assets/dishes/breakfast.jpg";
import rice from "@/assets/dishes/rice.jpg";
import fallback from "@/assets/dishes/default.jpg";

/** Presentation-only: pick a beautiful hero photo for a recipe title. */
const MATCHES: Array<[string[], string]> = [
  [["pasta", "spaghetti", "noodle", "macaroni", "alfredo", "lasagne", "lasagna"], pasta],
  [["curry", "masala", "sabzi", "gravy", "korma", "dal", "daal", "paneer"], curry],
  [["stir", "wok", "saute", "sauté", "toss", "chilli", "manchurian"], stirfry],
  [["salad", "slaw", "bowl", "raita", "chaat"], salad],
  [["soup", "broth", "stew", "rasam", "shorba"], soup],
  [["omelet", "omelette", "egg", "toast", "pancake", "breakfast", "poha", "upma", "paratha"], breakfast],
  [["rice", "biryani", "pulao", "pilaf", "fried rice", "khichdi"], rice],
];

export function recipePhoto(title?: string | null): string {
  const t = (title ?? "").toLowerCase();
  for (const [keys, src] of MATCHES) {
    if (keys.some((k) => t.includes(k))) return src;
  }
  return fallback;
}
