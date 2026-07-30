export const CATEGORIES = [
  "Dairy",
  "Fruits",
  "Vegetables",
  "Produce",
  "Meat & Seafood",
  "Bakery",
  "Frozen",
  "Beverages",
  "Grains & Pasta",
  "Snacks",
  "Condiments",
  "Spices",
  "Other",
] as const;


export const STORAGE_TYPES = ["Fridge", "Freezer", "Pantry"] as const;
export const UNITS = ["kg", "g", "L", "mL", "pcs"] as const;

export type Category = (typeof CATEGORIES)[number];
export type StorageType = (typeof STORAGE_TYPES)[number];
export type Unit = (typeof UNITS)[number];
export type ItemStatus = "fresh" | "soon" | "expired";

export interface PantryItem {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  category: string;
  quantity: number;
  unit: string;
  purchase_date: string;
  expiry_date: string;
  storage: string;
  image_url: string | null;
  source: string;
  price: number | null;
  created_at: string;
  updated_at: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  checked: boolean;
  created_at: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  created_at: string;
}

export interface ActivityEntry {
  id: string;
  action: string;
  item_name: string | null;
  detail: string | null;
  created_at: string;
}

export interface ScanEntry {
  id: string;
  method: string;
  items_added: number;
  note: string | null;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  theme: "light" | "dark" | "system";
  notifications_enabled: boolean;
  expiry_reminder_days: number;
  default_storage: string;
  default_unit: string;
}

/** Typical shelf life in days by category and storage location. */
const SHELF_LIFE: Record<string, Record<StorageType, number>> = {
  Dairy: { Fridge: 10, Freezer: 90, Pantry: 3 },
  Produce: { Fridge: 8, Freezer: 240, Pantry: 5 },
  Fruits: { Fridge: 12, Freezer: 240, Pantry: 5 },
  Vegetables: { Fridge: 8, Freezer: 240, Pantry: 6 },
  "Meat & Seafood": { Fridge: 3, Freezer: 180, Pantry: 1 },
  Bakery: { Fridge: 10, Freezer: 90, Pantry: 4 },
  Frozen: { Fridge: 3, Freezer: 270, Pantry: 1 },
  Beverages: { Fridge: 14, Freezer: 120, Pantry: 180 },
  "Grains & Pasta": { Fridge: 180, Freezer: 365, Pantry: 365 },
  Snacks: { Fridge: 90, Freezer: 180, Pantry: 120 },
  Condiments: { Fridge: 180, Freezer: 365, Pantry: 270 },
  Spices: { Fridge: 400, Freezer: 400, Pantry: 365 },
  Other: { Fridge: 14, Freezer: 120, Pantry: 60 },
};

/** Rough per-unit value (INR) used to estimate money saved by not wasting food. */
const AVG_ITEM_VALUE = 120;

/** Formats a number as Indian Rupees. */
export function formatCurrency(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits,
  }).format(value);
}


export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function estimateExpiry(
  category: string,
  storage: string,
  purchaseDate: string,
): string {
  const table = SHELF_LIFE[category] ?? SHELF_LIFE.Other;
  const days = table[(storage as StorageType) ?? "Pantry"] ?? 14;
  const base = new Date(`${purchaseDate}T00:00:00`);
  base.setDate(base.getDate() + days);
  return toISODate(base);
}

export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function getStatus(item: { expiry_date: string }, soonDays = 3): ItemStatus {
  const d = daysUntil(item.expiry_date);
  if (d < 0) return "expired";
  if (d <= soonDays) return "soon";
  return "fresh";
}

export const STATUS_LABEL: Record<ItemStatus, string> = {
  fresh: "Fresh",
  soon: "Use Soon",
  expired: "Expired",
};

export function expiryText(dateStr: string): string {
  const d = daysUntil(dateStr);
  if (d < 0) return `Expired ${Math.abs(d)}d ago`;
  if (d === 0) return "Expires today";
  if (d === 1) return "Expires tomorrow";
  return `${d} days left`;
}

export interface PantryStats {
  total: number;
  fresh: number;
  soon: number;
  expired: number;
  addedToday: number;
  healthScore: number;
  savings: number;
  wastePrevented: number;
  /** Items expiring within the next 7 days (not yet expired). */
  expiringThisWeek: number;
  /** Average days of life left across non-expired items. */
  avgDaysLeft: number;
  /** Rupee value sitting in items that are expired or expiring soon. */
  atRiskValue: number;
  /** Rupee value already lost to expired items. */
  wastedValue: number;
}

