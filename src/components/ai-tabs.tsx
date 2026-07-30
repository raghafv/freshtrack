import { Link } from "@tanstack/react-router";
import { ChefHat, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** Segmented switch between the two AI surfaces: chat and recipes. */
export function AiTabs({ active }: { active: "assistant" | "recipes" }) {
  const base =
    "press flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors";
  return (
    <nav className="mb-5 flex gap-1 rounded-3xl bg-muted/60 p-1">
      <Link
        to="/assistant"
        className={cn(
          base,
          active === "assistant" ? "bg-card text-primary shadow-sm" : "text-muted-foreground",
        )}
      >
        <Sparkles className="h-4 w-4" /> Chat
      </Link>
      <Link
        to="/recipes"
        className={cn(
          base,
          active === "recipes" ? "bg-card text-primary shadow-sm" : "text-muted-foreground",
        )}
      >
        <ChefHat className="h-4 w-4" /> Recipes
      </Link>
    </nav>
  );
}
