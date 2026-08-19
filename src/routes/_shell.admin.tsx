import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, ShieldCheck, UserMinus, UserPlus } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer } from "@/components/layout";
import { friendlyMessage } from "@/lib/errors";
import { amIOwner, getAdminOverview, listAdmins, setAdminByEmail } from "@/lib/admin.functions";

export const Route = createFileRoute("/_shell/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Usage & AI Analytics | FreshTrack" },
      {
        name: "description",
        content:
          "Owner-only FreshTrack control room: AI provider usage, per-user activity and pantry statistics.",
      },
      { property: "og:title", content: "FreshTrack Admin" },
      { property: "og:description", content: "AI usage and user activity across FreshTrack." },
    ],
  }),
  component: AdminPage,
});

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="surface-card p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tracking-[-0.03em]">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Owner-only: hand out or take back the admin role by email address. */
function AdminRolesPanel() {
  const qc = useQueryClient();
  const fetchAdmins = useServerFn(listAdmins);
  const setAdmin = useServerFn(setAdminByEmail);
  const [email, setEmail] = useState("");

  const { data } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: () => fetchAdmins({}),
  });

  const mutate = useMutation({
    mutationFn: (vars: { email: string; grant: boolean }) => setAdmin({ data: vars }),
    onSuccess: (res) => {
      toast.success(res.message);
      setEmail("");
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
    },
    onError: (e) => toast.error(friendlyMessage(e, "Could not update admin access")),
  });

  return (
    <section className="surface-card p-5">
      <h2 className="mb-1 text-sm font-semibold tracking-tight">Admin access</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Owner only — grant or remove the admin role for any FreshTrack account.
      </p>

      <div className="flex gap-2">
        <Input
          type="email"
          value={email}
          placeholder="person@example.com"
          className="h-11 rounded-xl"
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button
          className="h-11 shrink-0 rounded-xl"
          disabled={!email.trim() || mutate.isPending}
          onClick={() => mutate.mutate({ email, grant: true })}
        >
          {mutate.isPending && mutate.variables?.grant ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          Grant
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        {(data?.admins ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No admins yet.</p>
        ) : (
          data?.admins.map((a) => (
            <div
              key={a.user_id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-muted/40 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {a.full_name || a.email || a.user_id.slice(0, 8)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {a.email}
                  {a.is_owner ? " · owner" : ""}
                </p>
              </div>
              {!a.is_owner && a.email ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 rounded-xl text-destructive"
                  disabled={mutate.isPending}
                  onClick={() => mutate.mutate({ email: a.email as string, grant: false })}
                >
                  <UserMinus className="h-4 w-4" /> Remove
                </Button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}


function AdminPage() {
  const navigate = useNavigate();
  const fetchOverview = useServerFn(getAdminOverview);
  const fetchOwner = useServerFn(amIOwner);
  const { data: ownerData } = useQuery({ queryKey: ["am-i-owner"], queryFn: () => fetchOwner({}) });
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => fetchOverview({}),
    refetchInterval: 60_000,
  });

  return (
    <PageContainer>
      <div className="mb-5 flex items-center gap-2">
        <Button
          size="icon"
          variant="ghost"
          className="rounded-xl"
          aria-label="Back to profile"
          onClick={() => navigate({ to: "/profile" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="flex items-center gap-2 text-[26px] font-bold tracking-[-0.03em]">
          <ShieldCheck className="h-5 w-5 text-primary" /> Admin
        </h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="surface-card p-5 text-sm text-muted-foreground">
          You don't have access to this dashboard.
        </div>
      ) : data ? (
        <div className="space-y-5 pb-8">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Users" value={data.totals.users} />
            <Stat label="Pantry items" value={data.totals.pantryItems} />
            <Stat
              label="AI calls"
              value={data.totals.aiCalls}
              hint={`${data.totals.aiCalls24h} in last 24h`}
            />
            <Stat
              label="Push devices"
              value={data.totals.pushDevices}
              hint={`${data.totals.aiFailures} AI failures`}
            />
          </div>

          <section className="surface-card p-5">
            <h2 className="mb-3 text-sm font-semibold tracking-tight">AI calls · last 14 days</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.daily}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v: string) => v.slice(5)}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis width={26} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ opacity: 0.08 }} />
                  <Bar dataKey="calls" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="surface-card p-5">
            <h2 className="mb-3 text-sm font-semibold tracking-tight">Providers</h2>
            <div className="space-y-2">
              {data.byProvider.length === 0 ? (
                <p className="text-sm text-muted-foreground">No AI activity recorded yet.</p>
              ) : (
                data.byProvider.map((p) => (
                  <div
                    key={p.provider}
                    className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3 text-sm"
                  >
                    <span className="min-w-0 font-medium">
                      <span className="block capitalize">{p.provider}</span>
                      {p.model ? (
                        <span className="block truncate text-xs font-normal text-muted-foreground">
                          {p.model}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-muted-foreground">
                      {p.calls} calls · {p.avgMs}ms avg · {p.failures} failed
                    </span>
                  </div>
                ))
              )}
            </div>
            {data.byFeature.length > 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                {data.byFeature.map((f) => `${f.feature}: ${f.calls}`).join("  ·  ")}
              </p>
            ) : null}
          </section>

          <section className="surface-card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-tight">Users</h2>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-xl"
                  onClick={() => navigate({ to: "/admin-pending" })}
                >
                  Pending products
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-xl"
                  onClick={() => navigate({ to: "/admin-barcodes" })}
                >
                  Barcode database
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {data.users.map((u) => (
                <button
                  key={u.user_id}
                  type="button"
                  className="w-full rounded-2xl bg-muted/40 px-4 py-3 text-left transition hover:bg-muted/60"
                  onClick={() =>
                    navigate({ to: "/admin-user/$userId", params: { userId: u.user_id } })
                  }
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-sm font-medium">
                      {u.full_name || u.email || u.user_id.slice(0, 8)}
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {u.ai_calls} AI calls
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{u.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {u.pantry_items} pantry · {u.shopping_items} list · {u.scans} scans ·
                    {u.push_devices} device{u.push_devices === 1 ? "" : "s"}
                  </p>
                </button>
              ))}
            </div>
          </section>

          {ownerData?.owner ? <AdminRolesPanel /> : null}
        </div>
      ) : null}
    </PageContainer>
  );
}
