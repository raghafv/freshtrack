import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Barcode, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { PageContainer } from "@/components/layout";
import {
  deleteAdminProduct,
  getAdminProducts,
  saveAdminProduct,
  type AdminProductRow,
} from "@/lib/admin.functions";
import { friendlyMessage } from "@/lib/errors";

export const Route = createFileRoute("/_shell/admin-barcodes")({
  head: () => ({
    meta: [
      { title: "Barcode database — Admin | FreshTrack" },
      {
        name: "description",
        content: "Owner-only control panel for the global FreshTrack barcode and product database.",
      },
      { property: "og:title", content: "FreshTrack barcode database" },
      { property: "og:description", content: "Manage every product barcode saved in FreshTrack." },
    ],
  }),
  component: AdminBarcodesPage,
});

type Draft = {
  id?: string;
  barcode: string;
  name: string;
  brand: string;
  category: string;
  size: string;
  storage: string;
  shelfLifeDays: string;
};

const EMPTY: Draft = {
  barcode: "",
  name: "",
  brand: "",
  category: "",
  size: "",
  storage: "",
  shelfLifeDays: "",
};

function AdminBarcodesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminProductRow | null>(null);

  const fetchProducts = useServerFn(getAdminProducts);
  const saveFn = useServerFn(saveAdminProduct);
  const deleteFn = useServerFn(deleteAdminProduct);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["admin-products", search],
    queryFn: () => fetchProducts({ data: { search } }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-products"] });

  const save = useMutation({
    mutationFn: (d: Draft) =>
      saveFn({
        data: {
          id: d.id ?? null,
          barcode: d.barcode,
          name: d.name,
          brand: d.brand || null,
          category: d.category || null,
          size: d.size || null,
          storage: d.storage || null,
          shelfLifeDays: d.shelfLifeDays ? Number(d.shelfLifeDays) : null,
        },
      }),
    onSuccess: () => {
      toast.success("Saved to the global database");
      setDraft(null);
      void refresh();
    },
    onError: (e) => toast.error(friendlyMessage(e, "Could not save that product")),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Barcode removed");
      setConfirmDelete(null);
      void refresh();
    },
    onError: (e) => toast.error(friendlyMessage(e, "Could not delete that product")),
  });

  return (
    <PageContainer>
      <div className="mb-5 flex items-center gap-2">
        <Button
          size="icon"
          variant="ghost"
          className="rounded-xl"
          aria-label="Back to admin"
          onClick={() => navigate({ to: "/admin" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="flex items-center gap-2 text-[26px] font-bold tracking-[-0.03em]">
          <Barcode className="h-5 w-5 text-primary" /> Barcodes
        </h1>
        <Button
          size="sm"
          className="press ml-auto rounded-2xl"
          onClick={() => setDraft({ ...EMPTY })}
        >
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search name, brand or barcode"
        className="mb-4 rounded-2xl"
        aria-label="Search products"
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error || !data ? (
        <div className="surface-card p-5 text-sm text-muted-foreground">
          You don't have access to this page.
        </div>
      ) : (
        <div className="space-y-2 pb-8">
          <p className="mb-1 text-xs text-muted-foreground">
            {data.total} product{data.total === 1 ? "" : "s"} in the global database · showing{" "}
            {data.rows.length}
            {isFetching ? " · refreshing…" : ""}
          </p>
          {data.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products match that search.</p>
          ) : (
            data.rows.map((p) => (
              <div key={p.id} className="rounded-2xl bg-muted/40 px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {p.barcode}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.brand ? `${p.brand} · ` : ""}
                  {p.category}
                  {p.size ? ` · ${p.size}` : ""} · {p.storage} · {p.shelf_life_days}d shelf life
                </p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground">
                    {p.source} · added {new Date(p.created_at).toLocaleDateString()}
                    {p.created_by ? " · user contributed" : ""}
                  </p>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-xl"
                      aria-label={`Edit ${p.name}`}
                      onClick={() =>
                        setDraft({
                          id: p.id,
                          barcode: p.barcode,
                          name: p.name,
                          brand: p.brand ?? "",
                          category: p.category ?? "",
                          size: p.size ?? "",
                          storage: p.storage ?? "",
                          shelfLifeDays: String(p.shelf_life_days ?? ""),
                        })
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-xl text-destructive"
                      aria-label={`Delete ${p.name}`}
                      onClick={() => setConfirmDelete(p)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <Dialog open={Boolean(draft)} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit product" : "Add product"}</DialogTitle>
            <DialogDescription>
              Anything left blank is filled in automatically from the product name.
            </DialogDescription>
          </DialogHeader>
          {draft ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate(draft);
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="nm">Name</Label>
                <Input
                  id="nm"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  required
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bc">Barcode</Label>
                <Input
                  id="bc"
                  inputMode="numeric"
                  value={draft.barcode}
                  onChange={(e) => setDraft({ ...draft, barcode: e.target.value })}
                  required
                  className="rounded-2xl font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="br">Brand</Label>
                  <Input
                    id="br"
                    value={draft.brand}
                    onChange={(e) => setDraft({ ...draft, brand: e.target.value })}
                    className="rounded-2xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ct">Category</Label>
                  <Input
                    id="ct"
                    value={draft.category}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                    className="rounded-2xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sz">Size</Label>
                  <Input
                    id="sz"
                    value={draft.size}
                    onChange={(e) => setDraft({ ...draft, size: e.target.value })}
                    placeholder="500 ml"
                    className="rounded-2xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="st">Storage</Label>
                  <Input
                    id="st"
                    value={draft.storage}
                    onChange={(e) => setDraft({ ...draft, storage: e.target.value })}
                    placeholder="Fridge"
                    className="rounded-2xl"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sl">Shelf life (days)</Label>
                <Input
                  id="sl"
                  inputMode="numeric"
                  value={draft.shelfLifeDays}
                  onChange={(e) => setDraft({ ...draft, shelfLifeDays: e.target.value })}
                  className="rounded-2xl"
                />
              </div>
              <Button type="submit" className="press w-full rounded-2xl" disabled={save.isPending}>
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(confirmDelete)} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent className="max-w-xs rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this barcode?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.name} ({confirmDelete?.barcode}) will be removed from the global
              database for everyone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row justify-end gap-2">
            <AlertDialogCancel className="mt-0 rounded-2xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl"
              onClick={(e) => {
                e.preventDefault();
                if (confirmDelete) remove.mutate(confirmDelete.id);
              }}
            >
              {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
