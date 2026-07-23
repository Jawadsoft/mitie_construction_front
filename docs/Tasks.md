# Tasks

Actionable backlog and **commercial build order**. Narrative detail: [Phases.md](Phases.md), session notes: [Memory.md](Memory.md), feature detail: [scope.md](../scope.md).

Agents must follow the **Commercial roadmap (P1–P5)** below for feature priority.

## Product journey (Funds-first)

Master operational order (see [PRD.md](PRD.md) Lifecycle):

```text
Funds → Land → Project → Strategy (Direct Sale | Development) → Sale → Profit
```

- [x] Funds as first Capital nav module; commitment status + fund dashboard KPIs
- [x] Funds UX: commitment amount min 1,000 + commas/words; source-name + PK bank comboboxes; inline + New project / + New bank
- [ ] Enforce fund allocation before land/project spend (later)
- [ ] Project strategy: Direct Sale vs Development (later)

## Commercial roadmap (P1–P5)

```text
P1 Accounting → P2 MR approvals → P3 BOQ → P4 Equipment → P5 Documents
```

### P1 — Accounting (COA, Journal Entries, General Ledger)

Foundation **shipped**. Deepen only — do not rebuild from scratch.

- [x] Chart of accounts
- [x] Journal entries (balanced; Draft → Post)
- [x] General ledger, trial balance, balance sheet
- [x] Bank accounts, statement lines, reconciliation
- [x] Auto-post operational events (expenses/sales) to journals — expense create, sale create, installment pay → Posted JE (`EXP-*` / `SALE-*` / `PMT-*`); fund receipts → `FUND-*`
- [x] JWT / RBAC on accounting mutating routes — Bearer + roles `Admin`, `Owner / Director`, `Accountant` on POST/PATCH

### P2 — Material Requests + approval workflow

Basic trail **shipped**. Deepen approvals next.

- [x] Create → submit → approve/reject → convert to PO
- [x] Receipt path writes inventory
- [ ] Multi-level approval matrices
- [ ] Notifications / alerts on submit / approve / reject

### P3 — BOQ (Bill of Quantities)

**Not built** — next major greenfield after P1/P2 deepen (or in parallel once deepen is scoped). See [scope.md §5](../scope.md#5-boq--cost-estimation).

- [ ] Project BOQ lines (materials / labour / equipment estimates)
- [ ] Tie BOQ lines to stages and budgets

### P4 — Equipment & machinery

**Not built.** Track site plant and running costs.

- [ ] Equipment registry (excavators, cranes, mixers, …)
- [ ] Fuel usage logging
- [ ] Maintenance logs
- [ ] Cost link to projects / stages where applicable

### P5 — Document management

**Not built** (land parcels store file URL strings only today).

- [ ] Store drawings, contracts, NOCs, approvals, site photos
- [ ] Link documents to projects (and parcels where relevant)
- [ ] Blob upload service (replace URL-only fields)

---

## Done (platform & shipped domains)

- [x] Frontend React + Vite + Tailwind shell
- [x] NestJS API under `backend/server` + health/ping
- [x] PostgreSQL + TypeORM (active path) + local `.env` / dotenv
- [x] Render blueprint (`render.yaml`)
- [x] Auth login (JWT issued)
- [x] Users / roles model + user management UI (9 roles)
- [x] Projects, stages, stage budgets
- [x] Suppliers, purchase orders, material catalog, stock ledger, issues
- [x] Labour contractors, attendance, wages, advances, payments
- [x] Expenses by project/stage (incl. Land Purchase category)
- [x] Property units, customers, sales, installments
- [x] Fund sources/transactions + cash transactions/summaries
- [x] Operational reports + dashboard KPIs
- [x] Land registry (`land_parcels`) + UI
- [x] Postgres mock seed (`backend/db/seed-mock-projects.pg.sql`, `[MOCK]` prefix)
- [x] Docs under `docs/` + Decisions / Database / API / Tasks
- [x] Commercial P1–P5 encoded in docs

## Open — other (parallel, not blocking P3+)

### Security / production

- [ ] Harden RBAC / JWT guards on remaining mutating routes (accounting writes done)
- [ ] Gate or replace TypeORM `synchronize` with production migrations

### Later / polish

- [x] Pakistan location typeahead (Projects + Land) — `PakistanLocationInput`
- [x] Project type radios (Residential / Commercial) + form placeholders
- [ ] Forecasting / projected cashflow
- [ ] Mobile UX polish

### Verification (local)

- [ ] Confirm Nest + Postgres with correct `DB_*` / password / port
- [ ] Smoke-test Land, MR trail, Accounting GL/BS/Bank Recon end-to-end
- [ ] Load mock seed into empty `construction_erp` DB when needed

## How to use

1. Prefer **commercial P1–P5** for feature work (deepen P1/P2, then BOQ → Equipment → Documents).
2. Do RBAC / migrate hardening **in parallel** or when touching those modules — do **not** block BOQ on full RBAC completion.
3. Tick boxes here and in [Phases.md](Phases.md) when verified.
4. Log session outcomes in [Memory.md](Memory.md). If schema/API changes, update [Database.md](Database.md) / [API.md](API.md).
