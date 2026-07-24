# Design System

UI/UX conventions as implemented in the current React + Tailwind app. Prefer matching existing screens over introducing a second visual language.

## Theme

- Modern, clean, professional SaaS
- Light content area on a cool slate shell
- Blue as the primary action color
- Dense operational tables with clear page titles and short subtitles

## Colors (Tailwind classes in use)

| Token | Tailwind | Typical use |
|-------|----------|-------------|
| Primary | `blue-600`, `blue-500` | Primary buttons, active nav, links |
| Primary soft | `blue-50`, `blue-100` | Hover rows, soft highlights |
| Shell dark | `slate-900`, `slate-800`, `slate-700` | Header, logout chip |
| Shell light | `slate-100`, `slate-200` | Page background, borders |
| Text | `slate-900`, `gray-800`, `slate-500` | Titles, body, muted |
| Danger | `red-600`, `red-100` | Delete, errors, reject |
| Success | `green-600`, `green-100` | Receive, post, success banners |
| Warning | `amber-50`, `amber-600` | Submit / attention callouts |
| Surfaces | `white` | Cards, tables, sidebar |

Do not introduce purple gradient themes or decorative glow aesthetics for this product UI.

## Typography

- **Configured font:** default Tailwind / browser stack (no custom Inter/Roboto entry in `tailwind.config.js` today)
- **Page title:** `text-2xl font-bold text-gray-800` (or `text-gray-900`)
- **Subtitle:** `text-sm text-gray-500` / `text-slate-500`
- **Table:** `text-sm`; mono for money (`font-mono`)

## Spacing and radius

| Element | Pattern |
|---------|---------|
| Page stack | `space-y-4` |
| Cards / panels | `bg-white rounded-xl border` (~12px radius) |
| Buttons | `rounded-lg` (~8px), `px-4 py-2 text-sm font-medium` |
| Inputs | `border rounded-lg px-3 py-2 text-sm` |
| Status chips | `text-xs px-2 py-0.5 rounded-full` |

## Layout

- Sticky dark header with product name and user chip
- Left sidebar: section labels + nav items; drawer on mobile, static on `md+`
- Main content padded; tables in bordered white cards with optional horizontal scroll
- Modals: centered overlay (`Modal` component), max height with internal scroll for long forms

## Components to reuse

- `components/Modal.tsx` — dialogs
- `components/StatCard.tsx` — dashboard metrics
- `components/DetailDrawer.tsx` — side detail where used
- `components/PakistanLocationInput.tsx` — Pakistan city/area typeahead for location fields
- Shared status color maps per page (Draft / Approved / Posted, etc.)

## Forms / Location

- For Pakistan address-style fields (projects, land parcels), use `PakistanLocationInput`.
- Data: static list in `frontend/src/data/pakistanLocations.ts` (no Maps API).
- Users may type free text or pick a suggestion; store a single `location` string.
- Do not introduce Google Places / Mapbox unless product explicitly requires geocoding.
- Project create/edit uses cascading fields (not free text):
  1. **Project Type** — Ready Property (`READY_PROPERTY`) or Land (`LAND`)
  2. **Subtype** — filtered list for that type
  3. **Project Strategy** — Direct Sale / Development (Ready Property locked to Direct Sale)
- Direct Sale projects: Project Detail hides Add Stage / Default Stages and shows an explanatory banner.
- List/cards show type + subtype + strategy badges.
- Project list cards: progress (budget / collections) plus quick actions **+ Expense**, **+ Collection**, **+ Payment** (`ProjectQuickEntry` modal).
- **+ Collection** modes: Installment payment vs Full / direct payment (sale picker; amount capped to balance due).
- Prefer short `placeholder` hints on text/number inputs (name, budget, etc.).
- **FieldLabel:** form labels include a small **(i)** tip (hover/focus) explaining the field — used on Projects create/edit and Project Detail stage/sell forms.
- **MoneyInput:** PKR amount fields show en-PK comma grouping while storing digit-only values (`formatMoneyDisplay` / `parseMoneyInput` in `utils/money.ts`). Used for project budget, target sale, stage budgets, and sell-as-is price.
- **Plot size:** single numeric input + unit selector (Gazz / Sq. Ft / Marla) with live **Equivalent Sizes** panel (`PlotSizeField`). Store only `plot_size_sqft`. Cards show `Plot: X Gazz · Y Sq. Ft · Z Marla` (or legacy free-text if no sqft).
- **Settings → Measurement Standards:** Pakistan (1 Marla = 272.25 Sq Ft) or Custom Marla→Sq Ft; Gazz fixed at 9 Sq Ft. Above Danger Zone reset UI.
- **Construction stages (DEVELOPMENT):** 11-stage template; detail timeline shows Budget, Actual Cost (from expenses), dates, completion %. **Sell Project** banner + modal (buyer/price/date) → Sold During Construction / Sold As-Is; stages lock.

## Interaction

- Primary CTA: solid `bg-blue-600 text-white hover:bg-blue-700`
- Secondary: bordered ghost buttons
- Destructive: text or soft red buttons with `ConfirmDialog` (modal) before deletes; success/error feedback via Sonner toasts (`notify`), not browser `alert`/`confirm`
- Loading: centered spinner (`animate-spin` blue ring)
- Errors: `text-red-600 bg-red-50` inline banners

## Accessibility baseline

- Keep button and select hit targets usable on mobile
- Do not rely on color alone for status—include text labels
- Preserve keyboard access for inputs and native controls

## Out of scope for design drift

- Dark-mode-first redesigns
- Heavy illustration / marketing hero layouts inside the app shell
- New component libraries without explicit approval
