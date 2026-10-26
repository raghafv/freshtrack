import { findProduct, type GroceryProduct } from "@/lib/grocery-catalog";

const KEY_PREFIX = "freshtrack:quickadd:";

export interface QuickAddState {
  favorites: string[];
  recents: string[];
  counts: Record<string, number>;
}

const EMPTY: QuickAddState = { favorites: [], recents: [], counts: {} };

function key(userId?: string | null) {
  return `${KEY_PREFIX}${userId ?? "anon"}`;
}

export function readQuickAdd(userId?: string | null): QuickAddState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(key(userId));
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<QuickAddState>;
    return {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      recents: Array.isArray(parsed.recents) ? parsed.recents : [],
      counts: parsed.counts && typeof parsed.counts === "object" ? parsed.counts : {},
    };
  } catch {
    return EMPTY;
  }
}

export function writeQuickAdd(userId: string | null | undefined, state: QuickAddState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key(userId), JSON.stringify(state));
  } catch {
    /* storage full or unavailable — quick-add still works, just not remembered */
  }
}

export function recordAdd(state: QuickAddState, productId: string): QuickAddState {
  return {
    favorites: state.favorites,
    recents: [productId, ...state.recents.filter((id) => id !== productId)].slice(0, 12),
    counts: { ...state.counts, [productId]: (state.counts[productId] ?? 0) + 1 },
  };
}

export function toggleFavorite(state: QuickAddState, productId: string): QuickAddState {
  const has = state.favorites.includes(productId);
  return {
    ...state,
    favorites: has
      ? state.favorites.filter((id) => id !== productId)
      : [productId, ...state.favorites].slice(0, 40),
  };
}

export function resolveMany(ids: string[]): GroceryProduct[] {
  return ids.map((id) => findProduct(id)).filter((p): p is GroceryProduct => !!p);
}

export function frequentProducts(state: QuickAddState, limit = 8): GroceryProduct[] {
  return Object.entries(state.counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => findProduct(id))
    .filter((p): p is GroceryProduct => !!p);
}
