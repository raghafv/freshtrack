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
}): ScanCandidate {
  const match = findProduct(input.name);
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
      unit: input.unit && input.unit !== "pcs" ? input.unit : match.form === "count" ? "pcs" : match.unit,
    });
  }

  const unit = input.unit ?? "pcs";
  const storage = (input.storage as StorageType) ?? "Pantry";
  const days = input.shelfLifeDays && input.shelfLifeDays > 0 ? input.shelfLifeDays : 7;
  const shelf: ShelfLife = {
    Fridge: storage === "Fridge" ? days : Math.round(days * 1.2),
    Freezer: Math.max(days, Math.round(days * 6)),
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
  if (candidate.labelExpiry) return candidate.labelExpiry;
  const base = new Date(`${purchaseDate}T00:00:00`);
  base.setDate(base.getDate() + candidateShelfDays(candidate, storage));
  return toISODate(base);
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
export function toDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the image"));
    reader.readAsDataURL(file);
  });
}
