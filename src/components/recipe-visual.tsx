import { Clock3, Flame, Leaf, Soup, Sparkles, UtensilsCrossed, Wheat, Egg, CookingPot } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FALLBACK_FOOD_IMAGE, foodPhoto } from "@/lib/food-image";
import { cn } from "@/lib/utils";

/**
 * Photo-free recipe visuals: the real ingredients that go into a dish plus a
 * small culinary spec sheet. Nothing is guessed about what the finished plate
 * looks like, so it can never show the wrong dish.
 */

type Technique = { label: string; icon: LucideIcon };

const TECHNIQUES: Array<[RegExp, Technique]> = [
  [/bhurji|scramble|anda|omelet|omlet|egg/i, { label: "Whisk & scramble", icon: Egg }],
  [/soup|shorba|rasam|broth|stew/i, { label: "Slow simmer", icon: Soup }],
  [/curry|gravy|masala|makhani|korma|dal|rajma|chole|sambh?ar/i, { label: "Simmer & curry", icon: CookingPot }],
  [/tikka|tandoor|grill|roast|bake|kebab|toast/i, { label: "Roast & char", icon: Flame }],
  [/rice|biryani|pulao|khichdi|pasta|noodle|paratha|roti|dosa|upma|poha/i, { label: "Grain & toss", icon: Wheat }],
  [/salad|chaat|raita|slaw|bowl/i, { label: "Fresh assemble", icon: Leaf }],
  [/stir|fry|sabzi|saute|sauté|bhaji|tawa|pan/i, { label: "Pan-sauté", icon: Flame }],
];

export function techniqueFor(title: string, steps: string[] = []): Technique {
  for (const [re, t] of TECHNIQUES) if (re.test(title)) return t;
  const body = steps.join(" ");
  for (const [re, t] of TECHNIQUES) if (re.test(body)) return t;
  return { label: "Home-style", icon: UtensilsCrossed };
}

function IngredientChip({ name, owned, size }: { name: string; owned: boolean; size: "sm" | "md" }) {
  const src = foodPhoto(name);
  const hasPhoto = src && src !== FALLBACK_FOOD_IMAGE;
  const dim = size === "md" ? "h-14 w-14" : "h-11 w-11";
  return (
    <li className="flex w-16 shrink-0 flex-col items-center gap-1.5">
      <span
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-2xl bg-muted ring-2 ring-offset-2 ring-offset-card",
          dim,
          owned ? "ring-primary/70" : "ring-border",
        )}
      >
        {hasPhoto ? (
          <img src={src} alt="" aria-hidden className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="text-[17px] font-semibold uppercase text-muted-foreground">{name.charAt(0)}</span>
        )}
      </span>
      <span className="line-clamp-1 w-full text-center text-[10.5px] font-medium capitalize text-muted-foreground">
        {name}
      </span>
    </li>
  );
}

export function IngredientStrip({
  uses,
  pantryNames,
  size = "md",
  className,
}: {
  uses: string[];
  pantryNames?: Set<string>;
  size?: "sm" | "md";
  className?: string;
}) {
  const list = uses.filter((u, i, a) => u && a.indexOf(u) === i).slice(0, 8);
  if (list.length === 0) return null;
  return (
    <ul className={cn("-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 pt-2 scrollbar-none", className)}>
      {list.map((u) => (
        <IngredientChip
          key={u}
          name={u}
          size={size}
          owned={pantryNames ? pantryNames.has(u.toLowerCase()) : true}
        />
      ))}
    </ul>
  );
}

export function RecipeSpecBar({
  title,
  steps,
  minutes,
  fromPantry,
  savesWaste,
  className,
}: {
  title: string;
  steps?: string[];
  minutes?: number | null;
  fromPantry: number;
  savesWaste?: boolean;
  className?: string;
}) {
  const t = techniqueFor(title, steps);
  const Icon = t.icon;
  const tiles: Array<{ icon: LucideIcon; label: string; value: string }> = [
    { icon: Icon, label: "Method", value: t.label },
    { icon: Clock3, label: "Time", value: minutes ? `${minutes} min` : "—" },
    {
      icon: savesWaste ? Leaf : Sparkles,
      label: savesWaste ? "Zero waste" : "Pantry",
      value: `${fromPantry} item${fromPantry === 1 ? "" : "s"}`,
    },
  ];
  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-2xl bg-muted/60 px-3 py-2.5">
          <tile.icon className="h-4 w-4 text-primary" strokeWidth={1.9} />
          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {tile.label}
          </p>
          <p className="line-clamp-1 text-[12.5px] font-semibold">{tile.value}</p>
        </div>
      ))}
    </div>
  );
}