/** Freshness of a single item on a 0-1 scale, derived purely from its expiry date. */
export function itemFreshness(item: { expiry_date: string }, soonDays = 3): number {
  const d = daysUntil(item.expiry_date);
  if (d < 0) return 0;
  if (d === 0) return 0.15;
  if (d <= soonDays) return 0.35 + 0.3 * (d / Math.max(1, soonDays));
  return Math.min(1, 0.7 + 0.3 * Math.min(1, (d - soonDays) / 14));
}

export function computeStats(items: PantryItem[], soonDays = 3): PantryStats {
  const today = toISODate(new Date());
  let fresh = 0;
  let soon = 0;
  let expired = 0;
  let addedToday = 0;
  let expiringThisWeek = 0;
  let freshnessSum = 0;
  let daysSum = 0;
  let aliveCount = 0;
  let atRiskValue = 0;
  let wastedValue = 0;

  for (const item of items) {
    const status = getStatus(item, soonDays);
    const days = daysUntil(item.expiry_date);
    const value = item.price ?? AVG_ITEM_VALUE;

    if (status === "fresh") fresh++;
    else if (status === "soon") soon++;
    else expired++;

    if (days >= 0) {
      aliveCount++;
      daysSum += days;
      if (days <= 7) expiringThisWeek++;
      if (status === "soon") atRiskValue += value;
    } else {
      wastedValue += value;
    }

    freshnessSum += itemFreshness(item, soonDays);
    if (item.created_at.slice(0, 10) === today) addedToday++;
  }

  const total = items.length;
  const healthScore = total === 0 ? 100 : Math.round((freshnessSum / total) * 100);

  const savings = Number(
    items
      .filter((i) => getStatus(i, soonDays) !== "expired")
      .reduce((sum, i) => sum + (i.price ?? AVG_ITEM_VALUE), 0)
      .toFixed(2),
  );

  const wastePrevented = Number(((fresh + soon) * 0.45).toFixed(1));

  return {
    total,
    fresh,
    soon,
    expired,
    addedToday,
    healthScore,
    savings,
    wastePrevented,
    expiringThisWeek,
    avgDaysLeft: aliveCount === 0 ? 0 : Math.round(daysSum / aliveCount),
    atRiskValue: Number(atRiskValue.toFixed(2)),
    wastedValue: Number(wastedValue.toFixed(2)),
  };
}

export function formatQty(quantity: number, unit: string): string {
  const q = Number.isInteger(quantity) ? quantity : Number(quantity.toFixed(2));
  return `${q} ${unit}`;
}

export function guessCategory(name: string): string {
  const n = name.toLowerCase();
  const map: [string, string][] = [
    ["milk", "Dairy"],
    ["cheese", "Dairy"],
    ["yogurt", "Dairy"],
    ["butter", "Dairy"],
    ["curd", "Dairy"],
    ["paneer", "Dairy"],
    ["egg", "Dairy"],
    ["chicken", "Meat & Seafood"],
    ["fish", "Meat & Seafood"],
    ["mutton", "Meat & Seafood"],
    ["prawn", "Meat & Seafood"],
    ["beef", "Meat & Seafood"],
    ["bread", "Bakery"],
    ["bun", "Bakery"],
    ["cake", "Bakery"],
    ["tomato", "Produce"],
    ["onion", "Produce"],
    ["potato", "Produce"],
    ["apple", "Produce"],
    ["banana", "Produce"],
    ["spinach", "Produce"],
    ["carrot", "Produce"],
    ["rice", "Grains & Pasta"],
    ["pasta", "Grains & Pasta"],
    ["flour", "Grains & Pasta"],
    ["atta", "Grains & Pasta"],
    ["oats", "Grains & Pasta"],
    ["juice", "Beverages"],
    ["soda", "Beverages"],
    ["water", "Beverages"],
    ["coffee", "Beverages"],
    ["tea", "Beverages"],
    ["chips", "Snacks"],
    ["biscuit", "Snacks"],
    ["cookie", "Snacks"],
    ["sauce", "Condiments"],
    ["ketchup", "Condiments"],
    ["jam", "Condiments"],
    ["oil", "Condiments"],
    ["frozen", "Frozen"],
    ["ice cream", "Frozen"],
  ];
  for (const [key, cat] of map) if (n.includes(key)) return cat;
  return "Other";
}

export function suggestedStorage(category: string): StorageType {
  if (["Dairy", "Produce", "Meat & Seafood"].includes(category)) return "Fridge";
  if (category === "Frozen") return "Freezer";
  return "Pantry";
}
