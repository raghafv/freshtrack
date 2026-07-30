import type { StorageType } from "@/lib/freshtrack";

/**
 * Products the user taught FreshTrack (barcodes missing from public databases).
 * Stored per user in localStorage so an unknown barcode is only entered once.
 */

export interface LearnedProduct {
  barcode: string;
  name: string;
  brand: string | null;
  category: string;
  unit: string;
  storage: StorageType;
  shelfLifeDays: number;
  savedAt: string;
}

const KEY = "freshtrack.learned-products";

function storageKey(userId?: string) {
  return userId ? `${KEY}.${userId}` : KEY;
}

export function readLearned(userId?: string): Record<string, LearnedProduct> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as Record<string, LearnedProduct>) : {};
  } catch {
    return {};
  }
}

export function lookupLearned(barcode: string, userId?: string): LearnedProduct | null {
  return readLearned(userId)[barcode] ?? null;
}

export function learnProduct(product: LearnedProduct, userId?: string): void {
  if (typeof window === "undefined") return;
  try {
    const all = readLearned(userId);
    all[product.barcode] = { ...product, savedAt: new Date().toISOString() };
    window.localStorage.setItem(storageKey(userId), JSON.stringify(all));
  } catch {
    /* storage full or blocked — remembering is best-effort */
  }
}

export function learnedCount(userId?: string): number {
  return Object.keys(readLearned(userId)).length;
}
