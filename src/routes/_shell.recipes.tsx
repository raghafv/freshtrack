import { friendlyMessage } from "@/lib/errors";

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Bookmark,
  ChefHat,
  Clock,
  Heart,
  Loader2,
  Plus,
  Shuffle,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader } from "@/components/layout";
import { AiTabs } from "@/components/ai-tabs";
import { FoodThumb } from "@/components/food-thumb";
import { cn } from "@/lib/utils";
import {
  usePantryItems,
  useRecipeMutations,
  useSavedRecipes,
  useSettings,
  type SavedRecipe,
} from "@/lib/data";
import { expiryText, getStatus } from "@/lib/freshtrack";
import { suggestRecipes, type PantryRecipe } from "@/lib/ai.functions";

export const Route = createFileRoute("/_shell/recipes")({
  head: () => ({
    meta: [
      { title: "Recipes — Cook What You Already Own | FreshTrack" },
      {
        name: "description",
        content:
          "AI recipe ideas built from the ingredients you choose, prioritising whatever expires first — then saved forever in your recipe book.",
      },
      { property: "og:title", content: "FreshTrack Recipes" },
      {
        property: "og:description",
        content: "Detailed AI recipes from your real ingredients, saved permanently.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RecipesPage,
});

/* -------------------------------------------------------------------------- */
/* Favourites live on the device so no database change is needed.              */
/* -------------------------------------------------------------------------- */

const FAV_KEY = "freshtrack.recipes.favorites";

function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      if (raw) setIds(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }, []);
  const toggle = (id: string) =>
    setIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(FAV_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  return { ids, toggle };
}

const MEAL_FILTERS = ["All", "Breakfast", "Lunch", "Dinner", "Dessert", "Favorites", "Recent"];

const MEAL_WORDS: Record<string, RegExp> = {
  Breakfast: /breakfast|poha|upma|omelet|omelette|pancake|smoothie|oats|paratha|toast|cereal|idli|dosa/i,
  Lunch: /lunch|salad|sandwich|wrap|bowl|pulao|khichdi|rice|thali/i,
  Dinner: /dinner|curry|pasta|soup|roast|stir[- ]?fry|biryani|dal|noodle|bake/i,
  Dessert: /dessert|cake|pudding|halwa|ice cream|kheer|brownie|cookie|sweet|mousse/i,
};

function matchesMeal(recipe: SavedRecipe, meal: string) {
  const hay = `${recipe.title} ${recipe.steps.join(" ")}`;
  return MEAL_WORDS[meal]?.test(hay) ?? true;
}

function difficultyFor(recipe: SavedRecipe) {
  const m = recipe.minutes ?? 0;
  if (m && m <= 20) return "Easy";
  if (m && m <= 45) return "Medium";
  return m ? "Involved" : "Easy";
}

function RecipesPage() {
  const { data: items = [] } = usePantryItems();
  const { data: settings } = useSettings();
  const { data: saved = [] } = useSavedRecipes(60);
  const { clearAll, save } = useRecipeMutations();
  const favorites = useFavorites();
  const qc = useQueryClient();
  const soonDays = settings?.expiry_reminder_days ?? 3;

  const [chosen, setChosen] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState("All");

  const priority = items.filter((i) => getStatus(i, soonDays) !== "fresh").slice(0, 10);
  const pantryNames = useMemo(() => new Set(items.map((i) => i.name.toLowerCase())), [items]);

  const gen = useMutation({
    mutationFn: (vars: { mode: "surprise" | "selected"; ingredients: string[] }) =>
      suggestRecipes({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-recipes"] }),
    onError: (e) => toast.error(friendlyMessage(e, "Could not generate recipes")),
  });

  const recipes = gen.data?.recipes ?? [];
  const featured = recipes[0];

  function addIngredient(raw: string) {
    const name = raw.trim().replace(/,+$/, "");
    if (!name) return;
    setChosen((c) => (c.some((x) => x.toLowerCase() === name.toLowerCase()) ? c : [...c, name]));
    setDraft("");
  }

  const filteredSaved = useMemo(() => {
    if (filter === "Favorites") return saved.filter((r) => favorites.ids.includes(r.id));
    if (filter === "Recent") return saved.slice(0, 8);
    if (filter === "All") return saved;
    return saved.filter((r) => matchesMeal(r, filter));
  }, [saved, filter, favorites.ids]);

  return (
    <PageContainer>
      <AiTabs active="recipes" />
      <PageHeader
        title="Recipes"
        subtitle="Type anything you feel like cooking with — FreshTrack writes the full recipe and keeps the ones you save."
        action={
          saved.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-muted-foreground"
              onClick={() => clearAll.mutate()}
              disabled={clearAll.isPending}
            >
              <Trash2 className="h-4 w-4" /> Clear
            </Button>
          ) : undefined
        }
      />

      {/* Ingredient composer */}
      <section className="surface-card animate-fade-up mb-9 p-6">
        <h2 className="text-[17px] font-semibold tracking-[-0.02em]">What are we cooking with?</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          Add any ingredient — it doesn't have to be in your pantry.
        </p>

        <div className="mt-5 flex gap-2">
          <Input
            value={draft}
            placeholder="e.g. paneer, spinach, cream"
            className="h-12 rounded-2xl"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addIngredient(draft);
              }
            }}
          />
          <Button
            variant="secondary"
            className="press h-12 shrink-0 rounded-2xl px-4"
            onClick={() => addIngredient(draft)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {chosen.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {chosen.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setChosen((c) => c.filter((x) => x !== name))}
                className="press flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-[13px] font-medium text-primary-foreground"
              >
                {name} <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <>
            <p className="mt-6 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              From your pantry
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {items.slice(0, 16).map((i) => {
                const on = chosen.some((x) => x.toLowerCase() === i.name.toLowerCase());
                return (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() =>
                      on
                        ? setChosen((c) => c.filter((x) => x.toLowerCase() !== i.name.toLowerCase()))
                        : addIngredient(i.name)
                    }
                    className={cn(
                      "press flex items-center gap-2 rounded-full py-1 pl-1 pr-3.5 text-[13px] font-medium transition-colors",
                      on ? "bg-primary text-primary-foreground" : "bg-muted/70 text-foreground",
                    )}
                  >
                    <FoodThumb
                      name={i.name}
                      category={i.category}
                      imageUrl={i.image_url}
                      className="h-7 w-7 rounded-full"
                      emojiClassName="text-sm"
                    />
                    {i.name}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button
            className="press h-13 min-h-12 rounded-2xl"
            disabled={chosen.length === 0 || gen.isPending}
            onClick={() => gen.mutate({ mode: "selected", ingredients: chosen })}
          >
            {gen.isPending && gen.variables?.mode === "selected" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Write my recipe
          </Button>
          <Button
            variant="secondary"
            className="press h-13 min-h-12 rounded-2xl"
            disabled={gen.isPending}
            onClick={() => gen.mutate({ mode: "surprise", ingredients: [] })}
          >
            {gen.isPending && gen.variables?.mode === "surprise" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Shuffle className="h-4 w-4" />
            )}
            Surprise me
          </Button>
        </div>
      </section>

      {/* Featured recommendation */}
      {featured && (
        <section className="animate-fade-up mb-9">
          <div className="gradient-hero rounded-[2rem] p-7 text-primary-foreground shadow-lift">
            <p className="text-[11.5px] font-medium uppercase tracking-[0.16em] opacity-70">
              Tonight's recommendation
            </p>
            <h3 className="mt-2 text-[26px] font-bold leading-tight tracking-[-0.03em]">
              {featured.title}
            </h3>
            {featured.uses.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {featured.uses.slice(0, 4).map((u) => (
                  <li key={u} className="text-[13.5px] opacity-90">
                    ✓ {u}
                  </li>
                ))}
              </ul>
            )}
            <a
              href="#new-ideas"
              className="press mt-6 inline-flex items-center gap-1.5 rounded-full bg-primary-foreground px-5 py-2.5 text-[13.5px] font-semibold text-primary"
            >
              Cook <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>
      )}

      {priority.length > 0 && (
        <section className="surface-card mb-9 p-6">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-[15px] font-semibold">Use these first</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {priority.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => addIngredient(i.name)}
                className="press rounded-full bg-primary-soft px-3.5 py-1.5 text-[12.5px] font-medium text-primary"
              >
                {i.name} · {expiryText(i.expiry_date).toLowerCase()}
              </button>
            ))}
          </div>
        </section>
      )}

      {recipes.length > 0 && (
        <section id="new-ideas" className="mb-10">
          <h2 className="mb-4 text-[19px] font-semibold tracking-[-0.025em]">
            New ideas — save the ones you love
          </h2>
          <ul className="space-y-5">
            {recipes.map((r) => (
              <RecipeCard
                key={r.title}
                recipe={r}
                saved={saved.some((s) => s.title === r.title)}
                saving={save.isPending}
                onSave={() =>
                  save.mutate(
                    {
                      title: r.title,
                      minutes: r.minutes,
                      uses: r.uses,
                      missing: r.substitutions.map((s) => s.missing).filter(Boolean),
                      steps: r.steps,
                      mode: gen.variables?.mode ?? "surprise",
                    },
                    {
                      onSuccess: () => toast.success("Saved to your recipe book"),
                      onError: (e) => toast.error(friendlyMessage(e, "Could not save recipe")),
                    },
                  )
                }
              />
            ))}
          </ul>
        </section>
      )}

      {/* Saved recipe book */}
      <section>
        <h2 className="mb-4 text-[19px] font-semibold tracking-[-0.025em]">Saved recipes</h2>

        {saved.length > 0 && (
          <div className="-mx-6 mb-5 flex gap-2 overflow-x-auto px-6 pb-1 no-scrollbar">
            {MEAL_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "press shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition-colors",
                  filter === f ? "bg-primary text-primary-foreground" : "bg-muted/70 text-muted-foreground",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        {saved.length === 0 ? (
          <div className="surface-card px-7 py-12 text-center text-[13.5px] leading-relaxed text-muted-foreground">
            Nothing saved yet. Generate a recipe above and tap Save — it stays here permanently.
          </div>
        ) : filteredSaved.length === 0 ? (
          <div className="surface-card px-7 py-10 text-center text-[13.5px] text-muted-foreground">
            No saved recipes in this category yet.
          </div>
        ) : (
          <ul className="space-y-5">
            {filteredSaved.map((r) => (
              <SavedRecipeCard
                key={r.id}
                recipe={r}
                favorite={favorites.ids.includes(r.id)}
                onToggleFavorite={() => favorites.toggle(r.id)}
                pantryNames={pantryNames}
              />
            ))}
          </ul>
        )}
      </section>

      <div className="surface-card mt-9 flex items-start gap-3.5 p-5">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          Recipes prioritise the ingredients closest to expiry. Missing something? Ask the assistant
          to add it to your shopping list.
        </p>
      </div>

      {items.length === 0 && saved.length === 0 && recipes.length === 0 && (
        <div className="mt-6 text-center">
          <Button asChild variant="secondary" className="rounded-2xl">
            <Link to="/pantry">
              <ChefHat className="h-4 w-4" /> Go to my pantry
            </Link>
          </Button>
        </div>
      )}
    </PageContainer>
  );
}

function SavedRecipeCard({
  recipe,
  favorite,
  onToggleFavorite,
  pantryNames,
}: {
  recipe: SavedRecipe;
  favorite: boolean;
  onToggleFavorite: () => void;
  pantryNames: Set<string>;
}) {
  const { remove } = useRecipeMutations();
  const have = recipe.uses.filter((u) => pantryNames.has(u.toLowerCase()));
  const missing = [
    ...recipe.missing,
    ...recipe.uses.filter((u) => !pantryNames.has(u.toLowerCase())),
  ].filter((v, i, a) => v && a.indexOf(v) === i);

  return (
    <li className="surface-card animate-fade-up overflow-hidden shadow-lift">
      <div className="flex items-center gap-4 bg-muted/40 px-6 py-5">
        <FoodThumb
          name={recipe.uses[0] ?? recipe.title}
          className="h-16 w-16 rounded-2xl"
          emojiClassName="text-3xl"
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-[19px] font-semibold leading-snug tracking-[-0.02em]">
            {recipe.title}
          </h3>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {recipe.minutes ? `${recipe.minutes} min · ` : ""}
            {difficultyFor(recipe)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-2">
          <button
            type="button"
            aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
            onClick={onToggleFavorite}
            className="press flex h-9 w-9 items-center justify-center rounded-full bg-card"
          >
            <Heart
              className={cn("h-4 w-4", favorite ? "fill-primary text-primary" : "text-muted-foreground")}
            />
          </button>
          <button
            type="button"
            aria-label="Remove recipe"
            onClick={() => remove.mutate(recipe.id)}
            className="press flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="p-6">
        {(have.length > 0 || missing.length > 0) && (
          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            {have.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  You have
                </p>
                <p className="mt-1 text-[13px] text-foreground">{have.join(", ")}</p>
              </div>
            )}
            {missing.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Missing
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">{missing.join(", ")}</p>
              </div>
            )}
          </div>
        )}

        <ol className="space-y-2.5">
          {recipe.steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-[13.5px]">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
                {i + 1}
              </span>
              <span className="leading-relaxed text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </li>
  );
}

function RecipeCard({
  recipe,
  saved,
  saving,
  onSave,
}: {
  recipe: PantryRecipe;
  saved: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <li className="surface-card animate-fade-up p-6">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-[20px] font-semibold leading-snug tracking-[-0.025em]">
          {recipe.title}
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-primary-soft px-3 py-1 text-[11px] font-semibold text-primary">
            {recipe.minutes} min
          </span>
          <Button
            size="sm"
            variant={saved ? "secondary" : "default"}
            className="press h-8 rounded-full px-3.5 text-[11.5px]"
            disabled={saved || saving}
            onClick={onSave}
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Bookmark className="h-3 w-3" />
            )}
            {saved ? "Saved" : "Save"}
          </Button>
        </div>
      </div>

      {recipe.description && (
        <p className="mb-3 text-[13.5px] leading-relaxed text-muted-foreground">
          {recipe.description}
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-1.5 text-[11.5px] text-muted-foreground">
        {recipe.servings ? (
          <span className="rounded-full border border-border/60 px-2.5 py-0.5">
            Serves {recipe.servings}
          </span>
        ) : null}
        {recipe.prepMinutes ? (
          <span className="rounded-full border border-border/60 px-2.5 py-0.5">
            Prep {recipe.prepMinutes} min
          </span>
        ) : null}
        {recipe.cookMinutes ? (
          <span className="rounded-full border border-border/60 px-2.5 py-0.5">
            Cook {recipe.cookMinutes} min
          </span>
        ) : null}
        {recipe.difficulty && (
          <span className="rounded-full border border-border/60 px-2.5 py-0.5">
            {recipe.difficulty}
          </span>
        )}
        {recipe.cuisine && (
          <span className="rounded-full border border-border/60 px-2.5 py-0.5">
            {recipe.cuisine}
          </span>
        )}
      </div>

      {recipe.priority.length > 0 && (
        <p className="mb-3 text-[12.5px] font-medium text-warning">
          Rescues: {recipe.priority.join(", ")}
        </p>
      )}

      {recipe.ingredients && recipe.ingredients.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Ingredients
          </p>
          <ul className="space-y-1.5">
            {recipe.ingredients.map((ing) => (
              <li key={ing.name} className="flex justify-between gap-3 text-[13.5px]">
                <span>{ing.name}</span>
                <span className="shrink-0 text-muted-foreground">{ing.amount}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recipe.equipment && recipe.equipment.length > 0 && (
        <p className="mb-3 text-[12.5px] text-muted-foreground">
          <span className="font-semibold">Equipment:</span> {recipe.equipment.join(", ")}
        </p>
      )}

      {recipe.substitutions.length > 0 && (
        <div className="mb-4 rounded-2xl bg-muted/60 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Substitutions
          </p>
          <ul className="mt-1.5 space-y-1">
            {recipe.substitutions.map((sub) => (
              <li key={sub.missing} className="text-[12.5px] text-muted-foreground">
                No <span className="font-medium text-foreground">{sub.missing}</span> — use{" "}
                <span className="font-medium text-foreground">{sub.use}</span> instead
              </li>
            ))}
          </ul>
        </div>
      )}

      <ol className="space-y-2.5">
        {recipe.steps.map((step, i) => (
          <li key={i} className="flex gap-3 text-[13.5px]">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
              {i + 1}
            </span>
            <span className="leading-relaxed text-muted-foreground">{step}</span>
          </li>
        ))}
      </ol>

      {recipe.tips && recipe.tips.length > 0 && (
        <div className="mt-4 rounded-2xl bg-muted/60 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Tips
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            {recipe.tips.map((t) => (
              <li key={t} className="text-[12.5px] text-muted-foreground">
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {recipe.storageAdvice && (
        <p className="mt-4 text-[12.5px] text-muted-foreground">
          <span className="font-semibold">Leftovers:</span> {recipe.storageAdvice}
        </p>
      )}

      {recipe.nutrition && (
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          <span className="font-semibold">Per serving:</span> {recipe.nutrition}
        </p>
      )}

      {recipe.savesWaste && (
        <p className="mt-4 rounded-xl bg-success/10 px-4 py-2.5 text-[12.5px] font-medium text-success">
          Saves waste: {recipe.savesWaste}
        </p>
      )}

      {recipe.note && <p className="mt-3 text-[12.5px] text-muted-foreground">{recipe.note}</p>}
    </li>
  );
}
