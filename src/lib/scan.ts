import { toISODate, type StorageType } from "@/lib/freshtrack";
import {
  findProduct,
  formForUnit,
  recommendedFrom,
  shelfDaysFrom,
  type GroceryProduct,
  type ProductForm,
  type ShelfLife,
} from "@/lib/grocery-catalog";

/** A product detected by camera, barcode or receipt, ready for confirmation. */
export interface ScanCandidate {
  key: string;
  name: string;
  brand: string | null;
  category: string;
  unit: string;
  form: ProductForm;
  storage: string;
  shelf: ShelfLife;
  /** 0-1 AI confidence, null when it came from a lookup. */
  confidence: number | null;
  image_url: string | null;
  packageSize: string | null;
  /** True when the product was matched against the built-in catalog. */
  matched: boolean;
  quantity: number;
  source: string;
  /** Expiry printed on the label (ISO date), overrides shelf-life estimation. */
  labelExpiry?: string | null;
  /** Manufacturing / packed date printed on the label (ISO date). */
  labelManufactured?: string | null;
  /** Visual freshness 0-1 judged by the AI from the photo. */
  freshness?: number | null;
  /** True when the item looks factory sealed. */
  packaged?: boolean;
  /** Short AI note about what it saw ("skin slightly spotted"). */
  note?: string | null;
}

let counter = 0;
function nextKey(prefix: string) {
  counter += 1;
  return `${prefix}-${counter}`;
}

export function candidateFromProduct(
  product: GroceryProduct,
  extra: Partial<ScanCandidate> = {},
): ScanCandidate {
  return {
    key: nextKey(product.id),
    name: product.name,
    brand: null,
    category: product.category,
    unit: product.form === "count" ? "pcs" : product.unit,
    form: product.form,
    storage: product.storage,
    shelf: product.shelf,
    confidence: null,
    image_url: null,
    packageSize: null,
    matched: true,
    quantity: 1,
    source: "scan",
    ...extra,
  };
}

/** Build a candidate from free-form data, using catalog knowledge when possible. */
export function buildCandidate(input: {
  name: string;
  brand?: string | null;
  category?: string;
  unit?: string;
  storage?: string;
  shelfLifeDays?: number;
  confidence?: number | null;
  image_url?: string | null;
  packageSize?: string | null;
  quantity?: number;
  source?: string;
  labelExpiry?: string | null;
  labelManufactured?: string | null;
  freshness?: number | null;
  packaged?: boolean;
  note?: string | null;
  /** The shelf life was given by a human — never override it with catalog data. */
  exactShelf?: boolean;
}): ScanCandidate {
  const match = input.exactShelf ? null : findProduct(input.name);

  if (match) {
    return candidateFromProduct(match, {
      name: match.name,
      brand: input.brand ?? null,
      confidence: input.confidence ?? null,
      image_url: input.image_url ?? null,
      packageSize: input.packageSize ?? null,
      quantity: input.quantity ?? 1,
      source: input.source ?? "scan",
      labelExpiry: input.labelExpiry ?? null,
      labelManufactured: input.labelManufactured ?? null,
      freshness: input.freshness ?? null,
      packaged: input.packaged ?? false,
      note: input.note ?? null,
      unit:
        input.unit && input.unit !== "pcs"
          ? input.unit
          : match.form === "count"
            ? "pcs"
            : match.unit,
    });
  }

  const unit = input.unit ?? "pcs";
  const storage = (input.storage as StorageType) ?? "Pantry";
  const days = input.shelfLifeDays && input.shelfLifeDays > 0 ? input.shelfLifeDays : 7;
  const poorFreezerFit = /salad|lettuce|cucumber|kheera|tomato|tamatar|potato|aloo|onion|pyaz|banana|kela|egg/i.test(
    `${input.name} ${input.category ?? ""}`,
  );
  const shelf: ShelfLife = {
    Fridge: storage === "Fridge" ? days : Math.round(days * 1.2),
    Freezer: poorFreezerFit ? Math.max(1, Math.round(days * 0.75)) : Math.max(days, Math.round(days * 6)),
    Pantry: storage === "Pantry" ? days : Math.max(1, Math.round(days * 0.6)),
  };
  shelf[storage] = days;

  return {
    key: nextKey("ai"),
    name: input.name.trim(),
    brand: input.brand ?? null,
    category: input.category ?? "Other",
    unit,
    form: formForUnit(unit),
    storage,
    shelf,
    confidence: input.confidence ?? null,
    image_url: input.image_url ?? null,
    packageSize: input.packageSize ?? null,
    matched: false,
    quantity: input.quantity ?? 1,
    source: input.source ?? "scan",
    labelExpiry: input.labelExpiry ?? null,
    labelManufactured: input.labelManufactured ?? null,
    freshness: input.freshness ?? null,
    packaged: input.packaged ?? false,
    note: input.note ?? null,
  };
}

