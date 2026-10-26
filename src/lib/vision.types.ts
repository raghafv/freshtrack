export interface DetectedGrocery {
  name: string;
  confidence: number;
  category: string;
  storage: string;
  shelfLifeDays: number;
  unit: string;
  brand: string | null;
  freshness: number;
  note: string | null;
  packaged: boolean;
}

export interface ReceiptLine {
  name: string;
  quantity: number;
  unit: string;
  price: number | null;
}

export interface LabelDates {
  manufactured: string | null;
  expiry: string | null;
}