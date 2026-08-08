import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Loader2, Minus, Plus, Search, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { categoryEmoji, emojiFor } from "@/lib/emoji";
import { friendlyMessage } from "@/lib/errors";
import { useSmartAdd } from "@/lib/smart-add";
import { DuplicateMergeDialog } from "@/components/duplicate-merge-dialog";
import { useAuth } from "@/lib/auth";
import { STORAGE_TYPES, expiryText, toISODate } from "@/lib/freshtrack";
import {
  CATALOG_CATEGORIES,
  GROCERY_CATALOG,
  expiryForProduct,
  isUnusualStorage,
  popularProducts,
  recommendedStorages,
  searchCatalog,
  shelfLifeDays,
  type GroceryProduct,
} from "@/lib/grocery-catalog";
import {
  frequentProducts,
  readQuickAdd,
  recordAdd,
  resolveMany,
  toggleFavorite,
  writeQuickAdd,
  type QuickAddState,
} from "@/lib/quick-add-store";
import type { ItemFormPrefill } from "@/components/item-form-dialog";
import { MeasureInput } from "@/components/measure-input";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStorage?: string;
  defaultUnit?: string;
  /** Escape hatch: open the full manual form with these values prefilled. */
  onDetails: (prefill?: ItemFormPrefill) => void;
  /** Called after a catalog product is stored, so callers can remember it. */
  onAdded?: (product: GroceryProduct, storage: string) => void;
}