/** A realistic remaining-shelf-life estimate with the reasoning behind it. */
export interface ShelfLifePrediction {
  /** Remaining days from the purchase date. */
  days: number;
  expiry: string;
  /** 0-1 confidence in this specific date. */
  confidence: number;
  source: "label" | "manufactured" | "estimated";
  explanation: string;
}

function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(`${fromISO}T00:00:00`).getTime();
  const b = new Date(`${toISO}T00:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

function addDays(fromISO: string, days: number): string {
  const d = new Date(`${fromISO}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/**
 * Predicts how long an item really has left, combining the printed dates, the
 * chosen storage, catalog shelf life and the freshness the AI could see.
 */
export function predictShelfLife(
  candidate: ScanCandidate,
  storage: string,
  purchaseDate: string,
): ShelfLifePrediction {
  const base = candidateShelfDays(candidate, storage);

  if (candidate.labelExpiry) {
    const days = daysBetween(purchaseDate, candidate.labelExpiry);
    return {
      days,
      expiry: candidate.labelExpiry,
      confidence: 0.97,
      source: "label",
      explanation:
        days >= 0
          ? `Using the expiry date printed on the pack — ${days} day${days === 1 ? "" : "s"} left in the ${storage.toLowerCase()}.`
          : "The printed expiry date has already passed, so this is marked expired.",
    };
  }

  if (candidate.labelManufactured) {
    const age = Math.max(0, daysBetween(candidate.labelManufactured, purchaseDate));
    const days = Math.max(0, base - age);
    return {
      days,
      expiry: addDays(purchaseDate, days),
      confidence: 0.82,
      source: "manufactured",
      explanation: `No expiry printed, so counting from the packed date: a sealed ${candidate.name.toLowerCase()} keeps about ${base} days in the ${storage.toLowerCase()} and it is already ${age} day${age === 1 ? "" : "s"} old.`,
    };
  }

  // A barcode scan never sees the food itself, so we must not pretend to judge
  // how fresh it looks. Only photo-based scans carry a freshness reading.
  const seenByCamera = candidate.freshness != null;
  const freshness = candidate.freshness ?? 1;
  // Fresh produce loses most of its life to how it already looks; sealed packs
  // barely do, because the clock starts at packing.
  const sensitivity = candidate.packaged ? 0.25 : 0.7;
  const factor = seenByCamera ? 1 - sensitivity * (1 - freshness) : 1;
  const days = Math.max(0, Math.round(base * factor));
  const detection = candidate.confidence ?? 0.7;
  const confidence = Math.min(
    0.9,
    Math.max(0.3, 0.45 + 0.3 * detection + (candidate.matched ? 0.15 : 0)),
  );

  const parts = [
    `${candidate.name} normally keeps ~${base} days in the ${storage.toLowerCase()}`,
  ];
  if (seenByCamera) {
    parts.push(
      freshness >= 0.85
        ? "and it looks freshly bought"
        : freshness >= 0.6
          ? "and it looks partly through its life"
          : "but it already looks well past its best",
    );
  } else {
    parts.push("and no expiry date was printed on the pack I could read");
  }
  if (candidate.note) parts.push(`(${candidate.note})`);

  return {
    days,
    expiry: addDays(purchaseDate, days),
    confidence,
    source: "estimated",
    explanation: `${parts.join(" ")}, so I estimate ${days} day${days === 1 ? "" : "s"} left.`,
  };

}

export function candidateShelfDays(candidate: ScanCandidate, storage: string): number {
  return shelfDaysFrom(candidate.shelf, storage);
}

export function candidateExpiry(
  candidate: ScanCandidate,
  storage: string,
  purchaseDate: string,
): string {
  return predictShelfLife(candidate, storage, purchaseDate).expiry;
}

export function candidateUnusualStorage(candidate: ScanCandidate, storage: string): boolean {
  return !recommendedFrom(candidate.shelf).includes(storage as StorageType);
}

export function confidenceLabel(confidence: number): {
  label: string;
  tone: "high" | "medium" | "low";
} {
  if (confidence >= 0.8) return { label: `${Math.round(confidence * 100)}% sure`, tone: "high" };
  if (confidence >= 0.5) return { label: `${Math.round(confidence * 100)}% sure`, tone: "medium" };
  return { label: `${Math.round(confidence * 100)}% sure`, tone: "low" };
}

/** Reads a File/Blob into a data URL usable as AI image input. */
export async function toDataUrl(file: Blob): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    if (scale < 1) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        return canvas.toDataURL("image/jpeg", 0.84);
      }
    }
    bitmap.close();
  } catch {
    // Fall back to the original bytes when the browser cannot decode the file.
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the image"));
    reader.readAsDataURL(file);
  });
}
