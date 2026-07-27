# Design System

UI/UX conventions as implemented in the current React + Tailwind app. Prefer matching existing screens over introducing a second visual language.

## Theme

- Modern, clean, professional SaaS
- Light content area on a cool slate shell
- Blue as the primary action color
- Dense operational tables with clear page titles and short subtitles
- **Favicons:** assets in `frontend/public/favicons/` (ico/png + `site.webmanifest`); linked from `frontend/index.html` (`theme-color` `#2563eb`)

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

- Sticky dark header with product name, **global search** (Ctrl/Cmd+K or `/`), **notification bell**, and user chip
- Left sidebar: section labels + nav items; drawer on mobile, static on `md+`
- Main content padded; tables in bordered white cards with optional horizontal scroll
- **Breadcrumbs** on Project Detail: `Projects > {name} > {Tab} > {Stage?}`
- **View detail:** right `DetailDrawer` (list stays visible behind dimmed backdrop); sticky footer for Close/Edit actions; Escape ignored when a `Modal` is open on top
- **Create/edit forms:** centered `Modal` (sticky footer + dirty guard) — not drawers
- **Hash routing:** `HashRouter` — refresh restores screen via `#/…` (no Render SPA rewrite needed)
- **Skeletons** for first paint (Projects/Expenses/Detail); spinners only for in-modal saves
- **Optimistic** expense create (temp row then replace / rollback)

## URL conventions

| Hash path | Screen |
|-----------|--------|
| `#/login` | Login |
| `#/dashboard` | Dashboard (default when authenticated) |
| `#/projects` | Projects list (`?status=` & `?location=` filters) |
| `#/projects/:id` | Project Detail (`?tab=construction\|funding\|…\|activity\|documents&stage=:stageId`) |
| `#/funds`, `#/sales`, `#/expenses`, … | Other sidebar pages |

- List filters: primary in URL query; when query is empty, restore from `localStorage` JSON `erp.filters.{page}` via `useListFilters` (Projects, Expenses, Funds, Inventory, Labour, Sales).
- Column visibility: `localStorage` `erp.columns.{tableId}` + `ColumnPicker` (Expenses, Funds receipts, Sales list, Projects table).
- Form drafts (create only): `erp.draft.projects.create`, `erp.draft.expenses.create` via `useFormDraft`.
- Session recovery: `erp.lastRoute` updated on each authenticated navigation; restored after login / empty-dashboard boot.
- Project Detail: `?tab=` syncs workspace tab (includes **activity** + **documents**); `?stage=` scrolls/highlights that construction stage; **Copy link** on header.
- Projects list lifecycle: Active / Archived (Cancelled) / Deleted (`?lifecycle=` on API).
- Auth: unauthenticated → `#/login`; after login prefer `erp.lastRoute`, else `sessionStorage erp.returnTo`, else `#/dashboard`.
- Helpers: `frontend/src/utils/navState.ts`, `columnPrefs.ts`

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `N` | New Project (on `#/projects`) |
| `Ctrl/Cmd+S` | Save open form modal |
| `/` or `Ctrl/Cmd+K` | Global search |
| `Esc` | Close modal / drawer / search |
| `?` | Shortcuts help |

Ignore letter shortcuts while typing in inputs (Ctrl+S still works).

## Notifications

Header bell polls `GET /api/notifications/summary` (~60s). Types: Low Stock, Budget Exceeded, MR Waiting Approval, Installment Overdue. Read state in `erp.notifications.readIds` (localStorage).

## Multi-tab edit lock

`useEditLock` via `BroadcastChannel('erp-edit-locks')` on Project/Expense edit modals — warn and disable Save if another tab holds the lock.

## Project workspace

Always-visible Overview + Financial Summary. Tabs: Construction, Funding, Inventory, Procurement, Labour, Expenses, Sales, Profitability, **Activity** (timeline), **Documents** (P5 stub).

Project cards primary actions: **View · Expense · Payment · Collection · Stage Update** (DEVELOPMENT).

## Modal behavior

`Modal` props: `mode?: 'view' | 'form'` (default **form**), `isDirty?: boolean`, optional `footer` (sticky Cancel/Save).

| Mode | Backdrop / Escape / X |
|------|------------------------|
| `view` | Close immediately (Activity Log, confirm dialogs) |
| `form` + `!isDirty` | Close immediately |
| `form` + `isDirty` | Confirm: “Unsaved changes. Leave without saving?” Stay / Leave |

