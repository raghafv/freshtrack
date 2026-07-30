import { friendlyMessage } from "@/lib/errors";
import { emojiFor } from "@/lib/emoji";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { ChefHat, Clock, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, PageContainer, PageHeader } from "@/components/layout";
import { usePantryItems, useSettings } from "@/lib/data";
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
        content: "Recipes generated from your real pantry, starting with ingredients closest to expiry.",
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
  const soonDays = settings?.expiry_reminder_days ?? 3;

  const priority = items
    .filter((i) => getStatus(i, soonDays) !== "fresh")
    .slice(0, 10);

  const gen = useMutation({
    mutationFn: () => suggestRecipes({}),
    onError: (e) => toast.error(friendlyMessage(e, "Could not generate recipes")),
  });

  const recipes = gen.data?.recipes ?? [];

  return (
    <PageContainer>
      <PageHeader
        title="Recipes"
        subtitle="Cook what's about to expire — generated from your live pantry."
        action={
          recipes.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl"
              onClick={() => gen.mutate()}
              disabled={gen.isPending}
            >
              <RefreshCw className="h-4 w-4" /> Redo
            </Button>
          ) : undefined
        }
      />

      <section className="surface-card mb-5 p-5">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">Cook-first ingredients</h2>
        </div>
        {priority.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing in your pantry needs cooking urgently right now. Items entering their last{" "}
            {soonDays} days will show up here.
          </p>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-foreground">
              These {priority.length} ingredient{priority.length === 1 ? "" : "s"} should be used
              first:
            </p>
            <div className="flex flex-wrap gap-2">
              {priority.map((i) => (
                <span
                  key={i.id}
                  className="rounded-full bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary"
                >
                  <span aria-hidden className="mr-1">
                    {emojiFor(i.name, i.category)}
                  </span>
                  {i.name} · {expiryText(i.expiry_date).toLowerCase()}
                </span>
              ))}
            </div>
          </>
        )}
      </section>

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
      ) : recipes.length === 0 ? (
        <div className="surface-card flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary">
            <ChefHat className="h-7 w-7" />
          </span>
          <h3 className="text-lg font-semibold">Cook from your pantry</h3>
          <p className="max-w-xs text-sm text-muted-foreground">
            FreshTrack will suggest meals using only your {items.length} tracked item
            {items.length === 1 ? "" : "s"}, starting with whatever expires first.
          </p>
          <Button
            className="press mt-2 h-12 rounded-2xl"
            onClick={() => gen.mutate()}
            disabled={gen.isPending}
          >
            {gen.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {gen.isPending ? "Reading your pantry…" : "Suggest recipes"}
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {recipes.map((r) => (
            <RecipeCard key={r.title} recipe={r} />
          ))}
        </ul>
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

function RecipeCard({ recipe }: { recipe: PantryRecipe }) {
  return (
    <li className="surface-card animate-fade-up p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold">{recipe.title}</h3>
        <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary">
          {recipe.minutes} min
        </span>
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
              <span aria-hidden className="mr-1">
                {emojiFor(u)}
              </span>
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
