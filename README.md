# Construction ERP System

Enterprise Resource Planning (ERP) for construction-to-sale property businesses. Covers land purchase through construction, supplier payments, cashflow, property sales, and profit calculation in one platform.

## Overview

Lifecycle flow:

Land Purchase → Construction Stages → Supplier & Labour Payments → Cashflow → Property Sales → Profit Calculation

**Key benefits:**

- Real-time project progress tracking
- Cost control across stages and categories
- Supplier and labour management
- Cashflow monitoring
- Property and sales inventory
- Automated profit calculation

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | React + TypeScript + Vite + Tailwind CSS |
| **Backend (active API)** | NestJS + TypeORM + JWT |
| **Database** | PostgreSQL |
| **Deployment** | Render (`render.yaml`) |

> Note: `backend/src` still contains an older Express + MySQL sketch, and most `backend/db/*.sql` files are MySQL-oriented. Use [`backend/db/seed-mock-projects.pg.sql`](backend/db/seed-mock-projects.pg.sql) for Postgres mock projects. The running API is **NestJS** under `backend/server` with **PostgreSQL**.

---

## Project Structure

```text
mitie_construction_front/
├── frontend/                 # React + Vite app
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts        # Proxies /api → http://localhost:4000
│   └── tailwind.config.js
├── backend/
│   ├── server/               # NestJS API (active)
│   │   ├── src/              # Modules: auth, users, projects, inventory, etc.
│   │   ├── package.json
│   │   └── nest-cli.json
│   ├── src/                  # Legacy Express entry (optional)
│   ├── db/                   # Reference SQL / seed scripts
│   └── package.json          # Proxies npm scripts to backend/server
├── docs/                     # PRD, architecture, API, database, tasks, …
├── development-plan.md       # Historical checklist (root)
├── scope.md                  # Detailed scope (root)
├── render.yaml
└── README.md
```

---

## Core Modules

### 1. User Management

- 9 roles: Admin, Owner/Director, Project Manager, Site Engineer, Procurement Officer, Accountant, Sales Manager, Store Keeper, Supervisor
- Role-based access control (RBAC)
- User create/edit and activate/deactivate

### 2. Project Management

- Project status: Planning, Active, On Hold, Completed, Sold
- Stage-wise budget and cost tracking
- Location, plot size, and timeline

### 2b. Land Registry

- Plot number, owner, location, area
- Purchase agreement and sale deed metadata (numbers, dates, file URLs)
- Link parcels to projects; costs still recorded via Expenses (Land Purchase)

### 3. Construction Stages

Example stages: Land Purchase, Design, Excavation, Foundation, Structure, Masonry, Plumbing, Electrical, Plaster, Flooring, Paint, Fixtures, External Works, Inspection, Ready for Sale

Per-stage: budget vs actual, labour/material/equipment/overhead, dates, completion %

### 4. Material & Inventory Management — Phase 6 complete

- Material catalog (units + categories)
- Stock ledger: RECEIPT, ISSUE, TRANSFER_IN/OUT, ADJUSTMENT, RETURN
- Stock balance validation and low-stock alerts
- Utilization reports by project and stage

### 5. Procurement & Supplier Management

- Material requests (site engineer) → submit → approve/reject → convert to PO
- Suppliers, purchase orders, goods receipts (receipt writes stock ledger)
- Payment terms and PO status trail

### 5b. Accounting

- Chart of accounts, journal entries (Draft → Post)
- Trial balance, general ledger, balance sheet (posted only)
- Bank accounts, statement lines, reconciliation periods

### 6. Labour & Contractor Management

- Contractors, attendance, wage calculation, advances
- Labour cost by project and stage

### 7. Expense Management

- Categories (transport, fuel, equipment rent, utilities, etc.)
- Project/stage allocation

### 8. Fund Management

- Owner, investor, loan, and partner capital tracking

### 9. Property & Sales Management

- Units: Available, Reserved, Sold
- Customers, bookings, installments

### 10. Cashflow & Finance

- Cash vs bank transactions and schedules
- P&L, cashflow, and related reports

### 11. Reporting & Analytics — Phase 5 complete

Eight report types: Project Profitability, Budget vs Actual, P&L, Cash Flow, Supplier Payables, Customer Receivables & Aging, Labour Cost, Expense Breakdown

### 12. Dashboard

Active projects, stage completion, budget vs actual, payables/receivables, cash balance, KPIs

---

## System Rules

**Every cost entry should include:** project, construction stage, category, vendor or labour, payment type, date.

**Every payment updates:** cash balance, payables, stage cost, project cost.

