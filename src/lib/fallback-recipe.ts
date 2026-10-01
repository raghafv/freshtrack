import type { PantryRecipe } from "./ai-types";

/**
 * Instant, offline dinner idea built from real pantry items — used whenever
 * the AI is slow or unavailable so "Tonight's recommendation" never fails.
 */

interface Template {
  title: string;
  needs: RegExp[]; // at least one must match a pantry item
  minutes: number;
  cuisine: string;
  steps: (main: string, extras: string[]) => string[];
}

const TEMPLATES: Template[] = [
  {
    title: "Paneer Bhurji",
    needs: [/paneer/i],
    minutes: 20,
    cuisine: "Indian",
    steps: (m, x) => [
      "Heat 1 tbsp oil, add 1 tsp cumin seeds and let them splutter.",
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
    needs: [/dal|lentil|moong|masoor|toor/i],
    minutes: 30,
    cuisine: "Indian",
    steps: (m) => [
      `Rinse 1 cup ${m} and pressure-cook with 3 cups water, turmeric and salt for 3 whistles.`,
      "Heat 1 tbsp ghee, add cumin, garlic and dried red chilli.",
      "Add chopped onion and tomato; cook until soft.",
      "Pour the tadka over the dal, simmer 5 minutes and finish with coriander.",
    ],
  },
  {
    title: "Vegetable Pulao",
    needs: [/rice|chawal/i],
    minutes: 30,
    cuisine: "Indian",
    steps: (m, x) => [
      `Rinse 1 cup ${m} and soak for 15 minutes.`,
      "Heat ghee, add whole spices (bay leaf, cloves, cumin) and sliced onion.",
      `Add ${x.length ? x.join(", ") : "mixed vegetables"} and sauté 3 minutes.`,
      "Add drained rice, 2 cups water and salt; cover and cook on low for 12–15 minutes.",
      "Rest 5 minutes, fluff with a fork and serve with curd.",
    ],
  },
  {
    title: "Garlic Vegetable Pasta",
    needs: [/pasta|spaghetti|macaroni|penne/i],
    minutes: 20,
    cuisine: "Italian",
    steps: (m, x) => [
      `Boil the ${m} in well-salted water until al dente; keep ½ cup pasta water.`,
      "Gently fry sliced garlic and chilli flakes in olive oil.",
      `Add ${x.length ? x.join(", ") : "any vegetables you have"} and sauté 3–4 minutes.`,
      "Toss in the pasta with a splash of pasta water, salt and pepper.",
      "Finish with cheese or herbs if you have them.",
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
      "Cover and cook on low for 12–15 minutes, stirring occasionally, until tender.",
      "Finish with amchur and coriander. Serve with roti or puri.",
    ],
  },
  {
    title: "Curd Rice",
    needs: [/curd|dahi|yog/i],
    minutes: 15,
    cuisine: "South Indian",
    steps: (m) => [
      "Mash 1 cup cooked rice while warm.",
      `Mix in 1 cup ${m}, salt and a splash of milk.`,
      "Temper mustard seeds, curry leaves and green chilli in oil.",
      "Pour over the rice, mix and serve chilled or at room temperature.",
    ],
  },
  {
    title: "Mixed Vegetable Stir-Fry",
    needs: [/.*/],
    minutes: 15,
    cuisine: "Indo-Chinese",
    steps: (m, x) => [
      `Slice the ${[m, ...x].join(", ")} into thin, even strips.`,
      "Heat oil until very hot, add garlic and ginger.",
      "Add the hardest vegetables first, then the softer ones; toss on high heat 4–5 minutes.",
      "Season with soy sauce, pepper and a pinch of sugar.",
      "Serve over rice or noodles.",
    ],
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

  for (const t of TEMPLATES) {
    const main = usable.find((i) => t.needs.some((re) => re.test(i.name)));
    if (!main) continue;
    const extras = usable
      .filter((i) => i !== main)
      .slice(0, 3)
      .map((i) => i.name.toLowerCase());
    const uses = [main.name, ...extras.map((e) => e)];
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
