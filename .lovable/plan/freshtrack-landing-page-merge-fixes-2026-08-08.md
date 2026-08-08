# FreshTrack: landing page merge + fixes

## 1. Landing page merged into the app

The other project ("landing page") is an off-grid camping site built on a different
stack (plain Vite SPA + react-router). Its sections can't be dropped in as files, so
I'll port its structure, layout rhythm, animations and scroll behaviour into
FreshTrack's TanStack routing — same section order, same motion patterns, FreshTrack
content and colours.

Section mapping:

```text
Navigation  -> FreshTrack glass nav (logo, anchors, "Try FreshTrack")
Hero        -> full-height hero, image ticker + progress bars kept,
               headline "Your Smart Kitchen. Zero Waste. Always Fresh."
               + floating CSS iPhone frame showing real FreshTrack UI
Locations   -> Features grid (AI Food Detection, Barcode Scanner, Expiry
               Tracking, Inventory, Pantry Analytics, Smart Notifications)
Experience  -> How it works timeline: Scan -> Organise -> Never waste
Booking     -> Stats band + testimonials + final CTA -> /auth
Footer      -> FreshTrack footer
```

Routing (per your choice: landing at `/` for everyone):

- New public `src/routes/index.tsx` = landing page.
- The current dashboard moves from `/` to `/home` (`_shell.home.tsx`), auth gate
  unchanged. All in-app links, the bottom nav "Home" tab and post-login redirect
  point at `/home`.
- "Try FreshTrack" / "Start Free" -> `/auth`.
- No changes to auth, backend, AI, OCR, scanning or pantry logic.

Imagery: every photo slot ships as a labelled placeholder block (correct aspect
ratio, gradient + glass treatment, `data-` slot name) so when you send real images
tomorrow I swap the files only. The hero phone renders real FreshTrack UI in a CSS
device frame — no fake screenshots.

## 2. SEO fixes

- Sitemap `<loc>` entries become absolute `https://fresh-track.in/...`, plus the new
  `/` landing and `/home`.
- `robots.txt` gains `Sitemap: https://fresh-track.in/sitemap.xml`.
- `/auth` H1 becomes "Sign in to FreshTrack — Smart Pantry Tracker".
- `EmptyState` heading changes `h3` -> `h2` so hierarchy is valid.
- Landing route gets its own title/description/OG/Twitter tags + WebSite/Organization
  JSON-LD; `/home` keeps app-specific metadata.
- Google Search Console isn't connected — that one needs you to authorize it; I'll
  flag it, not silently skip it.

## 3. Emails

`freshtrackmvp1` is hard-coded as the site name in the email sender, the auth email
webhook and the preview route. Replaced with "FreshTrack" and the fresh-track.in
domain across signup, recovery, magic-link, email-change, invite and reauthentication
templates.

## 4. Manual add: editable expiry

In the quick-add sheet the "More details" button is removed and the "Expires on" row
becomes a real editable date field (with the auto-calculated date as its default).
Everything you need is then on one screen.

## 5. Unknown-barcode submission

- Shelf life: requirement changes from "days is required" to "at least one of
  years / months / days must be filled".
- Two mandatory capture slots, Front and Back (camera or gallery), each with preview
  and retake. Submit stays disabled until both exist.
- Both images upload to the pantry-images bucket; the item added to the user's pantry
  uses the front photo as its thumbnail.
- Admin pending queue shows both photos side by side plus barcode, name, quantity,
  shelf life, submitted-by (name + email) and submitted-at.

## 6. Tonight's recipe

- All AI dish photos removed from the recipe cards; a calm placeholder tile replaces
  them (and the `src/assets/dishes` imports go away).
- One recipe per calendar day, persisted in localStorage keyed by date, so reopening
  the app returns the same recipe instead of generating a new one.
- "Cook this" navigates to Recipes and scrolls straight to the recipe, opened in full
  detail under a "Tonight's recommendation" heading.
- In that hand-off state the Recipes page hides the Cook composer, "Use these first"
  and "New ideas — save the ones you love" — just the one recipe.
- A small Save button sits next to Tonight's recommendation on Home.

## Technical notes

- New files: `src/routes/index.tsx`, `src/components/landing/*` (Nav, Hero,
  PhoneFrame, Features, HowItWorks, Stats, Testimonials, CTA, Footer),
  `src/lib/tonight-store.ts` extended for date-keyed persistence.
- Renamed: `src/routes/_shell.index.tsx` -> `src/routes/_shell.home.tsx`.
- Landing styling uses the existing design tokens in `src/styles.css`; any new tokens
  (landing gradients, glass layers) are added there, not hard-coded in components.
- `framer-motion` is used by the template's animations; I'll add it if it isn't
  already a dependency.
