import { friendlyMessage } from "@/lib/errors";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, PageContainer, PageHeader } from "@/components/layout";
import { FoodThumb } from "@/components/food-thumb";
import { useShoppingItems, useShoppingMutations } from "@/lib/data";
import { CATEGORIES, UNITS, formatQty, guessCategory, type ShoppingItem } from "@/lib/freshtrack";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/shopping")({
  head: () => ({
    meta: [
      { title: "Shopping List — Plan Your Next Grocery Run | FreshTrack" },
      {
        name: "description",
        content:
          "Build a categorised grocery shopping list in FreshTrack, tick items off as you shop and clear them in one tap.",
      },
      { property: "og:title", content: "FreshTrack Shopping List" },
      {
        property: "og:description",
        content: "A categorised, tickable grocery list that lives next to your pantry.",
      },
    ],
  }),
  component: ShoppingPage,
});

function ShoppingPage() {
  const { data: items = [], isLoading } = useShoppingItems();
  const { add, toggle, remove } = useShoppingMutations();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Other");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("pcs");

  const grouped = useMemo(() => {
    const map = new Map<string, ShoppingItem[]>();
    for (const item of items) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const remaining = items.filter((i) => !i.checked).length;
  const checkedIds = items.filter((i) => i.checked).map((i) => i.id);

  async function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Enter an item name");
      return;
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    try {
      await add.mutateAsync({
        name: trimmed.slice(0, 80),
        category: category === "Other" ? guessCategory(trimmed) : category,
        quantity: qty,
        unit,
      });
      setName("");
      setQuantity("1");
      toast.success("Added to list");
    } catch (e) {
      toast.error(friendlyMessage(e, "Could not add item"));
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Shopping List"
        subtitle={
          items.length === 0
            ? "Add what you need before your next grocery run"
            : `${remaining} of ${items.length} still to buy`
        }
        action={
          checkedIds.length > 0 ? (
            <Button
              variant="secondary"
              className="rounded-2xl"
              onClick={async () => {
                await remove.mutateAsync(checkedIds);
                toast.success("Cleared purchased items");
              }}
            >
              <Check className="h-4 w-4" /> Clear done
            </Button>
          ) : undefined
        }
      />

      <div className="surface-card mb-5 p-4">
        <div className="mb-2 grid gap-2">
          <Input
            value={name}
            maxLength={80}
            placeholder="Add an item, e.g. Greek yogurt"
            className="h-12 rounded-2xl"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleAdd();
            }}
          />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <Input
            type="number"
            min="0"
            step="0.5"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="rounded-xl"
            aria-label="Quantity"
          />
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger className="rounded-xl" aria-label="Unit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="rounded-xl" aria-label="Category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="press rounded-xl" onClick={handleAdd} disabled={add.isPending}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="surface-card h-24 animate-pulse" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Your list is empty"
          description="Add the groceries you plan to buy. Automatic suggestions from your pantry are coming soon."
        />
      ) : (
        <div className="space-y-8">
          {grouped.map(([cat, list]) => (
            <section key={cat}>
              <h2 className="mb-3.5 px-1 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {cat}
              </h2>
              <ul className="flex flex-wrap gap-2.5">
                {list.map((item) => (
                  <li key={item.id} className="animate-pop">
                    <div
                      className={cn(
                        "surface-card press flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-2",
                        item.checked && "opacity-55",
                      )}
                    >
                      <button
                        type="button"
                        aria-label={`Mark ${item.name} as bought`}
                        aria-pressed={item.checked}
                        onClick={() => toggle.mutate({ id: item.id, checked: !item.checked })}
                        className="flex items-center gap-2.5"
                      >
                        <span className="relative">
                          <FoodThumb
                            name={item.name}
                            category={item.category}
                            className="h-9 w-9 rounded-full"
                            emojiClassName="text-base"
                          />
                          {item.checked && (
                            <span className="animate-pop absolute inset-0 flex items-center justify-center rounded-full bg-primary text-primary-foreground">
                              <Check className="h-4 w-4" />
                            </span>
                          )}
                        </span>
                        <span className="pr-1 text-left">
                          <span
                            className={cn(
                              "block text-[14px] font-medium leading-tight",
                              item.checked && "line-through",
                            )}
                          >
                            {item.name}
                          </span>
                          <span className="block text-[11.5px] text-muted-foreground">
                            {formatQty(Number(item.quantity), item.unit)}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${item.name}`}
                        onClick={() => remove.mutate([item.id])}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

    </PageContainer>
  );
}
