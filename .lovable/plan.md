## 1. Quick Add: weight + piece count

Today the confirm step asks for a single "Quantity (unit)". Change it to a two-part measure that matches the product type:

- Each catalog product gets a `form: "solid" | "liquid" | "count"` derived from its existing unit (`g`/`kg` → solid, `mL`/`L` → liquid, `pcs` → count).
- Confirm step shows a small unit toggle:
  - solid → `g` / `kg`
  - liquid → `mL` / `L`
  - all products additionally offer `pcs` (number of pieces/packs)
- One numeric field + −/+ steppers (step adapts: 1 for pcs, 50 for g/mL, 0.5 for kg/L).
- Saved `quantity` + `unit` reflect exactly what was picked; nothing else in the schema changes.

Same control is reused by the scanner confirmation screens, so it lives in a shared `MeasureInput` component.

## 2. Scanner: real AI item recognition

Quick Scan opens the live camera (already does) or a gallery photo. After capture:

- Image is sent to a new server function that calls Lovable AI vision (Gemini) and returns structured JSON: detected items with `name`, `confidence`, `suggestedStorage`, `shelfLifeDays`, `estimatedExpiry`.
- Each detection is matched against the built-in 223-product catalog; a match overrides unit/shelf-life with the trusted local rules, otherwise the AI values are used.
- Results screen: one card per detected item with an AI confidence bar/badge, suggested storage, shelf life and expiry date.
- Tapping an item opens the confirmation step (quantity/measure, purchase date, storage) before saving; unusual-storage warning still shows.
- If nothing is recognised (or confidence is very low), Manual Search opens immediately with the photo attached.

## 3. Barcode: camera scanning instead of typing

- Live barcode scanning from the rear camera using the browser `BarcodeDetector` where available, with a lightweight JS decoder fallback so it works on iOS/desktop too.
- Animated scan line + auto-detect; no keyboard needed. Manual entry stays hidden behind a small "enter code" link as a fallback.
- On a hit, Open Food Facts gives Product Name, Brand and Package Size; then only quantity, purchase date and storage are asked.
- On a miss, Manual Search opens straight away pre-filled with whatever was found.

## 4. New Receipt Scanner tab

- Fourth tab: photograph a receipt or pick one from the gallery.
- Image goes to a server function that runs AI OCR and returns line items (name, qty, price where present), filtering out totals/taxes.
- Detected products are shown as a checklist (all pre-selected, matched to the catalog where possible, with category + expiry preview).
- "Add N items" imports every selected row into the pantry in one go, logs a receipt scan in scan history and records the items as recent for quick add.

## 5. Gallery upload + polish

- Every scan mode gets an "Upload photo" option (hidden file input, `capture` optional) alongside live camera.
- Scanner animation polish only — animated scan line, pulsing focus frame, analysing shimmer, staggered result cards. No layout or design-system changes anywhere.

## Technical notes

- New: `src/lib/vision.functions.ts` (`createServerFn`) with `detectGroceries` and `parseReceipt`, both calling Lovable AI Gateway with a vision-capable model and a small structured-output schema; `LOVABLE_API_KEY` stays server-side. Errors (429 / 402) surface as toasts.
- New: `src/components/measure-input.tsx`, `src/components/scan-result-list.tsx`, `src/components/scan-confirm.tsx` (shared by all scan modes).
- Edited: `src/lib/grocery-catalog.ts` (add `form`), `src/components/quick-add-dialog.tsx`, `src/routes/_shell.scanner.tsx`.
- Images are uploaded to the existing private `pantry-images` bucket; receipt photos are sent inline to the model and not persisted.
- No database migration required.
