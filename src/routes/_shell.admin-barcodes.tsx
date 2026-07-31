import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Barcode, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer } from "@/components/layout";
import { getAdminProducts } from "@/lib/admin.functions";

export const Route = createFileRoute("/_shell/admin-barcodes")({
  head: () => ({
    meta: [
      { title: "Barcode database — Admin | FreshTrack" },
      {
        name: "description",
        content:
          "Owner-only read-only browser for the global FreshTrack barcode and product database.",
      },
      { property: "og:title", content: "FreshTrack barcode database" },
      { property: "og:description", content: "Browse every product barcode saved in FreshTrack." },
    ],
  }),
  component: AdminBarcodesPage,
});

function AdminBarcodesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const fetchProducts = useServerFn(getAdminProducts);
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["admin-products", search],
    queryFn: () => fetchProducts({ data: { search } }),
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
            {isFetching ? " · refreshing…" : ""} · read-only
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
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {p.source} · added {new Date(p.created_at).toLocaleDateString()}
                  {p.created_by ? " · user contributed" : ""}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </PageContainer>
  );
}
