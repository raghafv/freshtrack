import { createFileRoute, Link } from "@tanstack/react-router";
import { ChefHat, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, PageContainer, PageHeader } from "@/components/layout";
import { usePantryItems, useSettings } from "@/lib/data";
import { getStatus } from "@/lib/freshtrack";

export const Route = createFileRoute("/_shell/recipes")({
  head: () => ({
    meta: [
      { title: "Recipes — Cook What You Already Own | FreshTrack" },
      {
        name: "description",
        content:
          "FreshTrack recipe suggestions built around the groceries in your pantry that need using first.",
      },
      { property: "og:title", content: "FreshTrack Recipes" },
      {
        property: "og:description",
        content: "Recipe ideas based on the ingredients closest to expiry in your pantry.",
      },
    ],
  }),
  component: RecipesPage,
});

function RecipesPage() {
  const { data: items = [] } = usePantryItems();
  const { data: settings } = useSettings();
  const soonDays = settings?.expiry_reminder_days ?? 3;

  const priority = items
    .filter((i) => getStatus(i, soonDays) === "soon")
    .slice(0, 8);

  return (
    <PageContainer>
      <PageHeader
        title="Recipes"
        subtitle="Cook what's about to expire — AI suggestions are coming soon."
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
                  {i.name}
                </span>
              ))}
            </div>
          </>
        )}
      </section>

      <EmptyState
        icon={ChefHat}
        title="Recipe recommendations coming soon"
        description="FreshTrack will match your live pantry contents against recipes so you can cook before food spoils. Keep your pantry up to date and you'll get suggestions the moment this switches on."
        action={
          <Button asChild variant="secondary" className="mt-2 rounded-2xl">
            <Link to="/pantry">Review my pantry</Link>
          </Button>
        }
      />

      <div className="surface-card mt-5 flex items-start gap-3 p-4">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Planned: ingredient matching, missing-item detection that feeds your shopping list, and
          step-by-step cooking mode.
        </p>
      </div>
    </PageContainer>
  );
}
