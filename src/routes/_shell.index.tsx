import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  ChefHat,
  Clock3,
  Lightbulb,
  ScanLine,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout";
import { AppBar } from "@/components/app-bar";
import {
  useActivity,
  usePantryItems,
  useProfile,
  useSavedRecipes,
  useScanHistory,
  useSettings,
  useShoppingItems,
  useShoppingMutations,
} from "@/lib/data";
import { computeStats, daysUntil, getStatus } from "@/lib/freshtrack";
import { generateInsights, type Insight } from "@/lib/analytics";
import { FoodThumb } from "@/components/food-thumb";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/")({
  head: () => ({
    meta: [
      { title: "FreshTrack Home — What Needs Your Attention Today" },
      {
        name: "description",
        content:
          "Your pantry at a glance: freshness score, what's expiring, what to buy and what to cook — all from your live FreshTrack pantry.",
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

const SUGGESTION_KINDS: Insight["kind"][] = [
  "consume-first",
  "freeze",
  "shopping",
  "storage",
  "overbuying",
  "duplicate",
];

function greetingFor(now: Date) {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

/** Warm, human one-liner that rotates with the state of the pantry and the day. */
function moodLine(attention: number, total: number, now: Date) {
  if (total === 0) return "Let's fill your pantry — add your first item.";
  if (attention === 0) {
    const calm = [
      "Everything's looking fresh.",
      "Everything is under control.",
      "Nothing is going to waste today.",
    ];
    return calm[now.getDate() % calm.length];
  }
  if (attention === 1) return "Just one item needs you today.";
  const busy = [
    `Only ${attention} items need attention today.`,
    `${attention} items would love to be used soon.`,
    "Let's reduce food waste today.",
  ];
  return busy[now.getDate() % busy.length];
}

function scoreLabel(score: number) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Steady";
  return "Needs care";
}

function countdown(iso: string) {
  const d = daysUntil(iso);
  if (d < 0) return "Expired";
  if (d === 0) return "Expires today";
  if (d === 1) return "1 day left";
  return `${d} days left`;
}

/** Gentle, actionable next step for an at-risk item. */
function suggestedAction(name: string, category: string | null, days: number) {
  const n = name.toLowerCase();
  if (days < 0) return "Review →";
  if (/milk|cream|yog|curd|paneer/.test(n)) return "Use tonight →";
  if (/spinach|lettuce|herb|coriander|greens|methi/.test(n)) return "Freeze →";
  if (/berry|banana|mango|apple|fruit/.test(n) || category === "Fruits") return "Make smoothie →";
  if (category === "Vegetables") return "Cook tonight →";
  return "Use soon →";
}

function Dashboard() {
  const { data: items = [], isLoading } = usePantryItems();
  const { data: fullActivity = [] } = useActivity(200);
  const { data: shopping = [] } = useShoppingItems();
  const { data: scans = [] } = useScanHistory();
  const { data: savedRecipes = [] } = useSavedRecipes(5);
  const { data: profile } = useProfile();
  const { data: settings } = useSettings();
  const { toggle } = useShoppingMutations();

  const soonDays = settings?.expiry_reminder_days ?? 3;
  const stats = computeStats(items, soonDays);
  const insights = useMemo(
    () => generateInsights(items, fullActivity, soonDays),
    [items, fullActivity, soonDays],
  );

  const attention = items
    .filter((i) => getStatus(i, soonDays) !== "fresh")
    .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date));
  const suggestions = insights.filter((i) => SUGGESTION_KINDS.includes(i.kind)).slice(0, 2);
  const openShopping = shopping.filter((i) => !i.checked).slice(0, 8);
  const featured = savedRecipes[0];
  const firstName = (profile?.full_name ?? "there").split(" ")[0];
  const now = new Date();

  return (
    <PageContainer>
      <AppBar
        greeting={`${greetingFor(now)},`}
        name={`${firstName}.`}
        subtitle={now.toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      />

      <p className="-mt-2 mb-9 text-[15px] leading-relaxed text-muted-foreground">
        {moodLine(attention.length, items.length, now)}
      </p>

      {/* Freshness hero */}
      <section
        className="gradient-hero animate-fade-up mb-10 rounded-[2rem] px-7 py-8 text-primary-foreground shadow-lift"
        style={{ animationDelay: "40ms" }}
      >
        <div className="flex items-center gap-7">
          <FreshRing score={stats.healthScore} />
          <div className="min-w-0">
            <p className="text-[11.5px] font-medium uppercase tracking-[0.16em] opacity-70">
              Fresh score
            </p>
            <p className="mt-1.5 text-[27px] font-bold leading-none tracking-[-0.03em]">
              {scoreLabel(stats.healthScore)}
            </p>
            <p className="mt-2.5 text-[13.5px] leading-relaxed opacity-85">
              {items.length === 0
                ? "Add your first groceries to start tracking."
                : attention.length === 0
                  ? `All ${items.length} items are comfortably fresh.`
                  : `${attention.length} item${attention.length === 1 ? "" : "s"} should be used soon.`}
            </p>
          </div>
        </div>
      </section>

      {/* Needs attention — Wallet-style horizontal cards */}
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
              ? "Your pantry is empty — tap the plus button to add your first item."
              : "Nothing needs your attention today. Enjoy the calm."}
          </div>
        ) : (
          <div className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 no-scrollbar">
            {attention.slice(0, 8).map((item) => {
              const days = daysUntil(item.expiry_date);
              const status = getStatus(item, soonDays);
              return (
                <article
                  key={item.id}
                  className="surface-card w-[78%] max-w-[19rem] shrink-0 snap-center overflow-hidden p-5 shadow-lift"
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
                  <Link
                    to="/recipes"
                    className="press mt-4 inline-flex text-[13.5px] font-semibold text-primary"
                  >
                    {suggestedAction(item.name, item.category, days)}
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Tonight's recommendation */}
      <section className="animate-fade-up mb-10" style={{ animationDelay: "120ms" }}>
        <SectionHeading title="Tonight's recommendation" href="/recipes" hrefLabel="Recipes" />
        {featured ? (
          <Link
            to="/recipes"
            className="surface-card press block overflow-hidden p-6 shadow-lift"
          >
            <p className="text-[11.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              From your saved recipes
            </p>
            <h3 className="mt-2 text-[22px] font-semibold leading-snug tracking-[-0.025em]">
              {featured.title}
            </h3>
            {featured.uses.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {featured.uses.slice(0, 3).map((u) => (
                  <li key={u} className="flex items-center gap-2 text-[13.5px] text-muted-foreground">
                    <span className="text-primary">✓</span> {u}
                  </li>
                ))}
              </ul>
            )}
            <span className="press mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-[13.5px] font-semibold text-primary-foreground">
              Cook <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        ) : (
          <Link to="/recipes" className="surface-card press flex items-center gap-4 p-6">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <ChefHat className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold">Let AI plan tonight's meal</span>
              <span className="block text-[13px] text-muted-foreground">
                Built from what you already own.
              </span>
            </span>
          </Link>
        )}
      </section>

      {/* Shopping chips */}
      <section className="animate-fade-up mb-10" style={{ animationDelay: "160ms" }}>
        <SectionHeading title="Shopping" href="/shopping" hrefLabel="View all" />
        {openShopping.length === 0 ? (
          <div className="surface-card px-7 py-8 text-center text-[13.5px] text-muted-foreground">
            Nothing left to buy.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {openShopping.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggle.mutate({ id: s.id, checked: true })}
                className="press surface-card flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4"
              >
                <FoodThumb
                  name={s.name}
                  category={s.category}
                  className="h-8 w-8 rounded-full"
                  emojiClassName="text-base"
                />
                <span className="text-[13.5px] font-medium">{s.name}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Recently added chips */}
      {recentlyAdded.length > 0 && (
        <section className="animate-fade-up mb-10" style={{ animationDelay: "200ms" }}>
          <SectionHeading title="Recently added" />
          <div className="-mx-6 flex gap-3 overflow-x-auto px-6 pb-1 no-scrollbar">
            {recentlyAdded.map((s) => (
              <div
                key={s.id}
                className="surface-card flex shrink-0 items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4"
              >
                <FoodThumb
                  name={s.name}
                  className="h-8 w-8 rounded-full"
                  emojiClassName="text-base"
                />
                <span className="whitespace-nowrap text-[13px] font-medium">{s.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}


      {/* Quiet suggestions */}
      {suggestions.length > 0 && (
        <section className="animate-fade-up mb-10" style={{ animationDelay: "240ms" }}>
          <SectionHeading title="Suggestions" />
          <div className="surface-card space-y-4 p-6">
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
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Button asChild variant="secondary" className="press h-12 rounded-2xl">
                <Link to="/recipes">
                  <ChefHat className="h-4 w-4" /> Cook
                </Link>
              </Button>
              <Button asChild variant="secondary" className="press h-12 rounded-2xl">
                <Link to="/assistant">
                  <Sparkles className="h-4 w-4" /> Ask
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Quiet footer links */}
      <section className="grid gap-3">
        <QuietLink to="/pantry" icon={Clock3} label={`${stats.total} items tracked`} />
        <QuietLink to="/scanner" icon={ScanLine} label="Open scanner" />
        <QuietLink to="/shopping" icon={ShoppingCart} label="Shopping list" />
        <QuietLink to="/analytics" icon={BarChart3} label="Full analytics" />
      </section>
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

function FreshRing({ score }: { score: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, score)) / 100) * c;
  return (
    <div className="relative h-[86px] w-[86px] shrink-0">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="opacity-20"
        />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.2,0.8,0.2,1)" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[22px] font-bold tracking-[-0.03em]">
        {score}
      </span>
    </div>
  );
}

function QuietLink({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof Clock3;
  label: string;
}) {
  return (
    <Link to={to} className="surface-card press flex items-center justify-between px-5 py-4">
      <span className="flex items-center gap-3.5">
        <Icon className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.7} />
        <span className="text-[14px] font-medium">{label}</span>
      </span>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
