# Project Memory

Diary for agents and developers. Update this file at the end of every development session.

## Completed

- Backend Option A cleanup: removed legacy Express package at `backend/` root (`src`, parent `package.json`/`node_modules`); Nest remains sole API in `backend/server` (dropped unused `construction-erp-backend` file:.. dependency)
- Construction stages: 11-stage DEVELOPMENT template auto-seeded on create; stage `actual_cost` from expenses; Sell Project mid-construction (`POST .../sell-during-construction`) → Sold As-Is + status Sold During Construction + stage lock; statuses include Cancelled
- Plot size converter: `plot_size_sqft` canonical storage; `PlotSizeField` (size + Gazz/Sq Ft/Marla) with live equivalents; Settings → Measurement Standards (`app_settings`, Pakistan 272.25 or custom Marla); project cards show converted sizes
- Funds UX polish: Total Committed min PKR 1,000 + comma display + amount-in-words (`utils/money.ts`); Source Name combobox; Add Bank PK bank list (`pakistanBanks` / `PakistanBankNameInput`); + New project on commitment form; opening balance omitted on Funds quick-add bank (defaults 0)
- Funds-as-first-module: Capital nav; commitment status (Committed / Partial / Fully / Cancelled); KPIs (Pending, Investors, Loan, Owner Capital); Guide + PRD lifecycle updated
- Expenses: Direct vs Bill; Pay from partner bank (Bank Transfer/Cheque); bill pay → `EXPPMT-*`; delete cleans EXP/EXPPMT journals
- Deleting expense / fund receipt / sale now removes matching auto JE (`EXP-*` / `FUND-*` / `SALE-*`+`PMT-*`); Accounting has Delete + Clean orphan JEs
- Projects: `target_sale_price`; list cards show budget used + sale collections (+ fund receipts when linked); quick +Expense / +Collection (Installment vs Full/Direct via `POST /api/sales/list/:id/collect`) / +Payment on cards
- Fund receipts auto-post JE (`FUND-*`) to each bank’s COA sub-account under `1000` Cash & Bank (not the parent alone); banks auto-create children `1001+` on create; opening balance posts `BANK-OPEN-*` (Dr bank / Cr `3000`)
- Funds: inject sources by partner bank (`bank_account_id` → `bank_accounts`) instead of project; UI bank selector on Funds page
- Projects form: **Project Strategy** — `project_type` READY_PROPERTY|LAND + `project_subtype` + `project_strategy` DIRECT_SALE|DEVELOPMENT; Direct Sale blocks stages
- Projects form: Type A/B category/purpose naming retired in favor of type/strategy
- Pakistan location typeahead: `pakistanLocations.ts` + `PakistanLocationInput`; wired on Projects create/edit and Land parcels
- P1 deepen: auto-post journals on expense create / sale create / installment pay / sale collect (`EXP-*`, `SALE-*`, `PMT-*`); transactional with ops rows
- P1 deepen: JWT + RolesGuard on accounting POST/PATCH (`Admin`, `Owner / Director`, `Accountant`); `JWT_SECRET` env with local fallback
- Encoded commercial priorities P1–P5 into docs (Tasks source of truth; Phases 9–11; PRD/Rules/Memory/scope/README pointers)
- Docs relocated to `docs/`; added Decisions, Database, API, Tasks + index
- README corrected for NestJS + PostgreSQL; local `.env` + dotenv in Nest `main.ts`
- Nest watch/`dist` stability (`deleteOutDir: false`); TypeScript `include`/`exclude` for `src` vs `test`
- ESLint ignore for `dist/**`
- Postgres mock seed: `backend/db/seed-mock-projects.pg.sql` (4 `[MOCK]` projects + stages + budgets)
- Land Registry module + `LandPage` + Land Purchase expense category
- Material Request trail: create → submit → approve/reject → convert to PO; PO/item FKs
- Goods receipt API writes stock ledger in one call
- Accounting: JE Post; Trial Balance (posted); General Ledger; Balance Sheet
- Bank reconciliation: bank accounts, statement lines, periods + Accounting UI tabs

## In Progress

- None (Project Strategy + stage gating shipped)

**Current focus:** P2 deepen next (multi-level MR approvals) per [Tasks.md](Tasks.md).

## Pending

Commercial order ([Tasks.md](Tasks.md)):

1. **P2 deepen** — Multi-level MR approvals / notifications
2. **P3** — BOQ (Bill of Quantities)
3. **P4** — Equipment & machinery (registry, fuel, maintenance)
4. **P5** — Document management (drawings, contracts, NOCs, approvals, photos + blob upload)

Parallel (do not block P3+):

- Harden RBAC / JWT guards on remaining mutating endpoints (beyond accounting)
- Production migration strategy (gate `synchronize`)

## Last update

24 July 2026 — Project Strategy (Direct Sale vs Development) + stage gating

## Session ritual

When a development session ends, update this file:

1. Move finished work into **Completed** (short bullets).
2. Set **In Progress** to the single current task (and file path if useful).
3. Refresh **Pending** to match [Tasks.md](Tasks.md) commercial P1–P5 (drop done items; add new blockers).
4. Tick matching boxes in [Tasks.md](Tasks.md) and [Phases.md](Phases.md).
5. If entities or Nest controllers changed, update [Database.md](Database.md) and/or [API.md](API.md).
6. Set **Last update** to today’s date.