**Every sale updates:** revenue, customer receivables, project profit.

---

## Getting Started

### Prerequisites

- Node.js 20+ (recommended; NestJS 11 / Vite 7)
- PostgreSQL 14+
- npm

### Environment

Create a `.env` in `backend/server/` (or set env vars in your shell / Render):

```env
PORT=4000
# Prefer DATABASE_URL in production (Render)
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/construction_erp

# Or local discrete vars (used when DATABASE_URL is unset):
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=construction_erp
```

TypeORM is configured with `synchronize: true` in development/deploy config, so schema is created/updated from entities on startup. Do not rely on `npm run migrate` — that script is not defined.

### Mock data (projects / stages / budgets)

After the API has started once (so tables exist), load sample rows from [`backend/db/seed-mock-projects.pg.sql`](backend/db/seed-mock-projects.pg.sql) in pgAdmin Query Tool, or:

```bash
psql -h localhost -p 5432 -U postgres -d construction_erp -f backend/db/seed-mock-projects.pg.sql
```

Use your real `DB_PORT` if it is not `5432`. Project names are prefixed with `[MOCK]`. Re-running the file deletes previous `[MOCK]` rows then re-inserts. To wipe only: run the cleanup `DELETE` block at the top of that file.

### Backend setup

```bash
cd backend
npm install
npm run dev
```

`npm run dev` starts NestJS in watch mode (`backend/server`). API defaults to **http://localhost:4000**.

Optional health check: `GET http://localhost:4000/api/health` (or the health route exposed by the Nest health module).

### Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Vite serves the UI at **http://localhost:5173** and proxies `/api` to `http://localhost:4000`.

### Scripts

| Location | Script | Purpose |
|----------|--------|---------|
| `frontend/` | `npm run dev` | Vite dev server |
| `frontend/` | `npm run build` | Production build |
| `frontend/` | `npm run preview` | Preview production build |
| `frontend/` | `npm run lint` | ESLint |
| `backend/` | `npm run dev` | NestJS watch mode |
| `backend/` | `npm run build` | Install + build NestJS |
| `backend/` | `npm start` | Production start (`start:prod`) |

---

## Development Phases

- **Phase 6** — Material & Inventory Management: complete
- **Phase 5** — Advanced features & reporting: complete
- **Phases 9–11** — Commercial greenfield: BOQ → Equipment → Documents (see docs)

Next commercial modules: see [docs/Tasks.md](docs/Tasks.md) **P1–P5**. Narrative checklists: [docs/Phases.md](docs/Phases.md); historical: `development-plan.md`.

---

## Profit Calculation

```text
Profit = Revenue from Sale
       - Land Cost
       - Construction Cost
       - Labour Cost
       - Supplier Payments
       - Overhead Costs
       - Financing Costs
       - Material Costs
```

---

## Deployment

Configured for Render via `render.yaml`:

```yaml
services:
  - type: web
    name: construction-erp-api
    runtime: node
    rootDir: backend/server
    buildCommand: npm install && npm run build
    startCommand: npm run start:prod
```

Set `DATABASE_URL` (and any JWT/secrets your environment requires) in the Render dashboard. Bind uses `PORT` from the platform.

---

## Additional Documentation

Index: [docs/README.md](docs/README.md). **Commercial build order:** [docs/Tasks.md](docs/Tasks.md) P1–P5.

- [docs/PRD.md](docs/PRD.md) — product requirements
- [docs/Architecture.md](docs/Architecture.md) — stack, folders, data/API flows
- [docs/Database.md](docs/Database.md) — TypeORM entity / table reference
- [docs/API.md](docs/API.md) — Nest endpoint inventory
- [docs/Design.md](docs/Design.md) — UI/UX conventions
- [docs/Rules.md](docs/Rules.md) — development standards
- [docs/Phases.md](docs/Phases.md) — phased roadmap
- [docs/Tasks.md](docs/Tasks.md) — actionable backlog + commercial priorities P1–P5
- [docs/Decisions.md](docs/Decisions.md) — locked stack decisions
- [docs/Memory.md](docs/Memory.md) — session diary (update after each session)
- [scope.md](scope.md) — detailed scope and feature specifications (root)
- [development-plan.md](development-plan.md) — historical checklist / progress (root)

---

## Contributing

1. Create a feature branch from `main`
2. Make changes and test locally (frontend + API)
3. Open a pull request with a clear description

## License

Proprietary — developed by Jawadsoft.

## Support

For issues or feature requests, contact the development team or open a repository issue.

---

Last updated: July 2026  
Current milestone: Phase 6 (Material & Inventory Management) — complete
