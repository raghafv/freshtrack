import type { PantryItem } from "@/lib/freshtrack";

function cell(v: unknown) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Download the pantry as a CSV file that opens in Excel / Google Sheets. */
export function exportPantryCsv(items: PantryItem[]) {
  const header = ["Name", "Brand", "Category", "Quantity", "Unit", "Storage", "Purchased", "Expires", "Price (₹)"];
  const rows = items.map((i) =>
    [i.name, i.brand, i.category, i.quantity, i.unit, i.storage, i.purchase_date, i.expiry_date, i.price]
      .map(cell)
      .join(","),
  );
  const csv = "\uFEFF" + [header.join(","), ...rows].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `freshtrack-pantry-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Scale the leading number in an amount like "2 cups" or "1/2 tsp". */
export function scaleAmount(amount: string, factor: number) {
  if (factor === 1) return amount;
  return amount.replace(/^(\d+)\s*\/\s*(\d+)|^(\d+(?:\.\d+)?)/, (m, n, d, x) => {
    const val = (n ? Number(n) / Number(d) : Number(x)) * factor;
    return String(Math.round(val * 100) / 100);
  });
}
