import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Check, Loader2, PackageSearch, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer } from "@/components/layout";
import {
  approvePendingProduct,
  getPendingProducts,
  rejectPendingProduct,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_shell/admin-pending")({
  head: () => ({
    meta: [
      { title: "Pending products — Admin | FreshTrack" },
      {
        name: "description",
        content:
          "Owner-only review queue for user-submitted barcodes before they enter the global FreshTrack product database.",
      },
      { property: "og:title", content: "FreshTrack pending products" },
      {
        property: "og:description",
        content: "Approve, edit or reject community barcode submissions.",
      },
    ],
  }),
  component: AdminPendingPage,
});

function AdminPendingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchPending = useServerFn(getPendingProducts);
  const approveFn = useServerFn(approvePendingProduct);
  const rejectFn = useServerFn(rejectPendingProduct);

  const [edits, setEdits] = useState<Record<string, { name: string; quantity: string }>>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-pending"],
    queryFn: () => fetchPending({ data: { status: "pending" } }),
  });

  const approve = useMutation({
    mutationFn: (vars: { id: string; name: string; quantity: string }) =>
      approveFn({ data: { id: vars.id, name: vars.name, quantity: vars.quantity } }),
    onSuccess: (r) => {
      toast.success(`Approved — barcode ${r.barcode} is now in the global database`);
      void qc.invalidateQueries({ queryKey: ["admin-pending"] });
      void qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: () => toast.error("Could not approve that submission"),
  });

  const reject = useMutation({
    mutationFn: (id: string) => rejectFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Rejected");
      void qc.invalidateQueries({ queryKey: ["admin-pending"] });
    },
    onError: () => toast.error("Could not reject that submission"),
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
          <PackageSearch className="h-5 w-5 text-primary" /> Pending products
        </h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error || !data ? (
        <div className="surface-card p-5 text-sm text-muted-foreground">
          You don't have access to this page.
        </div>
      ) : data.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing waiting for review right now.</p>
      ) : (
        <div className="space-y-3 pb-8">
          {data.rows.map((row) => {
            const edit = edits[row.id] ?? { name: row.name, quantity: row.quantity ?? "" };
            const busy = approve.isPending || reject.isPending;
            return (
              <div key={row.id} className="surface-card space-y-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-muted-foreground">{row.barcode}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(row.created_at).toLocaleDateString()}
                  </span>
                </div>

                {row.image_url || row.back_image_url ? (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { src: row.image_url, label: "Front" },
                      { src: row.back_image_url, label: "Back" },
                    ].map((p) => (
                      <div key={p.label} className="space-y-1">
                        {p.src ? (
                          <a href={p.src} target="_blank" rel="noreferrer">
                          <img
                            src={p.src}
                            alt={`${row.name} ${p.label.toLowerCase()} photo`}
                            className="aspect-square w-full rounded-2xl object-cover"
                            loading="lazy"
                          />
                          </a>
                        ) : (
                          <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-muted/50 text-[11px] text-muted-foreground">
                            No photo
                          </div>
                        )}
                        <p className="text-center text-[10.5px] text-muted-foreground">{p.label}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <Input
                  value={edit.name}
                  aria-label="Product name"
                  className="rounded-2xl"
                  onChange={(e) =>
                    setEdits((s) => ({ ...s, [row.id]: { ...edit, name: e.target.value } }))
                  }
                />
                <Input
                  value={edit.quantity}
                  aria-label="Quantity or size"
                  placeholder="Size, e.g. 500 ml"
                  className="rounded-2xl"
                  onChange={(e) =>
                    setEdits((s) => ({ ...s, [row.id]: { ...edit, quantity: e.target.value } }))
                  }
                />

                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-2xl bg-muted/40 px-3.5 py-3 text-[11.5px]">
                  <dt className="text-muted-foreground">Barcode</dt>
                  <dd className="font-mono">{row.barcode}</dd>
                  <dt className="text-muted-foreground">Submitted by</dt>
                  <dd className="break-all">{row.submitter_email ?? "unknown user"}</dd>
                  <dt className="text-muted-foreground">User ID</dt>
                  <dd className="break-all font-mono text-[10.5px]">{row.submitted_by ?? "—"}</dd>
                  <dt className="text-muted-foreground">Date added</dt>
                  <dd>{new Date(row.created_at).toLocaleString()}</dd>
                  <dt className="text-muted-foreground">Pack shelf life</dt>
                  <dd>{row.shelf_life_days ? `${row.shelf_life_days} days` : "not given"}</dd>
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="capitalize">{row.status}</dd>
                </dl>
                <p className="text-[11px] text-muted-foreground">
                  Brand, category and storage are filled in automatically on approval.
                </p>

                <div className="flex gap-2">
                  <Button
                    className="flex-1 rounded-2xl"
                    disabled={busy || !edit.name.trim()}
                    onClick={() =>
                      approve.mutate({ id: row.id, name: edit.name, quantity: edit.quantity })
                    }
                  >
                    <Check className="mr-1.5 h-4 w-4" /> Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-2xl"
                    disabled={busy}
                    onClick={() => reject.mutate(row.id)}
                  >
                    <X className="mr-1.5 h-4 w-4" /> Reject
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
