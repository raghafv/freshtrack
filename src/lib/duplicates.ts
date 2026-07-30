import { formatQty, type PantryItem } from "@/lib/freshtrack";
import { findProduct } from "@/lib/grocery-catalog";

/** Canonical key used to decide whether two entries are the same product. */
export function productKey(name: string): string {
  const known = findProduct(name);
  if (known) return known.id;
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/s$/, "");
}

const UNIT_BASE: Record<string, { base: string; factor: number }> = {
  g: { base: "g", factor: 1 },
  kg: { base: "g", factor: 1000 },
  mL: { base: "mL", factor: 1 },
  L: { base: "mL", factor: 1000 },
  pcs: { base: "pcs", factor: 1 },
};

export function unitsCompatible(a: string, b: string): boolean {
  return (UNIT_BASE[a]?.base ?? a) === (UNIT_BASE[b]?.base ?? b);
}

/** Converts `quantity` from unit `from` into unit `to`; returns null when impossible. */
export function convertQuantity(quantity: number, from: string, to: string): number | null {
  const f = UNIT_BASE[from];
  const t = UNIT_BASE[to];
  if (!f || !t || f.base !== t.base) return null;
  return (quantity * f.factor) / t.factor;
}

export interface DuplicateMatch {
  existing: PantryItem;
  /** Quantity of the new entry expressed in the existing item's unit. */
  addedQuantity: number;
  mergedQuantity: number;
  /** The safest expiry to keep after merging (earliest of the two). */
  mergedExpiry: string;
  sameStorage: boolean;
  summary: string;
}

/** Finds an existing pantry entry that is really the same product. */
export function findDuplicate(
  items: PantryItem[],
  candidate: { name: string; unit: string; quantity: number; storage: string; expiry_date: string },
): DuplicateMatch | null {
  const key = productKey(candidate.name);

  const matches = items
    .filter((i) => productKey(i.name) === key && unitsCompatible(i.unit, candidate.unit))
    .sort((a, b) => {
      const storageScore = Number(b.storage === candidate.storage) - Number(a.storage === candidate.storage);
      return storageScore || a.expiry_date.localeCompare(b.expiry_date);
    });

  const existing = matches[0];
  if (!existing) return null;

  const added = convertQuantity(candidate.quantity, candidate.unit, existing.unit);
  if (added == null) return null;

  const mergedQuantity = Number((Number(existing.quantity) + added).toFixed(2));
  const mergedExpiry =
    candidate.expiry_date < existing.expiry_date ? candidate.expiry_date : existing.expiry_date;

  return {
    existing,
    addedQuantity: Number(added.toFixed(2)),
    mergedQuantity,
    mergedExpiry,
    sameStorage: existing.storage === candidate.storage,
    summary: `${formatQty(Number(existing.quantity), existing.unit)} + ${formatQty(
      Number(added.toFixed(2)),
      existing.unit,
    )} = ${formatQty(mergedQuantity, existing.unit)}`,
  };
}

/**
 * True when merging is obviously right and no question is needed:
 * same storage, same unit and the expiry dates are within a day of each other.
 */
export function shouldAutoMerge(match: DuplicateMatch, candidateExpiry: string): boolean {
  if (!match.sameStorage) return false;
  const diff = Math.abs(
    (new Date(`${candidateExpiry}T00:00:00`).getTime() -
      new Date(`${match.existing.expiry_date}T00:00:00`).getTime()) /
      86_400_000,
  );
  return diff <= 1;
}

/** Groups duplicated products currently sitting in the pantry. */
export function duplicateGroups(items: PantryItem[]): PantryItem[][] {
  const map = new Map<string, PantryItem[]>();
  for (const item of items) {
    const key = productKey(item.name);
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  return [...map.values()].filter((g) => g.length > 1);
}
