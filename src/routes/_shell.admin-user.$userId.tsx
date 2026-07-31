import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout";
import { getAdminUserDetail } from "@/lib/admin.functions";

export const Route = createFileRoute("/_shell/admin-user/$userId")({
  head: () => ({
    meta: [
      { title: "User details — Admin | FreshTrack" },
      {
        name: "description",
        content: "Owner-only read-only view of a FreshTrack member's account, pantry and scans.",
      },
      { property: "og:title", content: "FreshTrack user details" },
      { property: "og:description", content: "Read-only account, pantry and barcode activity." },
    ],
  }),
  component: AdminUserPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="surface-card p-5">
      <h2 className="mb-3 text-sm font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function AdminUserPage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const fetchDetail = useServerFn(getAdminUserDetail);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => fetchDetail({ data: { userId } }),
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
          <User className="h-5 w-5 text-primary" /> User
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
      ) : (
        <div className="space-y-5 pb-8">
          <div className="surface-card p-5">
            <p className="text-lg font-semibold tracking-tight">
              {data.profile.full_name || "Unnamed member"}
            </p>
            <p className="mt-0.5 break-all text-sm text-muted-foreground">
              {data.profile.email ?? "No email on file"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Joined{" "}
              {data.profile.created_at
                ? new Date(data.profile.created_at).toLocaleDateString()
                : "—"}{" "}
              · 🧺 {data.pantry.length} pantry · 🛒 {data.shopping.length} list · 📷{" "}
              {data.scans.length} scans · 🤖 {data.aiCalls} AI calls
            </p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Read-only
            </p>
          </div>

          <Section title={`Pantry (${data.pantry.length})`}>
            {data.pantry.length === 0 ? (
              <p className="text-sm text-muted-foreground">Pantry is empty.</p>
            ) : (
              <div className="space-y-2">
                {data.pantry.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-muted/40 px-4 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-medium">
                        {item.name}
                        {item.brand ? (
                          <span className="text-muted-foreground"> · {item.brand}</span>
                        ) : null}
                      </p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.category} · {item.storage} · expires{" "}
                      {new Date(item.expiry_date).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title={`Shopping list (${data.shopping.length})`}>
            {data.shopping.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shopping items.</p>
            ) : (
              <div className="space-y-2">
                {data.shopping.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3 text-sm"
                  >
                    <span className={item.checked ? "line-through opacity-60" : ""}>
                      {item.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title={`Barcodes added (${data.products.length})`}>
            {data.products.length === 0 ? (
              <p className="text-sm text-muted-foreground">No products contributed yet.</p>
            ) : (
              <div className="space-y-2">
                {data.products.map((p) => (
                  <div key={p.id} className="rounded-2xl bg-muted/40 px-4 py-3">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {p.barcode}
                      {p.brand ? ` · ${p.brand}` : ""} ·{" "}
                      {new Date(p.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title={`Scan history (${data.scans.length})`}>
            {data.scans.length === 0 ? (
              <p className="text-sm text-muted-foreground">No scans recorded.</p>
            ) : (
              <div className="space-y-2">
                {data.scans.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3 text-sm"
                  >
                    <span className="capitalize">{s.method}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.items_added} items · {new Date(s.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}
    </PageContainer>
  );
}
