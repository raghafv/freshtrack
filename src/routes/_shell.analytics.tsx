import { createFileRoute } from "@tanstack/react-router";
import { CircleDollarSign, Package, Timer, TrendingUp } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { DashboardAnalytics } from "@/components/dashboard-analytics";
import { useActivity, usePantryItems, useSettings } from "@/lib/data";
import { computeStats, formatCurrency, type ActivityEntry } from "@/lib/freshtrack";

export const Route = createFileRoute("/_shell/analytics")({
  head: () => ({
    meta: [
      { title: "Pantry Analytics — Waste, Value & Trends | FreshTrack" },
      {
        name: "description",
        content:
          "Deep pantry analytics: category distribution, monthly waste trends, spending insights, most purchased items and run-out predictions.",
      },
      { property: "og:title", content: "FreshTrack Pantry Analytics" },
      {
        property: "og:description",
        content: "Charts and predictions built from your real pantry data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { data: items = [], isLoading } = usePantryItems();
  const { data: activity = [] } = useActivity(200);
  const { data: settings } = useSettings();
  const soonDays = settings?.expiry_reminder_days ?? 3;
  const stats = computeStats(items, soonDays);

  return (
    <PageContainer>
      <PageHeader title="Analytics" subtitle="Everything your pantry data can tell you." />

      <section className="mb-5 grid grid-cols-3 gap-3">
        <Mini label="Expiring this week" value={String(stats.expiringThisWeek)} icon={Timer} />
        <Mini
          label="Value at risk"
          value={formatCurrency(stats.atRiskValue)}
          icon={CircleDollarSign}
        />
        <Mini label="Avg days left" value={`${stats.avgDaysLeft}d`} icon={TrendingUp} />
      </section>

      <section className="mb-5 grid grid-cols-3 gap-3">
        <Mini label="Added today" value={String(stats.addedToday)} icon={Package} />
        <Mini label="Pantry value" value={formatCurrency(stats.savings)} icon={CircleDollarSign} />
        <Mini
          label="Wasted value"
          value={formatCurrency(stats.wastedValue)}
          icon={CircleDollarSign}
        />
      </section>

      <SavedVsWasted activity={activity} wasted={stats.wastedValue} />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading analytics…</p>
      ) : items.length === 0 ? (
        <p className="surface-card p-6 text-sm text-muted-foreground">
          Add a few items to your pantry and your analytics will appear here.
        </p>
      ) : (
        <DashboardAnalytics items={items} activity={activity} soonDays={soonDays} />
      )}
    </PageContainer>
  );
}

function Mini({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Package;
}) {
  return (
    <div className="surface-card p-3 text-center">
      <Icon className="mx-auto mb-1 h-4 w-4 text-primary" />
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

/** Estimated money rescued (items used up) versus money lost to expiry. */
function SavedVsWasted({ activity, wasted }: { activity: ActivityEntry[]; wasted: number }) {
  const AVG = 120;
  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const used = activity.filter(
    (a) =>
      (a.action === "used" || (a.action === "deleted" && /finished/i.test(a.detail ?? ""))) &&
      new Date(a.created_at).getTime() >= since,
  ).length;
  const saved = used * AVG;
  const total = saved + wasted;
  const pct = total > 0 ? Math.round((saved / total) * 100) : 0;
  return (
    <section className="surface-card mb-5 p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[16px] font-semibold tracking-[-0.02em]">Saved vs wasted · 30 days</h2>
        <span className="text-[12px] text-muted-foreground">{pct}% rescued</span>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        <div className="h-full bg-destructive/70" style={{ width: `${total > 0 ? 100 - pct : 0}%` }} />
      </div>
      <div className="mt-3 flex justify-between text-[13px]">
        <span>
          <span className="font-semibold text-primary">{formatCurrency(saved)}</span>{" "}
          <span className="text-muted-foreground">used before expiry (est.)</span>
        </span>
        <span>
          <span className="font-semibold text-destructive">{formatCurrency(wasted)}</span>{" "}
          <span className="text-muted-foreground">wasted</span>
        </span>
      </div>
    </section>
  );
}
