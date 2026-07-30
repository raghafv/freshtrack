import { useState } from "react";
import { usePantryItems, useAddPantryItem, useMergePantryItem, type NewPantryItem } from "@/lib/data";
import { findDuplicate, shouldAutoMerge, type DuplicateMatch } from "@/lib/duplicates";

export interface PendingDuplicate {
  match: DuplicateMatch;
  payload: NewPantryItem;
}

export interface SmartAddResult {
  /** "added" | "merged" */
  outcome: "added" | "merged";
  name: string;
  message: string;
}

/**
 * Adds a product to the pantry, but detects an existing entry for the same
 * product first: identical entries merge silently, near-matches ask the user.
 */
export function useSmartAdd() {
  const { data: items = [] } = usePantryItems();
  const addItem = useAddPantryItem();
  const merge = useMergePantryItem();
  const [pending, setPending] = useState<PendingDuplicate | null>(null);

  async function doMerge(match: DuplicateMatch, payload: NewPantryItem): Promise<SmartAddResult> {
    await merge.mutateAsync({
      id: match.existing.id,
      name: match.existing.name,
      quantity: match.mergedQuantity,
      unit: match.existing.unit,
      expiry_date: match.mergedExpiry,
      addedQuantity: match.addedQuantity,
      purchase_date: payload.purchase_date,
      price:
        payload.price != null
          ? Number(((match.existing.price ?? 0) + payload.price).toFixed(2))
          : null,
    });
    return {
      outcome: "merged",
      name: match.existing.name,
      message: `Merged into your existing ${match.existing.name} · ${match.mergedQuantity} ${match.existing.unit}`,
    };
  }

  async function doAdd(payload: NewPantryItem): Promise<SmartAddResult> {
    await addItem.mutateAsync(payload);
    return { outcome: "added", name: payload.name, message: `${payload.name} added to pantry` };
  }

  /**
   * Returns a result when the item was stored straight away, or null when the
   * user needs to answer the merge question first.
   */
  async function submit(payload: NewPantryItem): Promise<SmartAddResult | null> {
    const match = findDuplicate(items, {
      name: payload.name,
      unit: payload.unit,
      quantity: payload.quantity,
      storage: payload.storage,
      expiry_date: payload.expiry_date,
    });

    if (!match) return doAdd(payload);
    if (shouldAutoMerge(match, payload.expiry_date)) return doMerge(match, payload);

    setPending({ match, payload });
    return null;
  }

  async function confirmMerge(): Promise<SmartAddResult | null> {
    if (!pending) return null;
    const result = await doMerge(pending.match, pending.payload);
    setPending(null);
    return result;
  }

  async function keepSeparate(): Promise<SmartAddResult | null> {
    if (!pending) return null;
    const result = await doAdd(pending.payload);
    setPending(null);
    return result;
  }

  return {
    pending,
    submit,
    confirmMerge,
    keepSeparate,
    cancel: () => setPending(null),
    isPending: addItem.isPending || merge.isPending,
  };
}
