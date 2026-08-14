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
import { categoryEmoji } from "@/lib/emoji";
import { FoodThumb } from "@/components/food-thumb";
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

const CATEGORY_QUICK_PICK = [
  { name: "Fruits", hint: "fresh, seasonal, snackable" },
  { name: "Vegetables", hint: "daily cooking basics" },
  { name: "Dairy", hint: "milk, curd, paneer, butter" },
  { name: "Meat & Seafood", hint: "protein and frozen cuts" },
  { name: "Grains & Pasta", hint: "rice, flour, noodles" },
  { name: "Bakery", hint: "bread, buns, rolls" },
  { name: "Snacks", hint: "quick bites and treats" },
  { name: "Spices", hint: "masalas, seasoning, heat" },
] as const;

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

  function selectCategory(category: string) {
    setActiveCategory(category);
    setQuery("");
    setSelected(null);
  }

  const suggestedExpiry = selected ? expiryForProduct(selected, storage, purchaseDate) : "";
  const unusual = selected ? isUnusualStorage(selected, storage) : false;

  // The suggested date is only a starting point — the user can override it, and
  // it re-syncs whenever the product, storage or purchase date changes.
  const [expiry, setExpiry] = useState("");
  /** Optional rupee value of the item, used for waste-cost insights. */
  const [price, setPrice] = useState("");
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
    if (!expiry) {
      toast.error("Pick an expiry date");
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
        price: price.trim() && Number.isFinite(Number(price)) ? Number(price) : null,
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
      <div className="press grid min-h-24 grid-cols-[5rem_1fr_auto] gap-3 rounded-3xl border border-border/60 bg-card/70 p-3 transition-colors hover:bg-accent/40">
        <button
          type="button"
          onClick={() => pick(product)}
          className="col-span-2 flex min-w-0 items-center gap-3 text-left"
        >
          <FoodThumb
            name={product.name}
            category={product.category}
            className="h-14 w-14 rounded-2xl"
            emojiClassName="text-2xl"
          />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[15px] font-semibold leading-tight">{product.name}</span>
            <span className="text-[12px] text-muted-foreground">
              {product.category} · {product.storage} · {shelfLifeDays(product, product.storage)}d
            </span>
            <span className="text-[11px] text-muted-foreground/80">Tap to prefill quantity and storage.</span>
          </span>
        </button>
        <Button
          size="icon"
          variant="ghost"
          aria-label={fav ? `Remove ${product.name} from favourites` : `Favourite ${product.name}`}
          className="h-10 w-10 shrink-0 rounded-2xl"
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
                <FoodThumb
                  name={selected.name}
                  category={selected.category}
                  className="h-8 w-8 rounded-xl"
                  emojiClassName="text-base"
                />
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

              <div className="grid gap-2">
                <Label htmlFor="qa-expiry">Expires on</Label>
                <Input
                  id="qa-expiry"
                  type="date"
                  className="h-11"
                  value={expiry}
                  min={purchaseDate}
                  onChange={(e) => setExpiry(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  {expiry
                    ? `${expiryText(expiry)} — edit it if the pack says otherwise.`
                    : "Pick the best-before date from the pack."}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="qa-price">Value ₹ (optional)</Label>
                <Input
                  id="qa-price"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  placeholder="e.g. 120"
                  className="h-11"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>

              {unusual && (
                <p className="rounded-2xl bg-warning/15 px-4 py-3 text-xs font-medium text-warning">
                  {storage} isn&apos;t the usual place for {selected.name.toLowerCase()}. We&apos;ve
                  estimated a shorter shelf life — you can still save it.
                </p>
              )}
            </div>

            <div className="mt-2 flex items-center justify-end gap-2">
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

            <div className="grid gap-2 sm:grid-cols-2">
              {CATEGORY_QUICK_PICK.map((c) => {
                const active = activeCategory === c.name;
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => selectCategory(c.name)}
                    className={cn(
                      "press flex min-h-24 items-start justify-between rounded-3xl border p-4 text-left transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 bg-card/60 hover:bg-accent/40",
                    )}
                  >
                    <span className="flex flex-col gap-1">
                      <span className="text-base font-semibold">{categoryEmoji(c.name)} {c.name}</span>
                      <span className={cn("text-xs", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                        {c.hint}
                      </span>
                    </span>
                    <span className={cn("text-xs font-medium", active ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      Browse
                    </span>
                  </button>
                );
              })}
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
