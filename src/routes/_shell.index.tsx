import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  BarChart3,
  ChefHat,
  Lightbulb,
  Plus,
  ScanLine,
  ShoppingCart,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { PageContainer } from "@/components/layout";
import { AppBar } from "@/components/app-bar";
import { ItemFormDialog, type ItemFormPrefill } from "@/components/item-form-dialog";
import { QuickAddDialog } from "@/components/quick-add-dialog";
import { StatusBadge } from "@/components/status-badge";
import {
  useActivity,
  usePantryItems,
  useProfile,
  useSettings,
  useShoppingItems,
  useShoppingMutations,
} from "@/lib/data";
import { computeStats, expiryText, formatCurrency, formatQty, getStatus } from "@/lib/freshtrack";
import { explainHealth, generateInsights, type Insight } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/")({
  head: () => ({
    meta: [
      { title: "FreshTrack Home — What Needs Your Attention Today" },
      {
        name: "description",
        content:
          "Your pantry at a glance: health score, what is expiring, what to buy and what to cook — all from your live FreshTrack pantry.",
      },
      { property: "og:title", content: "FreshTrack Home" },
      {
        property: "og:description",
        content: "Health score, alerts, shopping list and AI suggestions in one calm view.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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

const SUGGESTION_KINDS: Insight["kind"][] = [
  "consume-first",
  "freeze",
  "shopping",
  "storage",
  "overbuying",
  "duplicate",
];

function healthLabel(score: number) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Needs attention";
  return "At risk";
}

/** Time-of-day greeting shown at the top left of the home screen. */
function greetingFor(now: Date) {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

function Dashboard() {
  const { data: items = [], isLoading } = usePantryItems();
  const { data: activity = [] } = useActivity(6);
  const { data: fullActivity = [] } = useActivity(200);
  const { data: shopping = [] } = useShoppingItems();
  const { data: profile } = useProfile();
  const { data: settings } = useSettings();
  const { toggle } = useShoppingMutations();
  const [addOpen, setAddOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [prefill, setPrefill] = useState<ItemFormPrefill | undefined>();

  const soonDays = settings?.expiry_reminder_days ?? 3;
  const stats = computeStats(items, soonDays);
  const health = explainHealth(items, soonDays);
  const insights = useMemo(
    () => generateInsights(items, fullActivity, soonDays),
    [items, fullActivity, soonDays],
  );
  const alerts = items
    .filter((i) => getStatus(i, soonDays) !== "fresh")
    .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date))
    .slice(0, 4);
  const lowStock = insights.filter((i) => i.kind === "low-stock").slice(0, 2);
  const suggestions = insights.filter((i) => SUGGESTION_KINDS.includes(i.kind)).slice(0, 4);
  const openShopping = shopping.filter((i) => !i.checked).slice(0, 4);
  const firstName = (profile?.full_name ?? "there").split(" ")[0];

  return (
    <PageContainer>
      <AppBar
        greeting={`${greetingFor(new Date())}, ${firstName}!`}
        subtitle={new Date().toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      />

      {/* Hero — pantry health */}
      <section className="gradient-hero mb-6 rounded-3xl p-6 text-primary-foreground shadow-lift">
        <p className="text-xs font-medium uppercase tracking-widest opacity-75">Pantry health</p>
        <div className="mt-2 flex items-end gap-3">
          <p className="text-5xl font-extrabold leading-none">{stats.healthScore}%</p>
          <p className="pb-1 text-base font-semibold opacity-90">
            {healthLabel(stats.healthScore)}
          </p>
        </div>
        <Progress
          value={stats.healthScore}
          className="mt-4 h-1.5 bg-primary-foreground/25 [&>div]:bg-primary-foreground"
        />
        <p className="mt-3 text-sm opacity-90">{health.headline}</p>
      </section>

      {/* Alerts — highest priority */}
      <section className="surface-card mb-6 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <TriangleAlert className="h-4 w-4 text-warning" /> Needs attention
          </h2>
          <Link to="/pantry" className="text-xs font-medium text-primary">
            Pantry <ArrowRight className="inline h-3 w-3" />
          </Link>
        </div>
        {isLoading ? (
          <p className="py-2 text-sm text-muted-foreground">Loading your pantry…</p>
        ) : alerts.length === 0 && lowStock.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            {stats.total === 0
              ? "Your pantry is empty — scan or add your first item."
              : "Nothing needs your attention today."}
          </p>
        ) : (
          <ul className="space-y-3">
            {alerts.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.storage} · {expiryText(item.expiry_date)}
                  </p>
                </div>
                <StatusBadge status={getStatus(item, soonDays)} />
              </li>
            ))}
            {lowStock.map((i) => (
              <li key={i.id} className="text-sm">
                <p className="font-medium">{i.title}</p>
                <p className="text-xs text-muted-foreground">{i.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Shopping list preview */}
      <section className="surface-card mb-6 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <ShoppingCart className="h-4 w-4 text-primary" /> Shopping list
          </h2>
          <Link to="/shopping" className="text-xs font-medium text-primary">
            View all <ArrowRight className="inline h-3 w-3" />
          </Link>
        </div>
        {openShopping.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            Nothing left to buy. Add items or let FreshTrack suggest a list.
          </p>
        ) : (
          <ul className="space-y-3">
            {openShopping.map((s) => (
              <li key={s.id} className="flex items-center gap-3">
                <Checkbox
                  id={`shop-${s.id}`}
                  checked={s.checked}
                  onCheckedChange={(v) => toggle.mutate({ id: s.id, checked: !!v })}
                />
                <label htmlFor={`shop-${s.id}`} className="min-w-0 flex-1 text-sm">
                  {s.name}
                  <span className="ml-1 text-xs text-muted-foreground">
                    {formatQty(s.quantity, s.unit)}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>





      {/* AI suggestions */}
      {suggestions.length > 0 && (
        <section className="surface-card mb-6 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <Lightbulb className="h-4 w-4 text-primary" /> Suggestions
          </h2>
          <ul className="space-y-3">
            {suggestions.map((s) => (
              <li key={s.id} className="text-sm">
                <p className="font-medium">{s.title}</p>
                <p className="text-xs leading-snug text-muted-foreground">{s.detail}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button asChild variant="secondary" className="press h-11 rounded-2xl">
              <Link to="/recipes">
                <ChefHat className="h-4 w-4" /> Cook
              </Link>
            </Button>
            <Button asChild variant="secondary" className="press h-11 rounded-2xl">
              <Link to="/assistant">
                <Sparkles className="h-4 w-4" /> Ask AI
              </Link>
            </Button>
          </div>
        </section>
      )}

      {/* Quick actions */}
      <section className="mb-6 grid grid-cols-2 gap-3">
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

      {/* Quick facts */}
      <section className="mb-6 grid grid-cols-3 gap-3">
        <Quick label="Pantry value" value={formatCurrency(stats.savings)} />
        <Quick label="Total items" value={String(stats.total)} />
        <Quick label="Expired" value={String(stats.expired)} tone="danger" />
      </section>

      {/* Recent activity */}
      <section className="surface-card mb-6 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">Recent activity</h2>
        </div>
        {activity.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
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

      <Link
        to="/analytics"
        className="surface-card press mb-2 flex items-center justify-between p-4"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <BarChart3 className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold">Full analytics</span>
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </Link>

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

function Quick({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div className="surface-card p-4 text-center">
      <p className={cn("text-lg font-bold leading-none", tone === "danger" && "text-destructive")}>
        {value}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
