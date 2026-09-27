import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { FoodThumb } from "@/components/food-thumb";
import { StatusBadge } from "@/components/status-badge";
import { Lightbulb, Refrigerator, ShoppingCart, Snowflake, Package } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { friendlyMessage } from "@/lib/errors";
import { preservationTip } from "@/lib/preservation-tips";
import { useShoppingMutations, useUpdatePantryItem } from "@/lib/data";
import {
  STORAGE_TYPES,
  daysUntil,
  expiryText,
  formatQty,
  getStatus,
  type PantryItem,
  type StorageType,
} from "@/lib/freshtrack";

function prettyDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/50 py-3 last:border-none">
      <span className="text-[12.5px] text-muted-foreground">{label}</span>
      <span className="text-right text-[14px] font-medium">{value}</span>
    </div>
  );
}

const STORAGE_ICON: Record<StorageType, typeof Package> = {
  Fridge: Refrigerator,
  Freezer: Snowflake,
  Pantry: Package,
};

/**
 * Full-detail card for a single pantry item — opened by tapping an item's
 * photo or name anywhere in the app.
 */
export function ItemDetailSheet({
  item,
  soonDays = 3,
  onOpenChange,
}: {
  item: PantryItem | null;
  soonDays?: number;
  onOpenChange: (open: boolean) => void;
}) {
  const days = item ? daysUntil(item.expiry_date) : 0;
  const update = useUpdatePantryItem();
  const { add: addShopping } = useShoppingMutations();
  const tip = item ? preservationTip(item.name, item.category) : null;

  async function moveTo(storage: StorageType) {
    if (!item || item.storage === storage) return;
    try {
      await update.mutateAsync({ id: item.id, patch: { storage } });
      toast.success(`Moved to ${storage}`);
    } catch (e) {
      toast.error(friendlyMessage(e, "Could not move that item"));
    }
  }

  async function addToList() {
    if (!item) return;
    try {
      await addShopping.mutateAsync({
        name: item.name,
        category: item.category,
        quantity: 1,
        unit: item.unit,
      });
      toast.success(`${item.name} added to your shopping list`);
    } catch (e) {
      toast.error(friendlyMessage(e, "Could not add to your list"));
    }
  }

  return (
    <Drawer open={Boolean(item)} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-[2rem] border-none pb-10">
        {item && (
          <>
            <div className="px-5 pt-2">
              <FoodThumb
                name={item.name}
                category={item.category}
                imageUrl={item.image_url}
                className="h-56 w-full rounded-[1.75rem]"
                emojiClassName="text-7xl"
              />
            </div>

            <DrawerHeader className="px-5 pb-1 pt-5 text-left">
              <DrawerTitle className="flex items-center gap-2.5 text-[24px] tracking-[-0.03em]">
                <span className="min-w-0 truncate">{item.name}</span>
                <StatusBadge status={getStatus(item, soonDays)} />
              </DrawerTitle>
              <DrawerDescription className="text-[13px]">
                {item.brand ? `${item.brand} · ` : ""}
                {item.category} · {expiryText(item.expiry_date)}
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-5 pb-1 pt-3">
              <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Move it
              </p>
              <div className="flex gap-2">
                {STORAGE_TYPES.map((s) => {
                  const Icon = STORAGE_ICON[s];
                  const active = item.storage === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={update.isPending}
                      onClick={() => void moveTo(s)}
                      aria-pressed={active}
                      className={cn(
                        "press flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border text-[13.5px] font-medium transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.8} /> {s}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={addShopping.isPending}
                onClick={() => void addToList()}
                className="press mt-2.5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary-soft text-[13.5px] font-semibold text-primary"
              >
                <ShoppingCart className="h-4 w-4" strokeWidth={1.9} /> Add to shopping list
              </button>
            </div>

            {tip && (
              <div className="mx-5 mt-3 flex gap-3 rounded-2xl bg-muted/60 p-4">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.8} />
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">{tip}</p>
              </div>
            )}

            <div className="mt-2 max-h-[34vh] overflow-y-auto px-5">
              <Row label="Quantity left" value={formatQty(Number(item.quantity), item.unit)} />
              <Row label="Stored in" value={item.storage} />
              <Row label="Added to pantry" value={prettyDate(item.created_at?.slice(0, 10))} />
              <Row label="Purchased on" value={prettyDate(item.purchase_date)} />
              <Row label="Expires on" value={prettyDate(item.expiry_date)} />
              <Row
                label="Days remaining"
                value={days < 0 ? `${Math.abs(days)} days overdue` : `${days} days`}
              />
              <Row
                label="Cost estimate"
                value={item.price != null ? `₹${Number(item.price).toFixed(0)}` : "Not recorded"}
              />
              <Row label="Added via" value={item.source ?? "manual"} />
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
