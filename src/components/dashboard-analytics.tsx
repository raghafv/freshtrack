import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarClock,
  Lightbulb,
  Repeat,
  Snowflake,
  ShoppingCart,
  Sparkles,
  Timer,
  TrendingDown,
  TriangleAlert,
} from "lucide-react";
import {
  categoryDistribution,
  generateInsights,
  monthlyWaste,
  mostWastedCategory,
  predictRunOut,
  purchaseHistory,
  spendingInsights,
  storageDistribution,
  type Insight,
} from "@/lib/analytics";
import { categoryEmoji, emojiFor, storageEmoji } from "@/lib/emoji";
import { formatCurrency, type ActivityEntry, type PantryItem } from "@/lib/freshtrack";
import { cn } from "@/lib/utils";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--primary)",
];

const INSIGHT_ICON: Record<Insight["kind"], typeof Lightbulb> = {
  expiring: TriangleAlert,
  "low-stock": ShoppingCart,
  duplicate: Repeat,
  "consume-first": Timer,
  storage: Snowflake,
  shopping: ShoppingCart,
  freeze: Snowflake,
  overbuying: TrendingDown,
};

const TONE_CLASS = {
  good: "bg-success/15 text-success",
  warn: "bg-warning/20 text-warning",
  bad: "bg-destructive/15 text-destructive",
  info: "bg-primary-soft text-primary",
} as const;

interface Props {
  items: PantryItem[];
  activity: ActivityEntry[];
  soonDays: number;
}

/** Charts, spending analysis and live advice derived from the real pantry. */
export function DashboardAnalytics({ items, activity, soonDays }: Props) {
  const insights = useMemo(
    () => generateInsights(items, activity, soonDays),
    [items, activity, soonDays],
  );
  const categories = useMemo(() => categoryDistribution(items).slice(0, 6), [items]);
  const storages = useMemo(() => storageDistribution(items), [items]);
  const waste = useMemo(() => monthlyWaste(items), [items]);
  const worstCategory = useMemo(() => mostWastedCategory(items), [items]);
  const spending = useMemo(() => spendingInsights(items), [items]);
  const purchases = useMemo(
    () => purchaseHistory(activity, items).slice(0, 5),
    [activity, items],
  );
  const runOut = useMemo(() => predictRunOut(activity, items, 4), [activity, items]);

  if (items.length === 0) return null;

  return (
    <>
      {insights.length > 0 && (
        <section className="surface-card mb-5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Pantry insights</h2>
          </div>
          <ul className="space-y-2">
            {insights.slice(0, 6).map((insight) => {
              const Icon = INSIGHT_ICON[insight.kind] ?? Lightbulb;
              return (
                <li key={insight.id} className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      TONE_CLASS[insight.tone],
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{insight.title}</p>
                    <p className="text-xs leading-snug text-muted-foreground">{insight.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="surface-card mb-5 p-4">
        <h2 className="mb-1 text-base font-semibold">Where your pantry sits</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          {categories.length} categor{categories.length === 1 ? "y" : "ies"} ·{" "}
          {storages.map((s) => `${storageEmoji(s.name)} ${s.name} ${s.count}`).join(" · ")}
        </p>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categories}
                dataKey="count"
                nameKey="name"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={2}
                stroke="none"
              >
                {categories.map((entry, i) => (
                  <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  color: "var(--card-foreground)",
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) => [`${value} items`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="mt-2 flex flex-wrap gap-2">
          {categories.map((c, i) => (
            <li key={c.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
              />
              {categoryEmoji(c.name)} {c.name} · {c.count}
            </li>
          ))}
        </ul>
      </section>

      <section className="surface-card mb-5 p-4">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-base font-semibold">Waste trend</h2>
          <span className="text-xs text-muted-foreground">last 6 months</span>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          {worstCategory
            ? `Most wasted: ${categoryEmoji(worstCategory.category)} ${worstCategory.category} (${formatCurrency(worstCategory.value)})`
            : "No expired items recorded — nothing wasted yet."}
        </p>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={waste} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                contentStyle={{
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  color: "var(--card-foreground)",
                  fontSize: 12,
                }}
                formatter={(value: number) => [formatCurrency(value), "Wasted"]}
              />
              <Bar dataKey="wasted" radius={[8, 8, 0, 0]} fill="var(--chart-3)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="surface-card mb-5 p-4">
        <h2 className="mb-3 text-base font-semibold">Spending insights</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="Pantry value" value={formatCurrency(spending.totalValue)} />
          <Stat label="Bought this month" value={formatCurrency(spending.monthSpend)} />
          <Stat label="Average item" value={formatCurrency(spending.avgItemValue)} />
          <Stat label="Average pantry age" value={`${spending.avgPantryAgeDays} days`} />
        </div>
        {spending.topCategory && (
          <p className="mt-3 text-xs text-muted-foreground">
            Most of your money sits in {categoryEmoji(spending.topCategory.category)}{" "}
            {spending.topCategory.category} ({formatCurrency(spending.topCategory.value)}).
            {spending.pricedItems < items.length &&
              ` ${items.length - spending.pricedItems} item(s) have no price yet, so these use a typical ₹120 estimate.`}
          </p>
        )}
      </section>

      {purchases.length > 0 && (
        <section className="surface-card mb-5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Repeat className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Most purchased</h2>
          </div>
          <ul className="space-y-2">
            {purchases.map((p) => (
              <li key={p.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">
                  <span aria-hidden className="mr-1">
                    {emojiFor(p.name)}
                  </span>
                  {p.name}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {p.count}× ·{" "}
                  {p.intervalDays ? `every ~${p.intervalDays}d` : "first purchase"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {runOut.length > 0 && (
        <section className="surface-card mb-5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Coming up</h2>
          </div>
          <ul className="space-y-2.5">
            {runOut.map((r) => (
              <li key={r.name} className="text-sm">
                <p className="font-medium">
                  <span aria-hidden className="mr-1">
                    {emojiFor(r.name)}
                  </span>
                  {r.name} runs out in {Math.max(0, r.daysLeft)} day
                  {r.daysLeft === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Buy again around {r.buyOn} · {r.basis}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" /> Predicted from how often you actually buy
            each item.
          </p>
        </section>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/50 px-3 py-2">
      <p className="text-base font-bold leading-none">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
