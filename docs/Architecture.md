# Architecture

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 3 |
| Backend (active API) | NestJS 11, TypeORM, JWT (Passport) |
| Database | PostgreSQL |
| Auth | JWT; token stored in `localStorage` on the client |
| Deploy | Render (`render.yaml`, rootDir `backend/server`) |

**Legacy (not the active path):** Express + MySQL sketch under `backend/src/` and most MySQL-oriented SQL under `backend/db/`. Prefer Nest + Postgres. Mock projects seed for Postgres: `backend/db/seed-mock-projects.pg.sql`.

## Frontend structure

```text
frontend/
├── src/
│   ├── App.tsx              # Shell, nav, login, page switcher
│   ├── main.tsx
│   ├── api/                 # fetch wrappers (/api/*)
│   ├── components/          # Modal, StatCard, DetailDrawer, …
│   ├── pages/               # Feature screens (*Page.tsx)
│   └── utils/
├── vite.config.ts           # Proxies /api → http://localhost:4000
└── package.json
```

Vite dev server: `http://localhost:5173`. API calls use relative `/api` (or `VITE_API_URL`).

## Backend structure

```text
backend/
├── package.json             # Proxies npm scripts to server/
├── server/                  # NestJS app (active)
│   ├── src/
│   │   ├── main.ts          # dotenv/config, listen PORT
│   │   ├── app.module.ts
│   │   ├── auth/
│   │   ├── users/
│   │   ├── projects/
│   │   ├── land/
│   │   ├── procurement/     # POs + material requests
│   │   ├── inventory/
│   │   ├── labour/
│   │   ├── expenses/
│   │   ├── cashflow/
│   │   ├── funds/
│   │   ├── sales/
│   │   ├── accounting/
│   │   ├── reports/
│   │   ├── settings/
│   │   └── health/
│   ├── .env / .env.example
│   └── package.json
├── src/                     # Legacy Express (optional)
└── db/                      # SQL seeds / reference schema
```

API default: `http://localhost:4000`. Env: `PORT`, `DATABASE_URL` **or** `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME`.

TypeORM: `autoLoadEntities: true`, `synchronize: true` (schema from entities on startup).

## Request flow

```mermaid
sequenceDiagram
  participant Browser
  participant Vite as ViteDevProxy
  participant Nest as NestJS
  participant PG as PostgreSQL

  Browser->>Vite: GET/POST /api/...
  Vite->>Nest: proxy to :4000
  Nest->>PG: TypeORM query
  PG-->>Nest: rows
  Nest-->>Vite: JSON
  Vite-->>Browser: JSON
```

Production: browser talks to Nest (or reverse proxy) using `VITE_API_URL` / absolute API base as configured.

## Authentication flow

```mermaid
sequenceDiagram
  participant UI as ReactApp
  participant API as NestAuth
  participant DB as PostgreSQL

  UI->>API: POST /api/auth/login
  API->>DB: load user + role
  API-->>UI: access_token + user
  UI->>UI: localStorage token and user
  UI->>API: Authorization Bearer token
  Note over API: JWT strategy validates payload
```

## Material audit trail

```mermaid
flowchart LR
  MR[material_requests]
  AP[approve_reject]
  PO[purchase_orders]
  GR[material_receipts]
  INV[stock_ledger]
  MI[material_issues]
  ST[project_stages]
  MR --> AP --> PO --> GR --> INV --> MI --> ST
```

Goods receipt API writes stock `RECEIPT` rows in the same flow as marking the PO received.

Creating an **expense**, **sale**, or **installment payment** also creates and posts a balanced journal entry (refs `EXP-*` / `SALE-*` / `PMT-*`) against seeded COA accounts.

## High-level data relationships

```mermaid
erDiagram
  projects ||--o{ project_stages : has
  project_stages ||--o| stage_budgets : has
  projects ||--o{ land_parcels : links
  projects ||--o{ material_requests : has
  material_requests ||--o{ material_request_items : has
  material_requests ||--o| purchase_orders : converts_to
  purchase_orders ||--o{ po_items : has
  purchase_orders ||--o{ material_receipts : receives
  materials ||--o{ stock_ledger : movements
  materials ||--o{ material_issues : issues
  project_stages ||--o{ material_issues : charged_to
  accounts ||--o{ journal_entry_lines : posted_to
  journal_entries ||--o{ journal_entry_lines : has
  bank_accounts ||--o{ bank_statement_lines : has
  bank_accounts ||--o{ bank_reconciliations : has
```

## API conventions

- Nest controllers under paths like `/api/projects`, `/api/land/parcels`, `/api/material-requests`, `/api/accounting/...`
- Frontend clients in `frontend/src/api/*.ts` use `getAuthHeaders()` for Bearer token
- Accounting **writes** enforce JWT + roles (`Admin`, `Owner / Director`, `Accountant`); other modules still soft on guards
- Prefer proper HTTP status codes and explicit error messages

## Deployment

[`render.yaml`](../render.yaml): web service `construction-erp-api`, `rootDir: backend/server`, build `npm install && npm run build`, start `npm run start:prod`. Set `DATABASE_URL` (and secrets) in the Render dashboard.

See also [Database.md](Database.md), [API.md](API.md), and [Decisions.md](Decisions.md).
