# FreshTrack — Premium UI Pass

A visual-only elevation of FreshTrack: calmer palette, larger radii, real product photography, and a scan-first bottom bar. No schema changes, no new features, no removed pages. Every existing button keeps its current handler.

## Scope (this pass)

Home, Pantry, Recipes + AI, Scanner. Shopping, Notifications, Profile, Settings, Analytics and Admin inherit the new tokens automatically and get a bespoke pass later.

## Design system

Rework `src/styles.css` tokens only — components keep using the same semantic names, so untouched screens update for free.

- Background off-white `#FAFAF8`, cards pure white, text near-black, secondary neutral gray.
- Accent stays the existing FreshTrack brown. Muted green = fresh, soft amber = expiring, muted red = expired. Green never used as a surface or brand color.
- Radii: cards 28px, buttons 22px, inputs 20px. Shadows reduced to near-invisible Apple-style elevation.
- Typography scale widened: larger headings, more line height, more section spacing.
- Motion tokens: press-scale on tappables, gentle lift on cards, fade transitions. Nothing bouncy.

## Product photography

Generate a curated set of ~34 realistic food photos into `src/assets/food/` (milk, eggs, yogurt, cheese, butter, tomato, onion, potato, spinach, banana, apple, rice, atta, dal, bread, oil, chicken, fish, paneer, snacks, beverages, frozen, spices, plus one per remaining catalog category and a neutral fallback).

A new `src/lib/food-image.ts` maps an item name/category to one of these, matching by name keyword first, then category, then fallback. If a pantry row already has `image_url` (scanned barcode), that wins. No emoji anywhere in these screens except the existing manual-add / My Pantry emoji picker, which stays.

## Home

Same data hooks and links, restructured presentation:

- Header: greeting + notification bell + avatar (unchanged behavior), then a search bar with a scan icon on the right that routes to the existing scanner.
- Expiring Soon: horizontal card with overlapping product thumbnails and a large count, tapping goes to the pantry expiry view.
- Pantry Overview: item total plus a single segmented green/amber/red progress bar replacing the three stat tiles.
- AI Suggestions: the centerpiece — full-width photo cards per suggestion with the existing action links (Cook / Ask AI / Recipes) rendered as pill buttons.
- Impact card: the existing savings figure presented as a rewarding "₹X saved from food waste" statement.
- Existing shopping-list preview, recent activity and analytics link stay, restyled.

## Pantry

Each row becomes a spacious card: thumbnail, name, quantity, expiry line, freshness pill, and the existing quick +/- and edit/delete actions kept as-is. Empty state becomes a minimal illustration with "Start by scanning your first grocery item." and a large Scan button.

## Scanner

Same four tabs and all logic untouched; restyled as a hero surface — full-bleed camera frame, calmer chrome, larger primary capture control, detection results as photo cards with the existing Add all / per-item edit flow.

## Recipes + AI

Recipe cards get large food photography, with cooking time, difficulty, available vs missing ingredient counts surfaced as clean metadata rows. Existing Surprise me / Pick ingredients / Save actions and the AI chat tab keep working exactly as now.

## Bottom navigation

Five slots: Home, Pantry, **Scan** (oversized center button), Recipes (which owns the AI tabs as today), Profile. The `/assistant` route stays and remains reachable from the Recipes tab switcher; Profile moves into the bar while the avatar in the header keeps working.

## Technical notes

- Only `src/styles.css`, route components under `src/routes/_shell.*`, `src/components/*` presentation files, and two new files (`src/lib/food-image.ts`, generated assets) change.
- No edits to `src/lib/data.ts`, `src/lib/ai*`, server functions, migrations, or auth.
- Head metadata on touched routes is preserved.
