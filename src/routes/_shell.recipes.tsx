import { friendlyMessage } from "@/lib/errors";

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChefHat,
  Clock,
  ListChecks,
  Loader2,
  Shuffle,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, PageContainer, PageHeader } from "@/components/layout";
import { AiTabs } from "@/components/ai-tabs";
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
          "AI recipe ideas built only from the groceries in your FreshTrack pantry, prioritising whatever expires first.",
      },
      { property: "og:title", content: "FreshTrack Recipes" },
      {
        property: "og:description",
        content:
          "Recipes generated from your real pantry, starting with ingredients closest to expiry.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RecipesPage,
});

function RecipesPage() {
  const { data: items = [] } = usePantryItems();
  const { data: settings } = useSettings();
  const { data: saved = [] } = useSavedRecipes(12);
  const { clearAll } = useRecipeMutations();
  const qc = useQueryClient();
  const soonDays = settings?.expiry_reminder_days ?? 3;

  const [picking, setPicking] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);

  const priority = items.filter((i) => getStatus(i, soonDays) !== "fresh").slice(0, 10);

  const gen = useMutation({
    mutationFn: (vars: { mode: "surprise" | "selected"; ingredients: string[] }) =>
      suggestRecipes({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-recipes"] });
      setPicking(false);
      setChosen([]);
    },
    onError: (e) => toast.error(friendlyMessage(e, "Could not generate recipes")),
  });

  const recipes = gen.data?.recipes ?? [];
  const toggleIngredient = (name: string) =>
    setChosen((c) => (c.includes(name) ? c.filter((n) => n !== name) : [...c, name]));

  return (
    <PageContainer>
      <AiTabs active="recipes" />
      <PageHeader
        title="Recipes"
        subtitle="Cook what's about to expire — generated from your live pantry."
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

      {items.length === 0 ? (
        <EmptyState
          icon={ChefHat}
          title="Your pantry is empty"
          description="Add or scan a few groceries and FreshTrack will build recipes that use only what you actually have at home."
          action={
            <Button asChild variant="secondary" className="mt-2 rounded-2xl">
              <Link to="/pantry">Go to my pantry</Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* Two ways to cook */}
          <section className="mb-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => gen.mutate({ mode: "surprise", ingredients: [] })}
              disabled={gen.isPending}
              className="press surface-card flex flex-col items-start gap-1 p-4 text-left disabled:opacity-60"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                {gen.isPending && gen.variables?.mode === "surprise" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Shuffle className="h-4 w-4" />
                )}
              </span>
              <span className="text-sm font-semibold">Surprise me</span>
              <span className="text-xs text-muted-foreground">
                Multiple ideas from your whole pantry.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPicking((p) => !p)}
              className="press surface-card flex flex-col items-start gap-1 p-4 text-left"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <ListChecks className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold">Pick ingredients</span>
              <span className="text-xs text-muted-foreground">
                Choose what you feel like cooking with.
              </span>
            </button>
          </section>

          {picking && (
            <section className="surface-card animate-fade-up mb-5 p-5">
              <p className="mb-3 text-sm text-muted-foreground">
                Tap the ingredients you want to cook with, then generate.
              </p>
              <div className="flex flex-wrap gap-2">
                {items.map((i) => {
                  const on = chosen.includes(i.name);
                  return (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => toggleIngredient(i.name)}
                      className={cn(
                        "press rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                        on
                          ? "bg-primary text-primary-foreground"
                          : "border border-border/60 text-muted-foreground",
                      )}
                    >
                      {i.name}
                    </button>
                  );
                })}
              </div>
              <Button
                className="press mt-4 h-11 w-full rounded-2xl"
                disabled={chosen.length === 0 || gen.isPending}
                onClick={() => gen.mutate({ mode: "selected", ingredients: chosen })}
              >
                {gen.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Cook with {chosen.length} ingredient{chosen.length === 1 ? "" : "s"}
              </Button>
            </section>
          )}

          {priority.length > 0 && (
            <section className="surface-card mb-5 p-5">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold">Cook-first ingredients</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {priority.map((i) => (
                  <span
                    key={i.id}
                    className="rounded-full bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary"
                  >
                    {i.name} · {expiryText(i.expiry_date).toLowerCase()}
                  </span>
                ))}
              </div>
            </section>
          )}

          {recipes.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
                New ideas — save the ones you like
              </h2>
              <ul className="space-y-3">
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
                          onSuccess: () => toast.success("Recipe saved"),
                          onError: (e) => toast.error(friendlyMessage(e, "Could not save recipe")),
                        },
                      )
                    }
                  />
                ))}
              </ul>
            </section>
          )}

          {saved.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Saved recipes</h2>
              <ul className="space-y-3">
                {saved.map((r) => (
                  <SavedRecipeCard key={r.id} recipe={r} />
                ))}
              </ul>
            </section>
          ) : recipes.length === 0 ? (
            <div className="surface-card px-6 py-10 text-center text-sm text-muted-foreground">
              Pick a mode above and FreshTrack will build meals from your {items.length} tracked
              item{items.length === 1 ? "" : "s"}. Save the ones you like and they stay here.
            </div>
          ) : null}
        </>
      )}

      <div className="surface-card mt-5 flex items-start gap-3 p-4">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Every recipe is built only from ingredients currently tracked in your pantry. Missing
          something? Ask the assistant to add it to your shopping list.
        </p>
      </div>
    </PageContainer>
  );
}

