import {
  daysUntil,
  getStatus,
  toISODate,
  type ActivityEntry,
  type PantryItem,
} from "@/lib/freshtrack";
import { isCookingIngredient } from "@/lib/food-guard";

const AVG_ITEM_VALUE = 120;

export function itemValue(item: PantryItem): number {
  return item.price ?? AVG_ITEM_VALUE;
}

/* ------------------------------ health score ------------------------------ */

export interface HealthReason {
  text: string;
  tone: "good" | "warn" | "bad";
}

export interface HealthExplanation {
  headline: string;
  reasons: HealthReason[];
}

export function explainHealth(items: PantryItem[], soonDays = 3): HealthExplanation {
  if (items.length === 0) {
    return {
      headline: "Nothing tracked yet — add items to get a real score.",
      reasons: [{ text: "An empty pantry scores 100 by default.", tone: "good" }],
    };
  }

  const expired = items.filter((i) => getStatus(i, soonDays) === "expired");
  const soon = items.filter((i) => getStatus(i, soonDays) === "soon");
  const week = items.filter((i) => {
    const d = daysUntil(i.expiry_date);
    return d >= 0 && d <= 7;
  });
  const longLife = items.filter((i) => daysUntil(i.expiry_date) > 30);

  const reasons: HealthReason[] = [];
  if (expired.length > 0)
    reasons.push({
      text: `${expired.length} expired item${expired.length > 1 ? "s" : ""} drag the score down the most — remove or discard them.`,
      tone: "bad",
    });
  if (soon.length > 0)
    reasons.push({
      text: `${soon.length} item${soon.length > 1 ? "s are" : " is"} inside the last ${soonDays} days and count only partially.`,
      tone: "warn",
    });
  if (week.length > soon.length)
    reasons.push({
      text: `${week.length} items expire within a week — cook or freeze them to lift the score.`,
      tone: "warn",
    });
  if (longLife.length > 0)
    reasons.push({
      text: `${longLife.length} item${longLife.length > 1 ? "s have" : " has"} over a month of life left and score full marks.`,
      tone: "good",
    });
  if (reasons.length === 0)
    reasons.push({ text: "Every item is comfortably fresh.", tone: "good" });

  const headline =
    expired.length > 0
      ? "Expired stock is the main problem"
      : soon.length > 0
        ? "A few items need using up"
        : "Your pantry is in great shape";

  return { headline, reasons };
}

/* ------------------------------- distribution ----------------------------- */

export interface Slice {
  name: string;
  value: number;
}

export function categoryDistribution(items: PantryItem[]): Slice[] {
  const map = new Map<string, number>();
  for (const i of items) map.set(i.category, (map.get(i.category) ?? 0) + 1);
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function storageDistribution(items: PantryItem[]): Slice[] {
  const map = new Map<string, number>();
  for (const i of items) map.set(i.storage, (map.get(i.storage) ?? 0) + 1);
  return [...map.entries()].map(([name, value]) => ({ name, value }));
}

/* --------------------------------- waste ---------------------------------- */

export interface MonthPoint {
  month: string;
  wasted: number;
  items: number;
}

function monthLabel(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short" });
}

/** Waste value per month over the last `months` months, from expired items. */
export function monthlyWaste(items: PantryItem[], months = 6): MonthPoint[] {
  const now = new Date();
  const buckets: MonthPoint[] = [];
  const index = new Map<string, MonthPoint>();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const point: MonthPoint = { month: monthLabel(d), wasted: 0, items: 0 };
    buckets.push(point);
    index.set(`${d.getFullYear()}-${d.getMonth()}`, point);
  }

  for (const item of items) {
    if (daysUntil(item.expiry_date) >= 0) continue;
    const d = new Date(`${item.expiry_date}T00:00:00`);
    const point = index.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (!point) continue;
    point.wasted += itemValue(item);
    point.items += 1;
  }

  return buckets.map((b) => ({ ...b, wasted: Math.round(b.wasted) }));
}

