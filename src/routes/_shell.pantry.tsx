import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowDownUp,
  CheckSquare,
  Package,
  Pencil,
  Plus,
  Search,
  Square,
  Trash2,
  X,
} from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState, PageContainer, PageHeader } from "@/components/layout";
import { StatusBadge } from "@/components/status-badge";
import { ItemFormDialog, type ItemFormPrefill } from "@/components/item-form-dialog";
import { QuickAddDialog } from "@/components/quick-add-dialog";
import { useDeletePantryItems, usePantryItems, useSettings } from "@/lib/data";
import {
  CATEGORIES,
  STORAGE_TYPES,
  expiryText,
  formatQty,
  getStatus,
  type PantryItem,
} from "@/lib/freshtrack";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/pantry")({
  head: () => ({
    meta: [
      { title: "My Pantry — FreshTrack Inventory" },
      {
        name: "description",
        content:
          "Search, filter, sort, edit and remove everything in your pantry, fridge and freezer with FreshTrack.",
      },
      { property: "og:title", content: "My Pantry — FreshTrack" },
      {
        property: "og:description",
        content: "Your complete grocery inventory with live expiry status.",
      },
    ],
  }),
  component: PantryPage,
});

type SortKey = "expiry" | "name" | "added" | "category";

function PantryPage() {
  const { data: items = [], isLoading } = usePantryItems();
  const { data: settings } = useSettings();
  const deleteItems = useDeletePantryItems();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [storage, setStorage] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<SortKey>("expiry");
  const [selected, setSelected] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [editing, setEditing] = useState<PantryItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [prefill, setPrefill] = useState<ItemFormPrefill | undefined>();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const soonDays = settings?.expiry_reminder_days ?? 3;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((i) => {
      if (q && !`${i.name} ${i.brand ?? ""}`.toLowerCase().includes(q)) return false;
      if (category !== "all" && i.category !== category) return false;
      if (storage !== "all" && i.storage !== storage) return false;
      if (status !== "all" && getStatus(i, soonDays) !== status) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "category") return a.category.localeCompare(b.category);
      if (sort === "added") return b.created_at.localeCompare(a.created_at);
      return a.expiry_date.localeCompare(b.expiry_date);
    });
  }, [items, query, category, storage, status, sort, soonDays]);

  function toggleSelect(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleDelete(ids: string[]) {
    const targets = items.filter((i) => ids.includes(i.id)).map((i) => ({ id: i.id, name: i.name }));
    try {
      await deleteItems.mutateAsync(targets);
      toast.success(`${targets.length} item${targets.length > 1 ? "s" : ""} deleted`);
      setSelected([]);
      setSelectMode(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    }
  }

  const filtersActive = query || category !== "all" || storage !== "all" || status !== "all";

  return (
    <PageContainer>
      <PageHeader
        title="My Pantry"
        subtitle={`${items.length} item${items.length === 1 ? "" : "s"} tracked`}
        action={
          <Button
            className="press rounded-2xl"
            onClick={() => {
              setEditing(null);
              setQuickOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add
          </Button>
        }
      />

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search items or brands"
          className="h-12 rounded-2xl pl-9"
          maxLength={60}
        />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={storage} onValueChange={setStorage}>
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="Storage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All storage</SelectItem>
            {STORAGE_TYPES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="fresh">Fresh</SelectItem>
            <SelectItem value="soon">Use soon</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="rounded-xl">
            <ArrowDownUp className="h-3.5 w-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expiry">Expiry date</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="added">Recently added</SelectItem>
            <SelectItem value="category">Category</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {items.length > 0 && (
        <div className="mb-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl"
            onClick={() => {
              setSelectMode((m) => !m);
              setSelected([]);
            }}
          >
            {selectMode ? <X className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
            {selectMode ? "Cancel" : "Select"}
          </Button>
          {selectMode && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl"
                onClick={() =>
                  setSelected(selected.length === visible.length ? [] : visible.map((i) => i.id))
                }
              >
                {selected.length === visible.length ? "Clear all" : "Select all"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="rounded-xl"
                disabled={selected.length === 0}
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="h-4 w-4" /> Delete ({selected.length})
              </Button>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface-card h-24 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Your pantry is empty"
          description="Add your groceries manually or scan them with your camera to start tracking expiry dates."
          action={
            <Button
              className="press mt-2 rounded-2xl"
              onClick={() => {
                setEditing(null);
                setQuickOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add first item
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matches"
          description={
            filtersActive
              ? "Try clearing your search or filters to see more items."
              : "Nothing here yet."
          }
          action={
            <Button
              variant="secondary"
              className="mt-2 rounded-2xl"
              onClick={() => {
                setQuery("");
                setCategory("all");
                setStorage("all");
                setStatus("all");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((item) => {
            const s = getStatus(item, soonDays);
            const isSelected = selected.includes(item.id);
            return (
              <li
                key={item.id}
                className={cn(
                  "surface-card animate-pop flex items-center gap-3 p-3 transition-colors",
                  isSelected && "ring-2 ring-primary",
                )}
              >
                {selectMode && (
                  <button
                    onClick={() => toggleSelect(item.id)}
                    aria-label={isSelected ? "Deselect item" : "Select item"}
                    className="shrink-0 text-primary"
                  >
                    {isSelected ? (
                      <CheckSquare className="h-5 w-5" />
                    ) : (
                      <Square className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                )}

                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    loading="lazy"
                    className="h-14 w-14 shrink-0 rounded-2xl object-cover"
                  />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                    <Package className="h-6 w-6" />
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">{item.name}</p>
                    <StatusBadge status={s} />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.brand ? `${item.brand} · ` : ""}
                    {item.category} · {formatQty(Number(item.quantity), item.unit)} · {item.storage}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                    {expiryText(item.expiry_date)}
                  </p>
                </div>

                {!selectMode && (
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Edit ${item.name}`}
                      className="h-8 w-8 rounded-xl"
                      onClick={() => {
                        setEditing(item);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Delete ${item.name}`}
                      className="h-8 w-8 rounded-xl text-destructive"
                      onClick={() => {
                        setSelected([item.id]);
                        setConfirmOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ItemFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditing(null);
        }}
        item={editing}
        defaultStorage={settings?.default_storage}
        defaultUnit={settings?.default_unit}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.length} item(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the selected items from your pantry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => handleDelete(selected)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
