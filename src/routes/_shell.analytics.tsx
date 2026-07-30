import { createFileRoute } from "@tanstack/react-router";
import { CircleDollarSign, Package, Timer, TrendingUp } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { DashboardAnalytics } from "@/components/dashboard-analytics";
import { useActivity, usePantryItems, useSettings } from "@/lib/data";
import { computeStats, formatCurrency } from "@/lib/freshtrack";

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
