import { useMemo, useState } from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ChefHat, Clock, Flame, ShoppingCart, Sparkles, Users, X } from "lucide-react";
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
          <CookbookCard key={r.title} r={r} m={m} onOpen={() => setOpen(r.title)} />
        ))}
      </ul>
      {(() => {
        const sel = list.find((x) => x.r.title === open);
        return sel && typeof document !== "undefined"
          ? createPortal(<RecipeDetail r={sel.r} m={sel.m} onClose={() => setOpen(null)} />, document.body)
          : null;
      })()}
    </section>
  );
}

function inferMethod(r: CuratedRecipe): string {
  const t = (r.title + " " + r.steps.join(" ")).toLowerCase();
  if (/pressure cook|whistle/.test(t)) return "Pressure cook";
  if (/deep fry|deep-fry/.test(t)) return "Deep fry";
  if (/bake|oven/.test(t)) return "Bake";
  if (/knead|roll out|tawa|griddle/.test(t)) return "Tawa";
  if (/simmer|boil/.test(t)) return "Simmer";
  if (/tadka|temper/.test(t)) return "Tadka";
  if (/saut|stir|fry/.test(t)) return "Pan-saute";
  return "No-cook";
}

function CookbookCard({ r, m, onOpen }: {
  r: CuratedRecipe; m: ReturnType<typeof matchRecipe>; onOpen: () => void;
}) {
  return (
    <li className="surface-card overflow-hidden">
      <button type="button" onClick={onOpen} className="press flex w-full items-center gap-4 p-4 text-left">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-muted">
          <Flame className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold tracking-[-0.02em]">{r.title}</span>
          <span className="mt-0.5 block text-[12px] text-muted-foreground">
            {r.minutes} min · {r.difficulty} · {r.cuisine}
          </span>
          <span className={cn("mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
            m.percent >= 70 ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
            {m.percent}% in your pantry
          </span>
        </span>
      </button>
    </li>
  );
}

function RecipeDetail({ r, m, onClose }: {
  r: CuratedRecipe; m: ReturnType<typeof matchRecipe>; onClose: () => void;
}) {
  const shop = useShoppingMutations();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

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

  const stats = [
    { icon: Flame, label: "Method", value: inferMethod(r) },
    { icon: Clock, label: "Time", value: `${r.minutes} min` },
    { icon: Sparkles, label: "Pantry", value: `${m.have.length} / ${r.ingredients.length} items` },
  ];

  return (
    <div role="dialog" aria-modal="true" aria-label={r.title}
      className="fixed inset-0 z-[60] h-[100dvh] overflow-y-auto overscroll-contain bg-background [-webkit-overflow-scrolling:touch]">
      <div className="mx-auto max-w-2xl pb-28">
        <div className="sticky top-0 z-10 flex items-center bg-background/90 px-4 py-3 backdrop-blur">
          <button type="button" onClick={onClose} aria-label="Back to cookbook"
            className="press inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-2 text-[13px] font-medium">
            <ArrowLeft className="h-4 w-4" /> Cookbook
          </button>
        </div>

        <header className="flex items-center gap-4 bg-muted/60 px-5 py-6">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-background">
            <Flame className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[20px] font-semibold leading-tight tracking-[-0.02em]">{r.title}</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">{r.minutes} min · {r.difficulty} · {r.cuisine}</p>
          </div>
        </header>

        <div className="px-5">
          <p className="mt-5 text-[14px] leading-relaxed text-muted-foreground">{r.description}</p>

          <div className="-mx-5 mt-5 flex gap-4 overflow-x-auto px-5 pb-1">
            {r.ingredients.map((i) => {
              const have = m.have.includes(i.name);
              return (
                <div key={i.name} className="flex w-16 shrink-0 flex-col items-center text-center">
                  <span className={cn("relative flex h-14 w-14 items-center justify-center rounded-full border-2 text-[17px] font-semibold",
                    have ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground")}>
                    {i.name.trim().charAt(0).toUpperCase()}
                    {have && <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-primary" />}
                  </span>
                  <span className="mt-1.5 line-clamp-2 text-[11px] leading-tight">{i.name}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2.5">
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-2xl bg-muted/70 p-3">
                <Icon className="h-4 w-4" />
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
                <p className="mt-0.5 text-[13px] font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <p className="mt-4 flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> Serves {r.servings} · Prep {r.prepMinutes} min · Cook {r.cookMinutes} min
          </p>

          <h3 className="mt-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ingredients</h3>
          <ul className="mt-2 divide-y divide-border/50">
            {r.ingredients.map((i) => (
              <li key={i.name} className="flex items-center justify-between py-2 text-[14px]">
                <span className={cn(m.missing.includes(i.name) && "text-muted-foreground")}>{i.name}</span>
                <span className="text-[13px] text-muted-foreground">{i.amount}</span>
              </li>
            ))}
          </ul>

          {m.missing.length > 0 && (
            <>
              <h3 className="mt-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Missing</h3>
              <p className="mt-1.5 text-[14px] text-muted-foreground">{m.missing.join(", ")}</p>
              <Button variant="outline" className="press mt-3 h-11 w-full rounded-2xl" disabled={busy} onClick={addMissing}>
                <ShoppingCart className="h-4 w-4" /> Add {m.missing.length} missing to shopping list
              </Button>
            </>
          )}

          <h3 className="mt-7 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <ChefHat className="h-4 w-4" /> Method
          </h3>
          <ol className="mt-3 space-y-3">
            {r.steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-[14px] leading-relaxed">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[12px] font-semibold">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>

          {r.tips && r.tips.length > 0 && (
            <div className="mt-7 rounded-2xl bg-muted/60 p-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tips</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px]">
                {r.tips.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
