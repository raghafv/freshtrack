import { useMemo, useState } from "react";
import { ChefHat, Clock, ShoppingCart, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePantryItems, useShoppingMutations } from "@/lib/data";
import { CURATED_RECIPES, matchRecipe, recipeUses, type CuratedRecipe } from "@/lib/curated-recipes";

/** Offline cookbook: 29 tested recipes ranked by what is already in the pantry. */
export function Cookbook() {
  const { data: items = [] } = usePantryItems();
  const pantry = useMemo(() => items.map((i) => i.name), [items]);
  const [picked, setPicked] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const suggestions = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return [...new Set(pantry)].filter((n) => n.toLowerCase().includes(t) && !picked.includes(n)).slice(0, 6);
  }, [q, pantry, picked]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return CURATED_RECIPES.map((r) => ({ r, m: matchRecipe(r, pantry) }))
      .filter(({ r }) => picked.every((p) => recipeUses(r, p)))
      .filter(({ r }) => !t || suggestions.length > 0 || r.title.toLowerCase().includes(t) || recipeUses(r, t))
      .sort((a, b) => b.m.score - a.m.score);
  }, [pantry, picked, q, suggestions.length]);

  return (
    <section>
      <div className="surface-card mb-5 p-5">
        <h2 className="text-[17px] font-semibold tracking-[-0.02em]">Cookbook</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          29 home recipes, works offline. Sorted by how much you already have.
        </p>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a dish or pantry ingredient"
          className="mt-4 h-11 rounded-2xl"
        />
        {suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                className="press rounded-full bg-muted px-3 py-1.5 text-[13px]"
                onClick={() => { setPicked((p) => [...p, s]); setQ(""); }}
              >
                + {s}
              </button>
            ))}
          </div>
        )}
        {picked.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {picked.map((p) => (
              <button
                key={p}
                type="button"
                className="press inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[13px] text-primary-foreground"
                onClick={() => setPicked((x) => x.filter((y) => y !== p))}
              >
                {p} <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}
      </div>

      {list.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">No recipe uses all of those together.</p>
      )}
      <ul className="space-y-3">
        {list.map(({ r, m }) => (
          <CookbookCard key={r.title} r={r} m={m} open={open === r.title}
            onToggle={() => setOpen(open === r.title ? null : r.title)} />
        ))}
      </ul>
    </section>
  );
}

function CookbookCard({ r, m, open, onToggle }: {
  r: CuratedRecipe; m: ReturnType<typeof matchRecipe>; open: boolean; onToggle: () => void;
}) {
  const shop = useShoppingMutations();
  const [busy, setBusy] = useState(false);

  async function addMissing() {
    setBusy(true);
    try {
      for (const name of m.missing) {
        await shop.add.mutateAsync({ name, category: "Other", quantity: 1, unit: "pcs" });
      }
      toast.success(`Added ${m.missing.length} item${m.missing.length === 1 ? "" : "s"} to your shopping list`);
    } catch {
      toast.error("Could not add to shopping list");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="surface-card overflow-hidden">
      <button type="button" onClick={onToggle} className="w-full p-5 text-left">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <span>{r.cuisine}</span>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-0.5 normal-case tracking-normal">
            <Clock className="h-3 w-3" /> {r.minutes} min
          </span>
        </div>
        <h3 className="mt-2 text-[16px] font-semibold tracking-[-0.02em]">{r.title}</h3>
        <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">{r.description}</p>
        <div className="mt-3 flex items-center gap-2 text-[12px]">
          <span className={cn("rounded-full px-2.5 py-0.5 font-semibold",
            m.percent >= 70 ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
            {m.percent}% in your pantry
          </span>
          {m.missing.length > 0 && <span className="text-muted-foreground">Missing {m.missing.length}</span>}
        </div>
      </button>

      {open && (
        <div className="border-t border-border/50 p-5">
          <p className="text-[12px] text-muted-foreground">
            Prep {r.prepMinutes} min · Cook {r.cookMinutes} min · Serves {r.servings} · {r.difficulty}
          </p>
          <h4 className="mt-4 text-[13px] font-semibold">Ingredients</h4>
          <ul className="mt-2 space-y-1 text-[13px]">
            {r.ingredients.map((i) => (
              <li key={i.name} className={cn(m.missing.includes(i.name) && "text-muted-foreground")}>
                {m.have.includes(i.name) ? "✓ " : "• "}
                <span className="font-medium">{i.name}</span> · {i.amount}
              </li>
            ))}
          </ul>
          {m.missing.length > 0 && (
            <Button variant="outline" className="press mt-4 h-11 w-full rounded-2xl" disabled={busy} onClick={addMissing}>
              <ShoppingCart className="h-4 w-4" /> Add {m.missing.length} missing to shopping list
            </Button>
          )}
          <h4 className="mt-5 flex items-center gap-1.5 text-[13px] font-semibold"><ChefHat className="h-4 w-4" /> Method</h4>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-[13px] leading-relaxed">
            {r.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
          {r.tips && r.tips.length > 0 && (
            <>
              <h4 className="mt-5 text-[13px] font-semibold">Tips</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-muted-foreground">
                {r.tips.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </>
          )}
        </div>
      )}
    </li>
  );
}
