import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  CircleDollarSign,
  Cpu,
  Leaf,
  Package,
  Plus,
  ScanLine,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageContainer } from "@/components/layout";
import { ItemFormDialog, type ItemFormPrefill } from "@/components/item-form-dialog";
import { QuickAddDialog } from "@/components/quick-add-dialog";

import { StatusBadge } from "@/components/status-badge";
import { useTheme } from "@/lib/theme";
import { Moon, Sun } from "lucide-react";
import {
  useActivity,
  usePantryItems,
  useProfile,
  useScanHistory,
  useSettings,
} from "@/lib/data";
import { computeStats, expiryText, formatCurrency, getStatus } from "@/lib/freshtrack";

export const Route = createFileRoute("/_shell/")({
  head: () => ({
    meta: [
      { title: "FreshTrack Dashboard — Pantry Health at a Glance" },
      {
        name: "description",
        content:
          "See your pantry health score, items expiring soon, savings and recent activity in the FreshTrack dashboard.",
      },
      { property: "og:title", content: "FreshTrack Dashboard" },
      {
        property: "og:description",
        content: "Pantry health score, expiring items, savings and activity in one view.",
      },
    ],
  }),
  component: Dashboard,
});

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

const ACTION_ICON: Record<string, typeof Plus> = {
  added: Plus,
  deleted: Trash2,
  edited: Sparkles,
  scan: ScanLine,
};

function Dashboard() {
  const { data: items = [], isLoading } = usePantryItems();
  const { data: activity = [] } = useActivity(8);
  const { data: scans = [] } = useScanHistory();
  const { data: profile } = useProfile();
  const { data: settings } = useSettings();
  const { resolved, toggle } = useTheme();
  const [addOpen, setAddOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [prefill, setPrefill] = useState<ItemFormPrefill | undefined>();

  const soonDays = settings?.expiry_reminder_days ?? 3;
  const stats = computeStats(items, soonDays);
  const attention = items
    .filter((i) => getStatus(i, soonDays) !== "fresh")
    .slice(0, 4);
  const lastScan = scans[0];
  const firstName = (profile?.full_name ?? "there").split(" ")[0];

  return (
    <PageContainer>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="mt-1 text-2xl font-bold">Hi {firstName} 👋</h1>
        </div>
        <Button
          size="icon"
          variant="secondary"
          onClick={toggle}
          aria-label="Toggle theme"
          className="press rounded-2xl"
        >
          {resolved === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </header>

      <section className="gradient-hero relative mb-5 overflow-hidden rounded-3xl p-5 text-primary-foreground shadow-lift">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest opacity-80">
              Pantry health score
            </p>
            <p className="mt-1 text-5xl font-extrabold">{stats.healthScore}</p>
            <p className="mt-1 text-sm opacity-90">
              {stats.total === 0
                ? "Add your first item to start tracking"
                : stats.expired > 0
                  ? `${stats.expired} item${stats.expired > 1 ? "s" : ""} need${stats.expired > 1 ? "" : "s"} attention`
                  : "Your pantry is in great shape"}
            </p>
          </div>
          <Leaf className="h-14 w-14 opacity-40" />
        </div>
        <Progress
          value={stats.healthScore}
          className="mt-4 h-2 bg-primary-foreground/25 [&>div]:bg-primary-foreground"
        />
      </section>

      <section className="mb-5 grid grid-cols-2 gap-3">
        <StatCard icon={Package} label="Total items" value={stats.total} tone="default" />
        <StatCard icon={Leaf} label="Fresh" value={stats.fresh} tone="success" />
        <StatCard icon={TriangleAlert} label="Use soon" value={stats.soon} tone="warning" />
        <StatCard icon={Trash2} label="Expired" value={stats.expired} tone="danger" />
      </section>

      <section className="mb-5 grid grid-cols-3 gap-3">
        <MiniStat label="Added today" value={String(stats.addedToday)} />
        <MiniStat label="Est. savings" value={`$${stats.savings.toFixed(0)}`} icon={CircleDollarSign} />
        <MiniStat label="Waste prevented" value={`${stats.wastePrevented} kg`} />
      </section>

      <section className="mb-5 grid grid-cols-2 gap-3">
        <Button asChild className="press h-14 rounded-2xl text-base">
          <Link to="/scanner">
            <ScanLine className="h-5 w-5" /> Scan item
          </Link>
        </Button>
        <Button
          variant="secondary"
          className="press h-14 rounded-2xl text-base"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-5 w-5" /> Add manually
        </Button>
      </section>

      <section className="surface-card mb-5 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Needs attention</h2>
          <Link to="/pantry" className="text-xs font-medium text-primary">
            View pantry <ArrowRight className="inline h-3 w-3" />
          </Link>
        </div>
        {isLoading ? (
          <p className="py-4 text-sm text-muted-foreground">Loading your pantry…</p>
        ) : attention.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Nothing is expiring soon. {stats.total === 0 ? "Your pantry is empty." : "Nice work!"}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {attention.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.storage} · {expiryText(item.expiry_date)}
                  </p>
                </div>
                <StatusBadge status={getStatus(item, soonDays)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-5 grid grid-cols-2 gap-3">
        <div className="surface-card p-4">
          <div className="mb-1 flex items-center gap-2 text-muted-foreground">
            <ScanLine className="h-4 w-4" />
            <span className="text-xs font-medium">Last scan</span>
          </div>
          <p className="text-sm font-semibold">
            {lastScan ? timeAgo(lastScan.created_at) : "No scans yet"}
          </p>
          {lastScan && (
            <p className="text-xs text-muted-foreground">
              {lastScan.method} · {lastScan.items_added} item(s)
            </p>
          )}
        </div>
        <div className="surface-card p-4">
          <div className="mb-1 flex items-center gap-2 text-muted-foreground">
            <Cpu className="h-4 w-4" />
            <span className="text-xs font-medium">Device status</span>
          </div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <span className="h-2 w-2 rounded-full bg-warning" /> Not paired
          </p>
          <p className="text-xs text-muted-foreground">Phone camera active</p>
        </div>
      </section>

      <section className="surface-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">Recent activity</h2>
        </div>
        {activity.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">
            Your pantry activity will appear here.
          </p>
        ) : (
          <ul className="space-y-3">
            {activity.map((entry) => {
              const Icon = ACTION_ICON[entry.action] ?? Activity;
              return (
                <li key={entry.id} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium capitalize">
                      {entry.action}
                      {entry.item_name ? ` · ${entry.item_name}` : ""}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {entry.detail ?? ""} · {timeAgo(entry.created_at)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <QuickAddDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        defaultStorage={settings?.default_storage}
        defaultUnit={settings?.default_unit}
        onDetails={(p) => {
          setPrefill(p);
          setFormOpen(true);
        }}
      />

      <ItemFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setPrefill(undefined);
        }}
        prefill={prefill}
        defaultStorage={settings?.default_storage}
        defaultUnit={settings?.default_unit}
      />
    </PageContainer>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Package;
  label: string;
  value: number;
  tone: "default" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    default: "text-primary bg-primary-soft",
    success: "text-success bg-success/15",
    warning: "text-warning bg-warning/20",
    danger: "text-destructive bg-destructive/15",
  }[tone];

  return (
    <div className="surface-card flex items-center gap-3 p-4">
      <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xl font-bold leading-none">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof Package;
}) {
  return (
    <div className="surface-card p-3 text-center">
      {Icon && <Icon className="mx-auto mb-1 h-4 w-4 text-primary" />}
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