function SavedRecipeCard({ recipe }: { recipe: SavedRecipe }) {
  const { remove } = useRecipeMutations();
  return (
    <li className="surface-card animate-fade-up p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold">{recipe.title}</h3>
        <div className="flex shrink-0 items-center gap-2">
          {recipe.minutes ? (
            <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary">
              {recipe.minutes} min
            </span>
          ) : null}
          <button
            type="button"
            aria-label="Remove recipe"
            onClick={() => remove.mutate(recipe.id)}
            className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {recipe.uses.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {recipe.uses.map((u) => (
            <span
              key={u}
              className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              {u}
            </span>
          ))}
        </div>
      )}

      <ol className="space-y-1.5">
        {recipe.steps.map((step, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
              {i + 1}
            </span>
            <span className="text-muted-foreground">{step}</span>
          </li>
        ))}
      </ol>
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
    <li className="surface-card animate-fade-up p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold">{recipe.title}</h3>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary">
            {recipe.minutes} min
          </span>
          <Button
            size="sm"
            variant={saved ? "secondary" : "default"}
            className="h-7 rounded-full px-3 text-[11px]"
            disabled={saved || saving}
            onClick={onSave}
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bookmark className="h-3 w-3" />}
            {saved ? "Saved" : "Save"}
          </Button>
        </div>
      </div>

      {recipe.priority.length > 0 && (
        <p className="mb-2 text-xs font-medium text-warning">
          Rescues: {recipe.priority.join(", ")}
        </p>
      )}

      {recipe.uses.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {recipe.uses.map((u) => (
            <span
              key={u}
              className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              {u}
            </span>
          ))}
        </div>
      )}

      {recipe.substitutions.length > 0 && (
        <div className="mb-3 rounded-2xl bg-muted/60 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Substitutions
          </p>
          <ul className="mt-1 space-y-0.5">
            {recipe.substitutions.map((sub) => (
              <li key={sub.missing} className="text-xs text-muted-foreground">
                No <span className="font-medium text-foreground">{sub.missing}</span> — use{" "}
                <span className="font-medium text-foreground">{sub.use}</span> instead
              </li>
            ))}
          </ul>
        </div>
      )}

      <ol className="space-y-1.5">
        {recipe.steps.map((step, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
              {i + 1}
            </span>
            <span className="text-muted-foreground">{step}</span>
          </li>
        ))}
      </ol>

      {recipe.savesWaste && (
        <p className="mt-3 rounded-xl bg-success/10 px-3 py-2 text-xs font-medium text-success">
          Saves waste: {recipe.savesWaste}
        </p>
      )}

      {recipe.note && <p className="mt-3 text-xs text-muted-foreground">{recipe.note}</p>}
    </li>
  );
}
