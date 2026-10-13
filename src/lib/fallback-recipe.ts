import type { PantryRecipe } from "./ai-types";

/**
 * Instant, offline dinner idea built from real pantry items — used whenever
 * the AI is slow, throttled, or unavailable so "Tonight's recommendation" never fails.
 */

interface Template {
  title: string;
  needs: RegExp[]; // at least one must match a pantry item
  minutes: number;
  cuisine: string;
  steps: (main: string, extras: string[]) => string[];
}

/** Ingredients that should serve as cooking mediums or seasonings, never as the sliced "hero" */
const NON_MAIN_REGEX =
  /\b(ghee|oil|butter|fat|lard|salt|sugar|jaggery|gur|spice|spices|masala|turmeric|haldi|mirch|chilli|chili|cumin|jeera|mustard\s*seeds?|rai|hing|asafoetida|black\s*pepper|pepper|garam\s*masala|cardamom|elaichi|clove|laung|cinnamon|dalchini|sauce|ketchup|vinegar|mayo|mayonnaise|baking\s*powder|baking\s*soda|yeast|tea|chai|coffee)\b/i;

const TEMPLATES: Template[] = [
  {
    title: "Paneer Bhurji",
    needs: [/paneer/i],
    minutes: 20,
    cuisine: "Indian",
    steps: (m, x) => [
      "Heat 1 tbsp oil or ghee, add 1 tsp cumin seeds and let them splutter.",
      `Sauté chopped onion${x.length ? ` with ${x.join(", ")}` : ""} until soft and golden (5–6 min).`,
      "Add ½ tsp turmeric, 1 tsp red chilli powder and salt; cook 1 minute.",
      `Crumble in the ${m} and toss on medium heat for 3–4 minutes.`,
      "Finish with garam masala and fresh coriander. Serve with roti or toast.",
    ],
  },
  {
    title: "Masala Omelette",
    needs: [/egg|anda/i],
    minutes: 12,
    cuisine: "Indian",
    steps: (m, x) => [
      `Whisk 3 ${m} with salt, pepper and a pinch of turmeric.`,
      `Fold in finely chopped ${x.length ? x.join(", ") : "onion and green chilli"}.`,
      "Heat 1 tsp butter or oil in a pan on medium heat.",
      "Pour in the mix, cover and cook 2–3 minutes until set, then fold.",
      "Serve hot with toast or roti.",
    ],
  },
  {
    title: "Dal Tadka",
    needs: [/dal|lentil|moong|masoor|toor|chana|rajma/i],
    minutes: 30,
    cuisine: "Indian",
    steps: (m) => [
      `Rinse 1 cup ${m} and pressure-cook with 3 cups water, turmeric and salt for 3 whistles.`,
      "Heat 1 tbsp ghee, add cumin seeds, garlic and dried red chilli.",
      "Add chopped onion and tomato; cook until soft and fragrant.",
      "Pour the hot tadka over the dal, simmer for 5 minutes and garnish with fresh coriander.",
    ],
  },
  {
    title: "Vegetable Pulao",
    needs: [/rice|chawal/i],
    minutes: 30,
    cuisine: "Indian",
    steps: (m, x) => [
      `Rinse 1 cup ${m} and soak for 15 minutes.`,
      "Heat ghee, add whole spices (bay leaf, cloves, cumin) and sliced onions.",
      `Add ${x.length ? x.join(", ") : "mixed vegetables"} and sauté for 3 minutes.`,
      "Add drained rice, 2 cups water and salt; cover and cook on low heat for 12–15 minutes.",
      "Rest 5 minutes, fluff gently with a fork and serve with curd or raita.",
    ],
  },
  {
    title: "Garlic Vegetable Pasta",
    needs: [/pasta|spaghetti|macaroni|penne|noodle/i],
    minutes: 20,
    cuisine: "Italian",
    steps: (m, x) => [
      `Boil the ${m} in well-salted water until al dente; reserve ½ cup pasta water.`,
      "Gently fry sliced garlic and chilli flakes in olive oil or butter.",
      `Add ${x.length ? x.join(", ") : "fresh vegetables"} and sauté for 3–4 minutes.`,
      "Toss in the cooked pasta with a splash of reserved pasta water, salt and pepper.",
      "Finish with grated cheese or dried herbs if available.",
    ],
  },
  {
    title: "Aloo Sabzi",
    needs: [/potato|aloo/i],
    minutes: 25,
    cuisine: "Indian",
    steps: (m) => [
      `Peel and cube 3 ${m}.`,
      "Heat oil, add cumin and mustard seeds, then a pinch of hing.",
      "Add potatoes, turmeric, chilli powder and salt; stir well.",
      "Cover and cook on low heat for 12–15 minutes, stirring occasionally until fork-tender.",
      "Finish with amchur (dry mango powder) and chopped coriander. Serve with roti or paratha.",
    ],
  },
  {
    title: "Curd Rice",
    needs: [/curd|dahi|yog/i],
    minutes: 15,
    cuisine: "South Indian",
    steps: (m) => [
      "Mash 1 cup warm cooked rice lightly with a spoon.",
      `Mix in 1 cup fresh ${m}, salt and a splash of milk for creaminess.`,
      "Heat 1 tsp oil; temper mustard seeds, curry leaves, ginger and green chillies.",
      "Pour the hot tempering over the rice, mix thoroughly and serve chilled or room temperature.",
    ],
  },
  {
    title: "Aromatic Jeera Rice & Tadka",
    needs: [/ghee|butter/i],
    minutes: 15,
    cuisine: "Indian",
    steps: (m, x) => [
      `Melt 1–2 tbsp of ${m} in a pan over medium heat.`,
      "Add 1 tsp cumin seeds (jeera) and let them splutter until aromatic.",
      `Toss in ${x.length ? x.join(", ") : "cooked rice or vegetables"} and sauté for 2–3 minutes.`,
      "Season with salt, black pepper and a pinch of garam masala. Serve hot.",
    ],
  },
  {
    title: "Mixed Vegetable Stir-Fry",
    needs: [/.*/],
    minutes: 15,
    cuisine: "Indo-Chinese",
    steps: (m, x) => {
      const vegList = [m, ...x].filter((name) => !NON_MAIN_REGEX.test(name));
      const sliced = vegList.length > 0 ? vegList.join(", ") : "vegetables";
      return [
        `Wash and slice the ${sliced} into thin, even strips.`,
        "Heat 1 tbsp oil in a wok or pan on high flame, then add minced garlic and ginger.",
        "Add the firmer vegetables first, followed by softer ones; toss quickly on high heat for 4–5 minutes.",
        "Season with soy sauce or lemon juice, salt and crushed black pepper.",
        "Serve hot alongside rice or roti.",
      ];
    },
  },
];