- Every dialog must support **ESC** and a top-right **X** (never rely on backdrop alone). Prefer shared `Modal` over raw `fixed inset-0` overlays.
- Large form modals: pass sticky `footer` with Cancel + Save (`ModalFormFooter`); body scrolls, actions stay visible.
- Cancel in footer/body should call `useModalRequestClose()` so dirty confirm is shared.
- Dirty helpers: `isFormDirty` / `useDirtyForm` in `frontend/src/hooks/useDirtyForm.ts`.
- **In-app leave** (sidebar, Back, project select) while a registered form is dirty: three-way prompt **Discard | Save | Cancel** via `useConfirmUnsaved` + `useRegisterUnsaved` / `UnsavedGuardProvider`. Browser refresh uses native `beforeunload` only.
- **Smart Back:** in-app stack in `utils/navHistory.ts` (`pushNavHistory` / `popSmartBack`); Project Detail Back returns to previous screen, not always Projects/Dashboard.

## Global search

- Shortcut: **Ctrl/Cmd+K** (header search button).
- API: `GET /api/search?q=` (JWT, min 2 chars) — projects, land, customers, sales, expenses, suppliers.
- UI: `components/GlobalSearch.tsx` command palette; Enter/click navigates to entity route.

## Components to reuse

- `components/Modal.tsx` — dialogs (`mode` / `isDirty` / `footer` / `useModalRequestClose` / `isModalOpen`)
- `components/ModalFormFooter.tsx` — sticky Cancel + Save
- `components/ConfirmDialog.tsx` — binary `confirm` + `confirmUnsaved` + `UnsavedGuardProvider`
- `components/StatCard.tsx` — dashboard metrics
- `components/DetailDrawer.tsx` — view-only side panels (`footer` slot; Escape defers to Modal)
- `components/Breadcrumbs.tsx` — Project Detail trail
- `components/ColumnPicker.tsx` — table column visibility
- `components/GlobalSearch.tsx` — Ctrl+K palette
- `components/NotificationCenter.tsx` — header bell
- `components/Skeleton.tsx` — list/detail first-paint placeholders
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
- Direct Sale projects: Project Detail hides Construction tab; Sales/Funding/etc. remain.
- **Project Detail workspace:** Overview + Financial Summary always visible; tabs: Construction | Funding | Inventory | Procurement | Labour | Expenses | Sales | Profitability | Activity | Documents.
- Common card actions (primary): **View · Expense · Payment · Collection · Stage Update** (DEVELOPMENT).
- DEVELOPMENT secondary: Issue Material, Add Labour, Purchase Material, Sell Project.
- DIRECT_SALE: Record Sale, View Profit.
- Secondary row: Activity, Upload Document (P5 stub), Edit, Delete / Restore.
- **+ Collection** modes: Installment payment vs Full / direct payment (sale picker; amount capped to balance due).
- Prefer short `placeholder` hints on text/number inputs (name, budget, etc.).
- **FieldLabel:** form labels include a small **(i)** tip (hover/focus) explaining the field — used on Projects create/edit and Project Detail stage/sell forms.
- **MoneyInput:** PKR amount fields show en-PK comma grouping while storing digit-only values (`formatMoneyDisplay` / `parseMoneyInput` in `utils/money.ts`). Used for project budget, target sale, stage budgets, and sell-as-is price.
- **Plot size:** single numeric input + unit selector (Gazz / Sq. Ft / Marla) with live **Equivalent Sizes** panel (`PlotSizeField`). Store only `plot_size_sqft`. Cards show `Plot: X Gazz · Y Sq. Ft · Z Marla` (or legacy free-text if no sqft).
- **Settings → Measurement Standards:** Pakistan (1 Marla = 272.25 Sq Ft) or Custom Marla→Sq Ft; Gazz fixed at 9 Sq Ft. Above Danger Zone reset UI.
- **Construction stages (DEVELOPMENT):** 11-stage template under Construction tab; timeline shows Budget, Actual Cost (expenses + labour + materials), dates, completion %. **Sell Project** banner + modal (buyer/price/date) → Sold During Construction / Sold As-Is; stages lock.
- Expense categories include **Fuel** and **Finance** (interest / bank charges) in addition to Land Purchase, Materials, Labour, Equipment Rental, Transport, Utilities, Administration, Other.
- **Funds → Investor Ledger:** INVESTOR/EQUITY commitments with committed / received / remaining and recent receipts.
- **Labour payments:** optional Stage select + Bank account when method is Bank Transfer / Cheque.

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
