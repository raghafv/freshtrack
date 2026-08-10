import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bookmark, Check, ChefHat, Clock3, Lightbulb, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
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
} from "@/lib/data";
import { suggestRecipes } from "@/lib/ai.functions";
import { daysUntil, getStatus, type PantryItem } from "@/lib/freshtrack";
import { generateInsights, type Insight } from "@/lib/analytics";
import { FoodThumb } from "@/components/food-thumb";
import { ItemDetailSheet } from "@/components/item-detail-sheet";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { friendlyMessage } from "@/lib/errors";
import { setTonightRecipe } from "@/lib/tonight-store";
import { useRecipeMutations } from "@/lib/data";

export const Route = createFileRoute("/_shell/home")({
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
  const busy = [
    "A few things would love to be used soon.",
    "Let's reduce food waste today.",
    "Here's what to cook through first.",
  ];
  return busy[now.getDate() % busy.length];
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
  const suggestions = insights.filter((i) => SUGGESTION_KINDS.includes(i.kind)).slice(0, 2);
  const shoppingPreview = shopping.slice(0, 6);
  const [detail, setDetail] = useState<PantryItem | null>(null);
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

      {/* Tonight's recommendation — generated for you */}
      <section className="animate-fade-up mb-10" style={{ animationDelay: "120ms" }}>
        <SectionHeading title="Tonight's recommendation" href="/recipes" hrefLabel="Recipes" />
        <TonightCard hasPantry={items.length > 0} />
      </section>

      {/* Quiet suggestions */}
      {suggestions.length > 0 && (
        <section className="animate-fade-up mb-10" style={{ animationDelay: "160ms" }}>
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

      {/* Shopping list — check items off without losing them */}
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

/**
 * Ready-made AI dinner idea, generated once per day from the live pantry and
 * shown with a beautiful dish photo. Tap to reveal the full method.
 */
function TonightCard({ hasPantry }: { hasPantry: boolean }) {
  const generate = useServerFn(getDailyRecipe);
  const navigate = useNavigate();
  const { save } = useRecipeMutations();
  const [open, setOpen] = useState(false);
  // One recipe per calendar day in IST — it stays put until midnight India time.
  const today = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data, isLoading } = useQuery({
    queryKey: ["tonight-recipe", today],
    queryFn: () => generate({}),
    enabled: hasPantry,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  const recipe = data?.recipe;


  if (!hasPantry) {
    return (
      <Link to="/recipes" className="surface-card press flex items-center gap-4 p-6">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <ChefHat className="h-5 w-5" strokeWidth={1.8} />
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold">Let AI plan tonight's meal</span>
          <span className="block text-[13px] text-muted-foreground">
            Add a few items and we'll cook something up.
          </span>
        </span>
      </Link>
    );
  }

  if (isLoading || !recipe) {
    return (
      <div className="surface-card h-56 animate-pulse overflow-hidden">
        <div className="h-full w-full bg-muted/60" />
      </div>
    );
  }

  return (
    <article className="surface-card overflow-hidden shadow-lift">
      <div className="gradient-hero relative px-6 pb-5 pt-8 text-primary-foreground">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12">
          <ChefHat className="h-5 w-5" strokeWidth={1.8} />
        </span>
        <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.16em] opacity-70">
          Tonight&apos;s recipe · made from your pantry
        </p>
        <h3 className="mt-1 text-[21px] font-semibold leading-snug tracking-[-0.025em]">
          {recipe.title}
        </h3>
      </div>

      <div className="p-6">
        {recipe.description && (
          <p className="text-[13.5px] leading-relaxed text-muted-foreground">
            {recipe.description}
          </p>
        )}
        <p className="mt-3 flex items-center gap-2 text-[12.5px] text-muted-foreground">
          <Clock3 className="h-4 w-4" strokeWidth={1.8} /> {recipe.minutes} min
          {recipe.uses.length > 0 && <span>· uses {recipe.uses.slice(0, 3).join(", ")}</span>}
        </p>

        {open && (
          <ol className="mt-5 space-y-3">
            {recipe.steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-[13.5px] leading-relaxed">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[12px] font-semibold text-primary">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setTonightRecipe(recipe);
              navigate({ to: "/recipes" });
            }}
            className="press inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-[13.5px] font-semibold text-primary-foreground"
          >
            Cook this <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="press rounded-full bg-secondary px-4 py-2.5 text-[13px] font-semibold"
          >
            {open ? "Hide method" : "Method"}
          </button>
          <button
            type="button"
            aria-label="Save recipe"
            disabled={save.isPending}
            onClick={() =>
              save.mutate(
                {
                  title: recipe.title,
                  minutes: recipe.minutes,
                  uses: recipe.uses,
                  missing: recipe.substitutions?.map((s) => s.missing).filter(Boolean) ?? [],
                  steps: recipe.steps,
                  mode: "surprise",
                },
                {
                  onSuccess: () => toast.success("Saved to your recipe book"),
                  onError: (e) => toast.error(friendlyMessage(e, "Could not save recipe")),
                },
              )
            }
            className="press ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary"
          >
            <Bookmark className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

      </div>
    </article>
  );
}
