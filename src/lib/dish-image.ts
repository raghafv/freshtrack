import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Deterministic recipe-title → dish photo matching.
 *
 * The photos live in the private `foods` storage bucket and are matched purely
 * by keyword on the recipe title — no AI, no generation, no new files.
 * Anything that doesn't match falls back to a neutral placeholder.
 */

/** Every file in the `foods` bucket. Keep in sync with the bucket contents. */
export const DISH_FILES = [
  "burger.png",
  "butterchicken.png",
  "chickenbiryani.png",
  "chickpeaschole.png",
  "creamychickentikkamalaichickentikka.png",
  "creamyeggscramble.png",
  "creamymushrooms.png",
  "CREAMYWHITEtofuorpaneer.jpg",
  "dosa.png",
  "fishsalmonsurmayiplatter.png",
  "friedriceeggfriedricepulaovegbiryani.png",
  "idlisambhar.png",
  "macandcheese.png",
  "omlette.png",
  "paneertikka.png",
  "parantha.png",
  "pizza.png",
  "rajma.png",
  "redpaneerbuttermasalatofumasalashahipaneer.png",
  "redsaucepasta.png",
  "sambhar.png",
  "sandwich.png",
  "sunnysideupomlette.png",
  "tacos.png",
  "tandoorichicken.png",
  "vadasambhar.png",
  "whitesaucepasta.png",
] as const;

/** Most specific rules first — the first match wins. */
const RULES: Array<[RegExp, string]> = [
  // Chicken
  [/butter\s*chicken|murgh\s*makhani/i, "butterchicken.png"],
  [/tandoori\s*chicken|chicken\s*tandoori/i, "tandoorichicken.png"],
  [/(malai|tikka)\s*chicken|chicken\s*(malai|tikka)/i, "creamychickentikkamalaichickentikka.png"],
  [/chicken\s*(biryani|dum)/i, "chickenbiryani.png"],
  [/chicken/i, "creamychickentikkamalaichickentikka.png"],

  // Paneer & tofu
  [/(paneer|tofu)\s*tikka|tikka\s*(paneer|tofu)|paneer\s*(kebab|skewer|grill)/i, "paneertikka.png"],
  [
    /(shahi|malai|korma|kurma|white|cream(y)?)\s*(paneer|tofu)|(paneer|tofu)\s*(korma|kurma|malai|pasanda)|malai\s*kofta/i,
    "CREAMYWHITEtofuorpaneer.jpg",
  ],
  [
    /paneer\s*(butter\s*masala|makhani|masala|curry|gravy|do\s*pyaza|lababdar|bhurji)|(butter\s*masala|masala|curry)\s*(paneer|tofu)|kadai\s*paneer|tofu\s*masala|matar\s*paneer|palak\s*paneer/i,
    "redpaneerbuttermasalatofumasalashahipaneer.png",
  ],
  [/paneer|tofu/i, "redpaneerbuttermasalatofumasalashahipaneer.png"],

  // Legumes
  [/rajma|kidney\s*bean/i, "rajma.png"],
  [/chole|chana\s*masala|chickpea|garbanzo/i, "chickpeaschole.png"],

  // South Indian
  [/vada\s*sambh?ar|medu\s*vada/i, "vadasambhar.png"],
  [/idli/i, "idlisambhar.png"],
  [/dosa|uttapam/i, "dosa.png"],
  [/sambh?ar|rasam/i, "sambhar.png"],

  // Eggs
  [/sunny\s*side/i, "sunnysideupomlette.png"],
  [/scramble|bhurji\s*egg|egg\s*bhurji/i, "creamyeggscramble.png"],
  [/omelet|omlet|frittata|egg/i, "omlette.png"],

  // Rice & breads
  [/fried\s*rice|pulao|pilaf|veg(etable)?\s*biryani|biryani|jeera\s*rice/i, "friedriceeggfriedricepulaovegbiryani.png"],
  [/parath?a|parant?ha|roti|chapati|naan|flatbread/i, "parantha.png"],

  // Pasta & western
  [/mac(aroni)?\s*(and|&|n)?\s*cheese/i, "macandcheese.png"],
  [/(white\s*sauce|alfredo|b[ée]chamel|carbonara|cream(y)?)\s*pasta|pasta\s*(alfredo|in\s*white\s*sauce)/i, "whitesaucepasta.png"],
  [/pasta|spaghetti|penne|arrabbiata|marinara|lasagn/i, "redsaucepasta.png"],
  [/pizza|calzone/i, "pizza.png"],
  [/burger|slider/i, "burger.png"],
  [/taco|burrito|quesadilla/i, "tacos.png"],
  [/sandwich|toastie|grilled\s*cheese|panini/i, "sandwich.png"],

  // Seafood & veg
  [/fish|salmon|surmai|surmayi|prawn|shrimp|pomfret|basa/i, "fishsalmonsurmayiplatter.png"],
  [/mushroom/i, "creamymushrooms.png"],
];

/** The bucket file that illustrates this dish, or null when nothing matches. */
export function dishImageFile(title?: string | null): string | null {
  const t = (title ?? "").trim();
  if (!t) return null;
  for (const [pattern, file] of RULES) if (pattern.test(t)) return file;
  return null;
}

/** Signed URLs for the whole (small, fixed) library, fetched once per session. */
let signedUrls: Promise<Record<string, string>> | null = null;

function loadSignedUrls() {
  if (!signedUrls) {
    signedUrls = supabase.storage
      .from("foods")
      .createSignedUrls([...DISH_FILES], 60 * 60 * 6)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        for (const row of data ?? []) {
          if (row.path && row.signedUrl) map[row.path] = row.signedUrl;
        }
        return map;
      })
      .catch(() => ({}) as Record<string, string>);
  }
  return signedUrls;
}

/** Resolved photo for a recipe title, or null when no dish photo matches. */
export function useDishImage(title?: string | null): string | null {
  const file = dishImageFile(title);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!file) {
      setUrl(null);
      return;
    }
    loadSignedUrls().then((map) => {
      if (active) setUrl(map[file] ?? null);
    });
    return () => {
      active = false;
    };
  }, [file]);

  return url;
}
