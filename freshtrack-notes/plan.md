# FreshTrack: Removed Lovable plan

The previous Lovable-specific plan has been removed and replaced by FreshTrack-maintained plans.

If you maintain project-specific plans, keep them outside of tooling-specific folders. This file no longer contains implementation guidance.

## Goal
Make adding groceries a sub-5-second flow using a built-in offline product catalog, without redesigning the existing UI. Switch all money display to Indian Rupees.

## 1. Offline grocery catalog
New file `src/lib/grocery-catalog.ts` with ~200 products across Dairy, Fruits, Vegetables, Meat & Seafood, Frozen, Bakery, Beverages, Snacks, Grains & Pasta, Condiments, Spices (India-centric names: paneer, curd, atta, dal, ghee, poha, etc.).

Each product carries:
- name, category, suggested unit, default storage
- per-storage shelf life: `{ Fridge?: days, Freezer?: days, Pantry?: days }`
- popularity rank (drives "Popular Items")
- search keywords/aliases

Examples encoded exactly as specified: Milk (Fridge 7 / Freezer 90), Paneer (5 / 120), Chicken (2 / 180), Tomatoes (Pantry 5 / Fridge 10), Rice (Pantry 365).

Categories list gains **Fruits**, **Vegetables**, and **Spices** in `freshtrack.ts` (existing "Produce" items stay valid; no DB change needed since category is free text).

## 2. Expiry engine
`estimateExpiry` gains an optional catalog product: when a product is known, use its per-storage shelf-life; otherwise fall back to the existing category table. Storage options a product doesn't recommend are still selectable — choosing one shows an inline warning ("Freezing bananas is unusual — expiry estimated at X days") and saving is allowed. When a product has no rule for the chosen storage, a conservative fallback from the category table is used.

## 3. Quick-add picker (new, reuses existing visual language)
Tapping **Add Item** now opens a picker sheet before the form:
- Search field (fuzzy match on name + aliases), auto-focused
- **Frequently Added** — top products by how many times the user has added them
- **Recent Items** — last ~12 products added
- **Favorites** — star toggle on any product row
- **Popular Items** — catalog popularity ranking
- **Categories** — chips filtering the grid
- "Add custom item" escape hatch → existing full form unchanged

Frequency counts, recents, and favorites are stored locally (per user key in `localStorage`) so the picker works offline and instantly; no schema change.

## 4. Slimmed confirm step
Selecting a product opens a compact confirm sheet asking only:
- Quantity (with unit prefilled from catalog, stepper + numeric entry)
- Purchase date (defaults to today, editable)
- Storage (Fridge / Freezer / Pantry segmented control)

It shows the computed expiry date live plus the unusual-storage warning, and a "More details" link that expands the existing full form (brand, price, photo, manual expiry) for the rare case. Save writes through the existing `useAddPantryItem` hook.

## 5. Rupees
Replace `$` with `₹` everywhere money appears: dashboard "Est. savings", pantry/item price labels, form "Value (optional)" field. Add a shared `formatCurrency` helper in `freshtrack.ts` using `en-IN` formatting, and adjust the average-item-value constant used for savings estimation to a realistic Indian figure (₹120/item) so the number reads sensibly.

## 6. Polish (no redesign)
Existing components, tokens, and layout stay. Only refinements: consistent rounded product tiles matching current cards, tap targets sized for thumb use, subtle press states, skeleton-free instant rendering (catalog is local), and star icons for favorites in the existing accent color.

## Technical notes
- Catalog is a plain TS module — zero network, tree-shaken into the client bundle (~15KB).
- No database migration required; `pantry_items` already stores category/unit/storage/expiry as text.
- Scanner flow keeps working: barcode/camera results are matched against the catalog first to inherit shelf-life rules before falling back to `guessCategory`.
- Files touched: new `src/lib/grocery-catalog.ts`, new `src/components/quick-add-sheet.tsx`, edits to `src/lib/freshtrack.ts`, `src/components/item-form-dialog.tsx`, `src/routes/_shell.pantry.tsx`, `src/routes/_shell.index.tsx`, `src/routes/_shell.scanner.tsx`.