export function QuickAddDialog({
  open,
  onOpenChange,
  defaultStorage = "Fridge",
  defaultUnit = "pcs",
  onDetails,
  onAdded,
}: Props) {
  const { user } = useAuth();
  const smartAdd = useSmartAdd();
  const searchRef = useRef<HTMLInputElement>(null);

  const [store, setStore] = useState<QuickAddState>({ favorites: [], recents: [], counts: {} });
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selected, setSelected] = useState<GroceryProduct | null>(null);

  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState<string>(defaultUnit);

  const [purchaseDate, setPurchaseDate] = useState(toISODate(new Date()));
  const [storage, setStorage] = useState<string>(defaultStorage);

  useEffect(() => {
    if (!open) return;
    setStore(readQuickAdd(user?.id));
    setQuery("");
    setActiveCategory("all");
    setSelected(null);
    setTimeout(() => searchRef.current?.focus(), 80);
  }, [open, user?.id]);

  function persist(next: QuickAddState) {
    setStore(next);
    writeQuickAdd(user?.id, next);
  }

  function pick(product: GroceryProduct) {
    setSelected(product);
    setQuantity("1");
    setUnit(product.form === "count" ? "pcs" : product.unit);
    setPurchaseDate(toISODate(new Date()));
    setStorage(product.storage);
  }

  const results = useMemo(() => (query ? searchCatalog(query) : []), [query]);
  const favorites = useMemo(() => resolveMany(store.favorites), [store.favorites]);
  const recents = useMemo(() => resolveMany(store.recents), [store.recents]);
  const frequent = useMemo(() => frequentProducts(store), [store]);
  const popular = useMemo(() => popularProducts(12), []);
  const categoryItems = useMemo(
    () =>
      activeCategory === "all" ? [] : GROCERY_CATALOG.filter((p) => p.category === activeCategory),
    [activeCategory],
  );

  const suggestedExpiry = selected ? expiryForProduct(selected, storage, purchaseDate) : "";
  const unusual = selected ? isUnusualStorage(selected, storage) : false;

  // The suggested date is only a starting point — the user can override it, and
  // it re-syncs whenever the product, storage or purchase date changes.
  const [expiry, setExpiry] = useState("");
  useEffect(() => {
    setExpiry(suggestedExpiry);
  }, [suggestedExpiry]);

  async function handleSave() {
    if (!selected) return;
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    try {
      const result = await smartAdd.submit({
        name: selected.name,
        brand: null,
        category: selected.category,
        quantity: qty,
        unit: unit || selected.unit || defaultUnit,
        purchase_date: purchaseDate,
        expiry_date: expiry,
        storage,
        image_url: null,
        source: "quick-add",
        price: null,
      });
      persist(recordAdd(store, selected.id));
      if (result) {
        onAdded?.(selected, storage);
        toast.success(
          result.outcome === "merged"
            ? result.message
            : `${selected.name} added · ${expiryText(expiry).toLowerCase()}`,
        );
        onOpenChange(false);
      }
    } catch (e) {
      toast.error(friendlyMessage(e, "Could not save item"));
    }
  }

  function ProductRow({ product }: { product: GroceryProduct }) {
    const fav = store.favorites.includes(product.id);
    return (
      <div className="press flex items-center gap-2 rounded-2xl border border-border/60 bg-card/60 pr-1 transition-colors hover:bg-accent/40">
        <button
          type="button"
          onClick={() => pick(product)}
          className="flex min-h-12 flex-1 items-center gap-2 px-3 py-2 text-left"
        >
          <span aria-hidden className="text-lg leading-none">
            {emojiFor(product.name, product.category)}
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-semibold leading-tight">{product.name}</span>
            <span className="text-[11px] text-muted-foreground">
              {product.category} · {product.storage} · {shelfLifeDays(product, product.storage)}d
            </span>
          </span>
        </button>
        <Button
          size="icon"
          variant="ghost"
          aria-label={fav ? `Remove ${product.name} from favourites` : `Favourite ${product.name}`}
          className="h-9 w-9 shrink-0 rounded-xl"
          onClick={() => persist(toggleFavorite(store, product.id))}
        >
          <Star className={cn("h-4 w-4", fav && "fill-primary text-primary")} />
        </Button>
      </div>
    );
  }

  function Section({ title, items }: { title: string; items: GroceryProduct[] }) {
    if (items.length === 0) return null;
    return (
      <div className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((p) => (
            <ProductRow key={`${title}-${p.id}`} product={p} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden rounded-3xl sm:max-w-lg">
        {selected ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Back to product list"
                  className="-ml-2 h-8 w-8 rounded-xl"
                  onClick={() => setSelected(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span aria-hidden>{emojiFor(selected.name, selected.category)}</span>
                {selected.name}
              </DialogTitle>
              <DialogDescription>
                {selected.category} · expiry calculated automatically from storage.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 overflow-y-auto py-1">
              <MeasureInput
                id="qa-qty"
                label="Quantity"
                form={selected.form}
                value={quantity}
                unit={unit}
                onValueChange={setQuantity}
                onUnitChange={setUnit}
              />

              <div className="grid gap-2">
                <Label>Storage</Label>
                <div className="grid grid-cols-3 gap-2">
                  {STORAGE_TYPES.map((s) => {
                    const active = storage === s;
                    const recommended = recommendedStorages(selected).includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStorage(s)}
                        className={cn(
                          "press rounded-xl border px-2 py-2.5 text-sm font-medium transition-colors",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/60 bg-card/60 hover:bg-accent/40",
                        )}
                      >
                        {s}
                        <span className="block text-[10px] font-normal opacity-75">
                          {recommended ? `${shelfLifeDays(selected, s)} days` : "unusual"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="qa-purchase">Purchase date</Label>
                <Input
                  id="qa-purchase"
                  type="date"
                  className="h-11"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
              </div>

              <div className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3">
                <p className="text-xs text-muted-foreground">Expires on</p>
                <p className="text-base font-semibold">
                  {expiry} <span className="text-muted-foreground">· {expiryText(expiry)}</span>
                </p>
              </div>

              {unusual && (
                <p className="rounded-2xl bg-warning/15 px-4 py-3 text-xs font-medium text-warning">
                  {storage} isn&apos;t the usual place for {selected.name.toLowerCase()}. We&apos;ve
                  estimated a shorter shelf life — you can still save it.
                </p>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                className="rounded-xl"
                onClick={() => {
                  onOpenChange(false);
                  onDetails({
                    name: selected.name,
                    category: selected.category,
                    storage,
                    unit,
                    quantity: Number(quantity) || 1,
                    source: "quick-add",
                  });
                }}
              >
                More details
              </Button>
              <Button
                className="press rounded-xl"
                onClick={handleSave}
                disabled={smartAdd.isPending}
              >
                {smartAdd.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Add to pantry
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add to pantry</DialogTitle>
              <DialogDescription>
                Pick a product — category, unit, storage and shelf life are already known.
              </DialogDescription>
            </DialogHeader>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search 200+ groceries"
                className="h-11 rounded-2xl pl-9"
              />
            </div>

            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {["all", ...CATALOG_CATEGORIES].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActiveCategory(c)}
                  className={cn(
                    "press shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    activeCategory === c
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 bg-card/60 hover:bg-accent/40",
                  )}
                >
                  {c === "all" ? "All" : `${categoryEmoji(c)} ${c}`}
                </button>
              ))}
            </div>

            <div className="-mx-1 flex-1 overflow-y-auto px-1">
              {query ? (
                results.length ? (
                  <Section title={`Results (${results.length})`} items={results} />
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No match in the built-in catalog.
                  </p>
                )
              ) : activeCategory !== "all" ? (
                <Section title={activeCategory} items={categoryItems} />
              ) : (
                <>
                  <Section title="Favourites" items={favorites} />
                  <Section title="Frequently added" items={frequent} />
                  <Section title="Recent items" items={recents} />
                  <Section title="Popular items" items={popular} />
                </>
              )}
            </div>

            <Button
              variant="secondary"
              className="press mt-1 rounded-2xl"
              onClick={() => {
                onOpenChange(false);
                onDetails(query ? { name: query.trim() } : undefined);
              }}
            >
              <Sparkles className="h-4 w-4" />
              Add custom item
            </Button>
          </>
        )}
      </DialogContent>

      <DuplicateMergeDialog
        pending={smartAdd.pending}
        busy={smartAdd.isPending}
        onCancel={smartAdd.cancel}
        onMerge={async () => {
          const r = await smartAdd.confirmMerge();
          if (r) {
            toast.success(r.message);
            onOpenChange(false);
          }
        }}
        onKeepSeparate={async () => {
          const r = await smartAdd.keepSeparate();
          if (r) {
            toast.success(r.message);
            onOpenChange(false);
          }
        }}
      />
    </Dialog>
  );
}
