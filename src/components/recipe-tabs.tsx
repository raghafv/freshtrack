import { cn } from "@/lib/utils";

export type RecipeTab = "cook" | "saved";

/** Segmented switch between writing a new recipe and the saved recipe book. */
export function RecipeTabs({
  active,
  onChange,
}: {
  active: RecipeTab;
  onChange: (tab: RecipeTab) => void;
}) {
  const base =
    "press flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors";
  return (
    <nav className="mb-5 flex gap-1 rounded-3xl bg-muted/60 p-1">
      <button
        type="button"
        onClick={() => onChange("cook")}
        className={cn(
          base,
          active === "cook" ? "bg-card text-primary shadow-sm" : "text-muted-foreground",
        )}
      >
        Cook
      </button>
      <button
        type="button"
        onClick={() => onChange("saved")}
        className={cn(
          base,
          active === "saved" ? "bg-card text-primary shadow-sm" : "text-muted-foreground",
        )}
      >
        Saved recipes
      </button>
    </nav>
  );
}
