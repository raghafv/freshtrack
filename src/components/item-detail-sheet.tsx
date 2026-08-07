import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { FoodThumb } from "@/components/food-thumb";
import { StatusBadge } from "@/components/status-badge";
import { daysUntil, expiryText, formatQty, getStatus, type PantryItem } from "@/lib/freshtrack";

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

            <div className="max-h-[42vh] overflow-y-auto px-5">
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
