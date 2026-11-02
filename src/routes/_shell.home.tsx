import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, ChefHat, Lightbulb, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout";
import { AppBar } from "@/components/app-bar";
import {
  useActivity,
  usePantryItems,
  useProfile,
  useSettings,
  useShoppingItems,
  useShoppingMutations,
  useDeletePantryItems,
} from "@/lib/data";
import { daysUntil, getStatus, type PantryItem } from "@/lib/freshtrack";
import { explainHealth, generateInsights } from "@/lib/analytics";
import { FoodThumb } from "@/components/food-thumb";
import { ItemDetailSheet } from "@/components/item-detail-sheet";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { friendlyMessage } from "@/lib/errors";

export const Route = createFileRoute("/_shell/home")({
  head: () => ({
    meta: [
      { title: "FreshTrack Home | What Needs Your Attention Today" },
      {
        name: "description",
        content:
          "Your pantry at a glance: freshness score, what's expiring, what to buy and what to cook - all from your live FreshTrack pantry.",
      },
      { property: "og:title", content: "FreshTrack Home" },
      {
        property: "og:description",
        content: "Freshness score, expiring items, shopping and recipe ideas in one calm view.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function greetingFor(now: Date) {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

/** Warm, human one-liner that rotates with the state of the pantry and the day. */
function moodLine(attention: number, total: number, now: Date) {
  if (total === 0) return "Let's fill your pantry - add your first item.";
  if (attention === 0) {
    const calm = [
      "Everything's looking fresh.",
      "Everything is under control.",
      "Nothing is going to waste today.",
    ];
    return calm[now.getDate() % calm.length];
  }
  const busy = [
    "A few things would love to be used soon.",
    "Let's reduce food waste today.",
    "Here's what to cook through first.",
  ];
  return busy[now.getDate() % busy.length];
}

function expiredAgo(iso: string) {
  const d = -daysUntil(iso);
  return d === 1 ? "expired yesterday" : `expired ${d} days ago`;
}

function countdown(iso: string) {
  const d = daysUntil(iso);
  if (d < 0) return "Expired";
  if (d === 0) return "Expires today";
  if (d === 1) return "1 day left";
  return `${d} days left`;
}


function Dashboard() {
  const { data: items = [], isLoading } = usePantryItems();
  const { data: fullActivity = [] } = useActivity(200);
  const { data: shopping = [] } = useShoppingItems();
  const { data: profile } = useProfile();
  const { data: settings } = useSettings();
  const { toggle } = useShoppingMutations();

  const soonDays = settings?.expiry_reminder_days ?? 3;
  const insights = useMemo(
    () => generateInsights(items, fullActivity, soonDays),
    [items, fullActivity, soonDays],
  );

  const attention = items
    .filter((i) => getStatus(i, soonDays) !== "fresh")
    .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date));
  const expired = attention.filter((i) => daysUntil(i.expiry_date) < 0).slice(0, 3);
  const remove = useDeletePantryItems();
  const clearItem = (item: PantryItem, how: string) =>
    remove.mutate([{ id: item.id, name: item.name, image_url: item.image_url }], {
      onSuccess: () => toast.success(`${how}: ${item.name} removed from pantry`),
      onError: (e) => toast.error(friendlyMessage(e, "Could not remove item")),
    });
  const health = useMemo(() => explainHealth(items, soonDays), [items, soonDays]);
  const suggestions = insights.slice(0, 6);
  const shoppingPreview = shopping.slice(0, 6);
  const [detail, setDetail] = useState<PantryItem | null>(null);
  const firstName = (profile?.full_name ?? "there").split(" ")[0];
  // Time-based text (greeting, date, mood) must render only after hydration -
  // server (UTC) and browser (IST) clocks disagree, which previously crashed
  // hydration with a removeChild error on first load.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const now = mounted ? new Date() : null;

  return (
    <PageContainer>
      <AppBar
        greeting={now ? `${greetingFor(now)},` : "Hello,"}
        name={`${firstName}.`}
        subtitle={
          now
            ? now.toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "long",
              })
            : " "
        }
      />

      <p className="-mt-2 mb-9 text-[15px] leading-relaxed text-muted-foreground">
        {now ? moodLine(attention.length, items.length, now) : " "}
      </p>

      {/* Needs attention - Wallet-style horizontal cards */}
      <section className="animate-fade-up mb-10" style={{ animationDelay: "80ms" }}>
        <SectionHeading
          title="Needs attention"
          href="/pantry"
          hrefLabel="Pantry"
        />
        {isLoading ? (
          <div className="surface-card h-40 animate-pulse" />
        ) : attention.length === 0 ? (
          <div className="surface-card px-7 py-10 text-center text-[13.5px] leading-relaxed text-muted-foreground">
            {items.length === 0
              ? "Your pantry is empty - tap the plus button to add your first item."
              : "Nothing needs your attention today. Enjoy the calm."}
          </div>
        ) : (
          <div className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 no-scrollbar">
            {attention.slice(0, 8).map((item) => {
              const status = getStatus(item, soonDays);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDetail(item)}
                  className="press surface-card w-[78%] max-w-[19rem] shrink-0 snap-center overflow-hidden p-5 text-left shadow-lift"
                >
                  <FoodThumb
                    name={item.name}
                    category={item.category}
                    imageUrl={item.image_url}
                    className="mb-4 h-32 w-full rounded-[1.25rem]"
                    emojiClassName="text-5xl"
                  />
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        status === "expired" ? "bg-destructive" : "bg-warning",
                      )}
                    />
                    <p className="text-[12.5px] font-medium text-muted-foreground">
                      {countdown(item.expiry_date)}
                    </p>
                  </div>
                  <h3 className="mt-1 truncate text-[19px] font-semibold tracking-[-0.02em]">
                    {item.name}
                  </h3>
                </button>
              );
            })}

          </div>
        )}
      </section>

      {/* Cook from pantry - deliberate recipe creation lives on /recipes */}
      <section className="animate-fade-up mb-10" style={{ animationDelay: "120ms" }}>
        <Link
          to="/recipes"
          className="press surface-card flex items-center gap-4 p-5 shadow-lift"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <ChefHat className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold tracking-[-0.01em]">Cook from your pantry</span>
            <span className="block text-[12.5px] text-muted-foreground">
              {items.length > 0
                ? `Recipes built around your ${items.length} item${items.length === 1 ? "" : "s"}`
                : "Add a few items to get recipe ideas"}
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
      </section>

      {/* Pantry insights & suggestions */}
      <section className="animate-fade-up mb-10" style={{ animationDelay: "160ms" }}>
        <SectionHeading title="Pantry insights" href="/analytics" hrefLabel="Full analytics" />
        <div className="surface-card space-y-5 p-6">
          <div className="flex gap-3.5">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.8} />
            <div className="min-w-0">
              <p className="text-[14px] font-medium">{health.headline}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                {health.reasons[0]?.text}
              </p>
            </div>
          </div>

          {expired.map((item) => (
            <div key={item.id} className="flex gap-3.5">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={1.8} />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium">
                  {item.name} {expiredAgo(item.expiry_date)}
                </p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                  Threw it away or used it up? Clear it from your pantry.
                </p>
                <div className="mt-2.5 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="press h-9 rounded-full"
                    disabled={remove.isPending}
                    onClick={() => clearItem(item, "Discarded")}
                  >
                    Discarded
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="press h-9 rounded-full"
                    disabled={remove.isPending}
                    onClick={() => clearItem(item, "Used up")}
                  >
                    Used up
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {suggestions.map((s) => (
            <div key={s.id} className="flex gap-3.5">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.8} />
              <div className="min-w-0">
                <p className="text-[14px] font-medium">{s.title}</p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                  {s.detail}
                </p>
              </div>
            </div>
          ))}

          <Button asChild variant="secondary" className="press mt-1 h-12 w-full rounded-2xl">
            <Link to="/analytics">
              Full analytics
            </Link>
          </Button>
        </div>
      </section>

      {/* Shopping list - check items off without losing them */}
      <section className="animate-fade-up mb-4" style={{ animationDelay: "200ms" }}>
        <SectionHeading title="Shopping list" href="/shopping" hrefLabel="View all" />
        {shoppingPreview.length === 0 ? (
          <div className="surface-card px-7 py-8 text-center text-[13.5px] text-muted-foreground">
            Nothing on your list yet.
          </div>
        ) : (
          <ul className="surface-card divide-y divide-border/50 overflow-hidden">
            {shoppingPreview.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => toggle.mutate({ id: s.id, checked: !s.checked })}
                  aria-pressed={s.checked}
                  className={cn(
                    "press flex w-full items-center gap-3.5 px-5 py-3.5 text-left transition-opacity",
                    s.checked && "opacity-45",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      s.checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border",
                    )}
                  >
                    {s.checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                  <FoodThumb
                    name={s.name}
                    category={s.category}
                    className="h-9 w-9 rounded-full"
                    emojiClassName="text-base"
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-[14.5px] font-medium",
                        s.checked && "line-through",
                      )}
                    >
                      {s.name}
                    </span>
                    <span className="block text-[12px] text-muted-foreground">{s.category}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ItemDetailSheet
        item={detail}
        soonDays={soonDays}
        onOpenChange={(o) => !o && setDetail(null)}
      />
    </PageContainer>
  );
}


function SectionHeading({
  title,
  href,
  hrefLabel,
}: {
  title: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3 px-0.5">
      <h2 className="text-[19px] font-semibold tracking-[-0.025em]">{title}</h2>
      {href && (
        <Link to={href} className="text-[13px] font-medium text-primary">
          {hrefLabel}
        </Link>
      )}
    </div>
  );
}
