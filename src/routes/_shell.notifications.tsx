import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Bell, BellRing, CheckCheck, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { EmptyState, PageContainer, PageHeader } from "@/components/layout";
import {
  useActivity,
  useNotificationMutations,
  useNotifications,
  usePantryItems,
  useSettings,
  useUpdateSettings,
  notify,
} from "@/lib/data";
import { expiryText, formatCurrency, getStatus } from "@/lib/freshtrack";
import { generateInsights, spendingInsights } from "@/lib/analytics";
import { emojiFor } from "@/lib/emoji";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Expiry Reminders | FreshTrack" },
      {
        name: "description",
        content:
          "Review FreshTrack expiry reminders and pantry alerts, and control when you get reminded before food spoils.",
      },
      { property: "og:title", content: "FreshTrack Notifications" },
      {
        property: "og:description",
        content: "Expiry reminders and pantry alerts, all in one history.",
      },
    ],
  }),
  component: NotificationsPage,
});

const TONE: Record<string, string> = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-warning",
  danger: "bg-destructive/15 text-destructive",
  info: "bg-primary-soft text-primary",
};

function NotificationsPage() {
  const { data: notifications = [], isLoading, refetch } = useNotifications();
  const { data: items = [] } = usePantryItems();
  const { data: settings } = useSettings();
  const { data: activity = [] } = useActivity(200);
  const updateSettings = useUpdateSettings();
  const { markAllRead, markRead, clearAll } = useNotificationMutations();
  const generated = useRef(false);

  const soonDays = settings?.expiry_reminder_days ?? 3;
  const enabled = settings?.notifications_enabled ?? true;

  // Generate today's reminders, insight alerts and the weekly summary once per day.
  useEffect(() => {
    if (generated.current || !enabled || items.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem("freshtrack-reminders") === today) return;
    generated.current = true;

    void (async () => {
      // 1. Expiry reminders for anything not fresh.
      const due = items.filter((i) => getStatus(i, soonDays) !== "fresh");
      for (const item of due.slice(0, 20)) {
        const expired = getStatus(item, soonDays) === "expired";
        await notify(
          expired
            ? `${emojiFor(item.name, item.category)} ${item.name} has expired`
            : `${emojiFor(item.name, item.category)} Use ${item.name} soon`,
          `${item.storage} · ${expiryText(item.expiry_date)}`,
          expired ? "danger" : "warning",
        );
      }

      // 2. Live insights: low stock, duplicates, freezing, shopping advice.
      const insights = generateInsights(items, activity, soonDays).filter(
        (i) => i.kind !== "expiring",
      );
      for (const insight of insights.slice(0, 6)) {
        await notify(
          insight.title,
          insight.detail,
          insight.tone === "bad" ? "danger" : insight.tone === "warn" ? "warning" : "info",
        );
      }

      // 3. Pantry value change since the last check.
      const spend = spendingInsights(items);
      const previous = Number(localStorage.getItem("freshtrack-pantry-value") ?? "");
      if (Number.isFinite(previous) && previous > 0) {
        const delta = spend.totalValue - previous;
        if (Math.abs(delta) >= Math.max(200, previous * 0.15)) {
          await notify(
            delta > 0 ? "📈 Your pantry value went up" : "📉 Your pantry value dropped",
            `Now ${formatCurrency(spend.totalValue)} (${delta > 0 ? "+" : "−"}${formatCurrency(Math.abs(delta))} since the last check).`,
            "info",
          );
        }
      }
      localStorage.setItem("freshtrack-pantry-value", String(spend.totalValue));

      // 4. Weekly pantry summary, once per calendar week.
      const week = `${new Date().getFullYear()}-W${Math.ceil(
        ((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86_400_000 + 1) / 7,
      )}`;
      if (localStorage.getItem("freshtrack-weekly") !== week) {
        const expired = items.filter((i) => getStatus(i, soonDays) === "expired").length;
        const soon = items.filter((i) => getStatus(i, soonDays) === "soon").length;
        await notify(
          "🗓️ Your weekly pantry summary",
          `${items.length} items worth ${formatCurrency(spend.totalValue)} · ${soon} to use soon · ${expired} expired · average pantry age ${spend.avgPantryAgeDays} days.`,
          expired > 0 ? "warning" : "success",
        );
        localStorage.setItem("freshtrack-weekly", week);
      }

      localStorage.setItem("freshtrack-reminders", today);
      void refetch();
    })();
  }, [items, activity, enabled, soonDays, refetch]);

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <PageContainer>
      <PageHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : "You're all caught up"}
        action={
          notifications.length > 0 ? (
            <Button
              variant="secondary"
              className="rounded-2xl"
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="h-4 w-4" /> Read all
            </Button>
          ) : undefined
        }
      />

      <section className="surface-card mb-5 flex items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <BellRing className="h-5 w-5" />
          </span>
          <div>
            <Label htmlFor="reminders" className="text-sm font-semibold">
              Expiry reminders
            </Label>
            <p className="text-xs text-muted-foreground">
              Alert me {soonDays} day{soonDays === 1 ? "" : "s"} before food expires
            </p>
          </div>
        </div>
        <Switch
          id="reminders"
          checked={enabled}
          onCheckedChange={(v) => {
            updateSettings.mutate({ notifications_enabled: v });
            toast.success(v ? "Reminders enabled" : "Reminders paused");
          }}
        />
      </section>

      {isLoading ? (
        <div className="surface-card h-24 animate-pulse" />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="Add items to your pantry and FreshTrack will alert you before anything spoils."
        />
      ) : (
        <>
          <ul className="space-y-2">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "surface-card animate-pop flex items-start gap-3 p-4",
                  !n.read && "ring-1 ring-primary/30",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl",
                    TONE[n.type] ?? TONE.info,
                  )}
                >
                  {n.type === "danger" ? (
                    <TriangleAlert className="h-4 w-4" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                </span>
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => !n.read && markRead.mutate(n.id)}
                >
                  <p className="text-sm font-semibold">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </button>
                {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </li>
            ))}
          </ul>

          <Button
            variant="ghost"
            className="mt-4 w-full rounded-2xl text-destructive"
            onClick={async () => {
              await clearAll.mutateAsync();
              toast.success("Notification history cleared");
            }}
          >
            <Trash2 className="h-4 w-4" /> Clear history
          </Button>
        </>
      )}
    </PageContainer>
  );
}
