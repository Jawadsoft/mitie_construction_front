# Development Phases

Checklist-style roadmap for agents and humans. Detail checklists also live in [development-plan.md](../development-plan.md). Product intent: [PRD.md](PRD.md), [scope.md](../scope.md).

**Commercial build order (source of truth):** [Tasks.md](Tasks.md) P1–P5.

## Phase 0 — Environment and skeleton

- [x] Frontend React + Vite app
- [x] NestJS API under `backend/server`
- [x] Health endpoint
- [x] PostgreSQL via TypeORM (active path)
- [x] Local `.env` + dotenv loading
- [x] Render blueprint (`render.yaml`)

## Phase 1 — Core operations (MVP)

- [x] Auth login (JWT)
- [x] Users / roles seed model
- [x] Projects and construction stages
- [x] Stage budgets
- [ ] Hardened RBAC on all mutating routes (partial) — parallel with Phase 8

## Phase 2 — Procurement, inventory, labour, expenses

- [x] Suppliers and purchase orders
- [x] Material catalog, stock ledger, issues
- [x] Labour contractors, attendance, wages, advances
- [x] Expenses by project/stage
- [x] Material request → approve → convert to PO
- [x] Receipt path writes inventory in one API flow
- [ ] Multi-level MR approvals / notifications — **P2 deepen** ([Tasks.md](Tasks.md))

## Phase 3 — Sales, funds, cashflow

- [x] Property units, customers, sales, installments
- [x] Fund sources and transactions
- [x] Funds-first product entry: Capital nav, commitment status, fund dashboard KPIs ([Tasks.md](Tasks.md) Product journey)
- [x] Funds form UX: min commitment 1,000 + money words; PK bank / source-name comboboxes; inline new project/bank
- [x] Cash transactions and summaries

## Phase 4 — Accounting foundation

- [x] Chart of accounts (seeded)
- [x] Journal entries with debit = credit
- [x] Trial balance
- [x] Journal Draft → Post
- [x] General ledger report
- [x] Balance sheet report
- [x] Bank accounts, statement lines, reconciliation periods
- [x] Auto-post operational events (expenses/sales) to journals — **P1 deepen** ([Tasks.md](Tasks.md))
- [x] JWT / RBAC on accounting POST/PATCH (`Admin`, `Owner / Director`, `Accountant`) — **P1 deepen**

## Phase 5 — Advanced features and reporting (complete)

- [x] User management UI (9 roles)
- [x] Eight report types (profitability, budget vs actual, P&L, cashflow, payables, receivables, labour, expenses)
- [x] Enhanced dashboard KPIs

## Phase 6 — Material and inventory depth (complete)

- [x] Catalog units/categories, ledger movement types
- [x] Stock validation, low stock, utilization reports

## Phase 7 — Land and title (added)

- [x] Land registry (`land_parcels`) + UI
- [x] Land Purchase expense category
- [ ] Document blob storage / upload service — moved to **Phase 11 / P5**

## Phase 8 — Production hardening (parallel)

Does **not** block Phase 9+ commercial greenfield.

- [ ] Strong RBAC / JWT guards by role on **all** sensitive endpoints (accounting writes done — see Phase 4)
- [ ] Turn off or gate `synchronize` for strict production migrations
- [ ] Mobile UX polish
- [ ] Forecasting / projected cashflow

## Phase 9 — BOQ (P3)

- [ ] Project Bill of Quantities (materials / labour / equipment estimates)
- [ ] Tie BOQ lines to stages and budgets
- Detail: [scope.md §5](../scope.md#5-boq--cost-estimation), [Tasks.md](Tasks.md) P3

## Phase 10 — Equipment & machinery (P4)

- [ ] Equipment registry (excavators, cranes, mixers, …)
- [ ] Fuel usage logging
- [ ] Maintenance logs
- [ ] Cost link to projects / stages
- Detail: [Tasks.md](Tasks.md) P4

## Phase 11 — Document management (P5)

- [ ] Store drawings, contracts, NOCs, approvals, site photos
- [ ] Project (and parcel) document linking
- [ ] Blob upload service (replace URL-only land fields)
- Detail: [scope.md §15](../scope.md#15-document-management), [Tasks.md](Tasks.md) P5

## Demo / seed data

- [x] Postgres mock projects + stages + budgets: `backend/db/seed-mock-projects.pg.sql` (`[MOCK]` prefix)

## How to use this file

1. Follow commercial order in [Tasks.md](Tasks.md): deepen P1/P2, then Phases 9 → 10 → 11 (BOQ → Equipment → Documents).
2. Run Phase 8 hardening in parallel or when touching secured modules — do not block BOQ on full RBAC.
3. After a session, update [Memory.md](Memory.md) and tick boxes here when work is verified.