export function mostWastedCategory(
  items: PantryItem[],
): { category: string; value: number } | null {
  const map = new Map<string, number>();
  for (const i of items) {
    if (daysUntil(i.expiry_date) >= 0) continue;
    map.set(i.category, (map.get(i.category) ?? 0) + itemValue(i));
  }
  const top = [...map.entries()].sort((a, b) => b[1] - a[1])[0];
  return top ? { category: top[0], value: Math.round(top[1]) } : null;
}

/* ------------------------------- purchasing ------------------------------- */

export interface PurchaseStat {
  name: string;
  count: number;
  lastPurchase: string;
  /** Average days between purchases, null when only bought once. */
  intervalDays: number | null;
}

/** Buy-history per product derived from the activity log plus current stock. */
export function purchaseHistory(activity: ActivityEntry[], items: PantryItem[]): PurchaseStat[] {
  const map = new Map<string, string[]>();

  for (const entry of activity) {
    if (entry.action !== "added" || !entry.item_name) continue;
    const key = entry.item_name.trim().toLowerCase();
    const list = map.get(key) ?? [];
    list.push(entry.created_at.slice(0, 10));
    map.set(key, list);
  }
  for (const item of items) {
    const key = item.name.trim().toLowerCase();
    const list = map.get(key) ?? [];
    if (!list.includes(item.purchase_date)) list.push(item.purchase_date);
    map.set(key, list);
  }

  const label = new Map<string, string>();
  for (const item of items) label.set(item.name.trim().toLowerCase(), item.name);
  for (const entry of activity)
    if (entry.item_name) label.set(entry.item_name.trim().toLowerCase(), entry.item_name);

  return [...map.entries()]
    .map(([key, rawDates]) => {
      const dates = [...new Set(rawDates)].sort();
      const count = dates.length;
      let interval: number | null = null;
      if (count > 1) {
        let total = 0;
        for (let i = 1; i < dates.length; i++) {
          total +=
            (new Date(`${dates[i]}T00:00:00`).getTime() -
              new Date(`${dates[i - 1]}T00:00:00`).getTime()) /
            86_400_000;
        }
        interval = Math.max(1, Math.round(total / (dates.length - 1)));
      }
      return {
        name: label.get(key) ?? key,
        count,
        lastPurchase: dates[dates.length - 1],
        intervalDays: interval,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export interface RunOutPrediction {
  name: string;
  /** ISO date we expect the household to run out. */
  runsOutOn: string;
  daysLeft: number;
  /** ISO date to buy it again. */
  buyOn: string;
  basis: string;
}

/** Predicts run-out + repurchase dates from buying rhythm and remaining shelf life. */
export function predictRunOut(
  activity: ActivityEntry[],
  items: PantryItem[],
  limit = 6,
): RunOutPrediction[] {
  const history = purchaseHistory(activity, items);
  const inStock = new Map<string, PantryItem>();
  for (const i of items) inStock.set(i.name.trim().toLowerCase(), i);

  const out: RunOutPrediction[] = [];
  for (const stat of history) {
    if (!stat.intervalDays) continue;
    const key = stat.name.trim().toLowerCase();
    const item = inStock.get(key);

    const sinceLast = Math.round(
      (Date.now() - new Date(`${stat.lastPurchase}T00:00:00`).getTime()) / 86_400_000,
    );
    let daysLeft = stat.intervalDays - sinceLast;
    let basis = `bought ${stat.count}× · about every ${stat.intervalDays} days`;

    if (item) {
      const shelf = daysUntil(item.expiry_date);
      if (shelf < daysLeft) {
        daysLeft = shelf;
        basis = `${basis} · limited by expiry`;
      }
    } else {
      daysLeft = Math.min(daysLeft, 0);
      basis = `${basis} · none left in the pantry`;
    }

    const runsOut = new Date();
    runsOut.setHours(0, 0, 0, 0);
    runsOut.setDate(runsOut.getDate() + daysLeft);
    const buy = new Date(runsOut);
    buy.setDate(buy.getDate() - 2);

    out.push({
      name: stat.name,
      runsOutOn: toISODate(runsOut),
      daysLeft,
      buyOn: toISODate(buy < new Date() ? new Date() : buy),
      basis,
    });
  }

  return out.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, limit);
}

/* -------------------------------- spending -------------------------------- */

export interface SpendingInsights {
  totalValue: number;
  pricedItems: number;
  avgItemValue: number;
  monthSpend: number;
  topCategory: { category: string; value: number } | null;
  avgPantryAgeDays: number;
}

export function spendingInsights(items: PantryItem[]): SpendingInsights {
  const priced = items.filter((i) => i.price != null);
  const total = items.reduce((sum, i) => sum + itemValue(i), 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthSpend = items
    .filter((i) => i.purchase_date.slice(0, 7) === thisMonth)
    .reduce((sum, i) => sum + itemValue(i), 0);

  const byCategory = new Map<string, number>();
  for (const i of items)
    byCategory.set(i.category, (byCategory.get(i.category) ?? 0) + itemValue(i));
  const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];

  const ageDays = items.length
    ? items.reduce(
        (sum, i) =>
          sum +
          Math.max(
            0,
            Math.round(
              (Date.now() - new Date(`${i.purchase_date}T00:00:00`).getTime()) / 86_400_000,
            ),
          ),
        0,
      ) / items.length
    : 0;

  return {
    totalValue: Math.round(total),
    pricedItems: priced.length,
    avgItemValue: items.length ? Math.round(total / items.length) : 0,
    monthSpend: Math.round(monthSpend),
    topCategory: top ? { category: top[0], value: Math.round(top[1]) } : null,
    avgPantryAgeDays: Math.round(ageDays),
  };
}

/* -------------------------------- insights -------------------------------- */

export type InsightKind =
  | "expiring"
  | "low-stock"
  | "duplicate"
  | "consume-first"
  | "storage"
  | "shopping"
  | "freeze"
  | "overbuying";

export interface Insight {
  id: string;
  kind: InsightKind;
  title: string;
  detail: string;
  tone: "good" | "warn" | "bad" | "info";
}

const LOW_STOCK_THRESHOLD: Record<string, number> = { pcs: 2, L: 0.5, mL: 300, kg: 0.3, g: 200 };

/** Live, data-derived pantry advice — no AI call required. */
export function generateInsights(
  items: PantryItem[],
  activity: ActivityEntry[] = [],
  soonDays = 3,
): Insight[] {
  const insights: Insight[] = [];
  const foodItems = items.filter((item) => isCookingIngredient(item.name));

  const expiring = foodItems
    .filter((i) => {
      const d = daysUntil(i.expiry_date);
      return d >= 0 && d <= soonDays;
    })
    .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date));

  if (expiring.length > 0) {
    insights.push({
      id: "expiring",
      kind: "expiring",
      title: `${expiring.length} item${expiring.length > 1 ? "s" : ""} expiring within ${soonDays} days`,
      detail: expiring
        .slice(0, 4)
        .map((i) => `${i.name} (${Math.max(0, daysUntil(i.expiry_date))}d)`)
        .join(", "),
      tone: "warn",
    });
    insights.push({
      id: "consume-first",
      kind: "consume-first",
      title: `Finish ${expiring[0].name} first`,
      detail: `It has the least life left of everything you own — plan today's meal around it.`,
      tone: "info",
    });
  }

  const expired = foodItems.filter((i) => daysUntil(i.expiry_date) < 0);
  if (expired.length > 0) {
    insights.push({
      id: "expired",
      kind: "expiring",
      title: `${expired.length} expired item${expired.length > 1 ? "s" : ""} still listed`,
      detail: "Remove them to keep your health score and waste numbers accurate.",
      tone: "bad",
    });
  }

  const freezable = foodItems.filter(
    (i) =>
      i.storage !== "Freezer" &&
      daysUntil(i.expiry_date) >= 0 &&
      daysUntil(i.expiry_date) <= soonDays + 2 &&
      ["Meat & Seafood", "Bakery", "Dairy", "Produce", "Vegetables", "Fruits"].includes(i.category),
  );
  if (freezable.length > 0) {
    insights.push({
      id: "freeze",
      kind: "freeze",
      title: `Freeze ${freezable.length} item${freezable.length > 1 ? "s" : ""} to buy more time`,
      detail: `${freezable
        .slice(0, 3)
        .map((i) => i.name)
        .join(", ")} will last months in the freezer instead of days.`,
      tone: "info",
    });
  }

  const lowStock = foodItems.filter((i) => {
    const t = LOW_STOCK_THRESHOLD[i.unit] ?? 1;
    return Number(i.quantity) <= t && daysUntil(i.expiry_date) >= 0;
  });
  if (lowStock.length > 0) {
    insights.push({
      id: "low-stock",
      kind: "low-stock",
      title: `Running low on ${lowStock.length} item${lowStock.length > 1 ? "s" : ""}`,
      detail: lowStock
        .slice(0, 4)
        .map((i) => `${i.name} (${i.quantity} ${i.unit})`)
        .join(", "),
      tone: "warn",
    });
  }

  const byName = new Map<string, PantryItem[]>();
  for (const i of foodItems) {
    const key = i.name.trim().toLowerCase();
    byName.set(key, [...(byName.get(key) ?? []), i]);
  }
  const dupes = [...byName.values()].filter((list) => list.length > 1);
  if (dupes.length > 0) {
    insights.push({
      id: "duplicate",
      kind: "duplicate",
      title: `${dupes.length} product${dupes.length > 1 ? "s are" : " is"} listed more than once`,
      detail:
        dupes
          .slice(0, 3)
          .map((l) => `${l[0].name} ×${l.length}`)
          .join(", ") + " — merge them to see true stock.",
      tone: "info",
    });
  }

  const misplaced = items.filter(
    (i) =>
      (["Meat & Seafood"].includes(i.category) && i.storage === "Pantry") ||
      (i.category === "Dairy" && i.storage === "Pantry") ||
      (i.category === "Frozen" && i.storage !== "Freezer"),
  );
  if (misplaced.length > 0) {
    insights.push({
      id: "storage",
      kind: "storage",
      title: `Move ${misplaced.length} item${misplaced.length > 1 ? "s" : ""} to cold storage`,
      detail: `${misplaced
        .slice(0, 3)
        .map((i) => `${i.name} → ${i.category === "Frozen" ? "Freezer" : "Fridge"}`)
        .join(", ")}.`,
      tone: "warn",
    });
  }

  const overbought = purchaseHistory(activity, items).filter(
    (s) => s.count >= 3 && (s.intervalDays ?? 99) <= 3,
  );
  if (overbought.length > 0) {
    insights.push({
      id: "overbuying",
      kind: "overbuying",
      title: `You may be over-buying ${overbought[0].name}`,
      detail: `Bought ${overbought[0].count} times roughly every ${overbought[0].intervalDays} days — skip it on the next trip.`,
      tone: "info",
    });
  }

  const runOut = predictRunOut(activity, items, 3).filter((p) => p.daysLeft <= 3);
  if (runOut.length > 0) {
    insights.push({
      id: "shopping",
      kind: "shopping",
      title: `Restock ${runOut
        .map((p) => p.name)
        .slice(0, 3)
        .join(", ")} soon`,
      detail: `Based on how often you buy them, you'll run out around ${runOut[0].runsOutOn}.`,
      tone: "info",
    });
  }

  if (insights.length === 0 && items.length > 0) {
    insights.push({
      id: "all-good",
      kind: "expiring",
      title: "Nothing needs your attention",
      detail: "No expiring stock, no duplicates and no storage problems right now.",
      tone: "good",
    });
  }

  return insights;
}