export interface FallbackItem {
  name: string;
  days_left: number;
}

export function fallbackRecipe(items: FallbackItem[]): PantryRecipe | null {
  const usable = items
    .filter((i) => i.days_left >= 0)
    .sort((a, b) => a.days_left - b.days_left);
  if (usable.length === 0) return null;

  // Filter out fats, oils, and seasonings so they are never chosen as the hero ingredient
  const foodMains = usable.filter((i) => !NON_MAIN_REGEX.test(i.name));
  const candidatePool = foodMains.length > 0 ? foodMains : usable;

  for (const t of TEMPLATES) {
    const main = candidatePool.find((i) => t.needs.some((re) => re.test(i.name)));
    if (!main) continue;

    const extras = usable
      .filter((i) => i !== main && !NON_MAIN_REGEX.test(i.name))
      .slice(0, 3)
      .map((i) => i.name.toLowerCase());

    const uses = [main.name, ...extras];
    return {
      title: t.title,
      minutes: t.minutes,
      cuisine: t.cuisine,
      servings: 2,
      difficulty: "Easy",
      description: `A quick ${t.cuisine.toLowerCase()} dinner that uses up ${main.name.toLowerCase()} first.`,
      uses,
      priority: [main.name],
      steps: t.steps(main.name.toLowerCase(), extras),
      substitutions: [],
      savesWaste: main.days_left <= 3 ? `Uses ${main.name} before it expires.` : null,
      note: null,
    };
  }
  return null;
}
