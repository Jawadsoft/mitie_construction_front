# Construction ERP System — Product Requirements Document (PRD)

## Overview

A web-based ERP for **construction-to-sale** property businesses. The product manages the full project lifecycle in one platform so owners and teams do not need separate tools for construction, inventory, procurement, accounting, sales, and site labour.

**Related docs:** [scope.md](../scope.md), [Architecture.md](Architecture.md), [Phases.md](Phases.md), [Tasks.md](Tasks.md) (commercial P1–P5), [README.md](../README.md)

## Commercial roadmap

Agents and product work follow this order. Full checkboxes: [Tasks.md](Tasks.md).

| Priority | Module | Status |
|----------|--------|--------|
| **P1** | Chart of Accounts, Journal Entries, General Ledger | **Done** (incl. auto-post + accounting write RBAC) |
| **P2** | Material Requests + approval workflow | **Basic trail done** — deepen (multi-level approvals, notifications) |
| **P3** | BOQ (Bill of Quantities) | **Not built** — next major greenfield |
| **P4** | Equipment & machinery (assets, fuel, maintenance) | **Not built** |
| **P5** | Document management (drawings, contracts, NOCs, approvals, site photos) | **Not built** (URL fields only on land today) |

## Why we are building it

Construction businesses often track costs and progress across spreadsheets and disconnected apps. That breaks the link between stage budgets, material issues, labour, cash, and eventual property sales—so true project profit is hard to see.

This ERP keeps **one project timeline** and hangs costs, materials, labour, cash, and sales off the same projects and stages.

## Problem it solves

Instead of separate software for:

- Construction tracking
- Inventory
- Procurement
- Accounting
- Sales
- HR / site labour

everything required for the construction-to-sale flow is handled inside one ERP (site labour is covered; full office HR is out of scope).

## Lifecycle

```text
Funds (commit + receive capital)
     ↓
Land / Property Acquisition
     ↓
Project Creation
     ↓
Choose Project Strategy
     ├─ Direct Sale
     └─ Development (Construction)
            ↓
       Construction Stages
            ↓
       Sale Anytime
            ↓
       Profit Calculation
```

**Product journey:** Capital → Funds is the first operational module. Project funding should come from fund commitments and receipts.

## Target users (roles)

| Role | Typical use |
|------|-------------|
| Admin | Users, settings, full access |
| Owner / Director | Dashboards, funds, profit, high-level oversight |
| Project Manager | Projects, stages, budgets, approvals |
| Site Engineer | Material requests, stage progress |
| Procurement Officer | Approve requests, POs, suppliers, receipts |
| Accountant | Journals, TB/GL/BS, bank reconciliation, cashflow |
| Sales Manager | Customers, units, sales, installments |
| Store Keeper | Inventory receive/issue, stock |
| Supervisor | Site attendance / operational support |

## Core features (required)

### Authentication and access

- JWT login
- Role assignment (nine predefined roles)
- RBAC is a product requirement; middleware enforcement is still partial in places—treat as hardening backlog

### Projects and stages

- Create/manage projects (status, budget, location, plot size, dates)
- `project_type` is **Residential** or **Commercial** (UI radios; default Residential)
- Location entry via Pakistan city/area typeahead (`PakistanLocationInput`); free text still allowed
- Construction stages with sequence, % complete, stage budgets

### Land registry

- Parcel records: plot number, owner, location, area
- Location uses the same Pakistan typeahead as projects
- Purchase agreement and sale deed metadata (numbers, dates, file URLs)
- Link to project; purchase **cost** still via Expenses (category Land Purchase)

### Materials audit trail

```text
Site Engineer → Material Request → Approval → Purchase Order
  → Goods Receipt → Inventory → Material Issue → Construction Stage
```

**P2 status:** single-step submit / approve / reject / convert is shipped. Multi-level approvals and notifications are backlog (see [Tasks.md](Tasks.md) P2).

### Suppliers and procurement

- Supplier master
- Purchase orders and receipts (receipt writes stock ledger)

### Inventory

- Material catalog, stock ledger, issues, low-stock / utilization

### Labour

- Contractors, attendance, wages, advances

### Expenses and funds

- Project/stage expenses by category — **Direct** (cash/bank) or **Bill** (AP accrual) with later Pay
- **Funds (first step):** commitments linked to partner banks; receipts auto-post to Cash & Bank
- Commitment statuses: `Committed` → `Partially_Received` → `Fully_Received` (or `Cancelled`)
- Fund dashboard KPIs: Total Committed / Received / Pending; Investor count; Loan amount; Owner capital (equity)
- Commitment form UX: Source Name combobox; Total Committed min PKR 1,000 with comma formatting + amount in words; optional project link with inline create
- Quick-add partner bank: major PK banks combobox (HBL, NBP, UBL, …) + Other; opening balance defaults to 0 (set under Accounting if needed)
- Optional link of fund source to project for card rollups; project funding should originate from Funds
- Project file: budget + target sale price; card shows spent / collected progress

### Sales

- Property units, customers, sales, installments

### Cashflow

- Cash/bank transaction register and summaries

### Accounting

- Chart of accounts
- Journal entries (Draft → Posted; debit = credit)
- Trial balance, general ledger, balance sheet (posted only)
- Bank accounts, statement lines, reconciliation periods

**P1 status:** foundation + deepen shipped (auto-post on expense/sale/payment; JWT roles on accounting POST/PATCH). See [Tasks.md](Tasks.md) P1.

### BOQ (Bill of Quantities) — P3 required future

- Project quantity/cost estimates for materials, labour, and equipment
- Link lines to construction stages and budgets
- Detail: [scope.md §5](../scope.md#5-boq--cost-estimation)

### Equipment & machinery — P4 required future

- Registry for site plant (excavators, cranes, mixers, …)
- Fuel usage and maintenance logs
- Optional cost attribution to projects / stages

### Document management — P5 required future

- Store drawings, contracts, NOCs, approvals, site photos
- Link documents to projects (and land parcels where relevant)
- Real blob upload (beyond URL string fields on land parcels)
- Detail: [scope.md §15](../scope.md#15-document-management)

### Reporting and dashboard

- Project profitability, budget vs actual, P&L (operational), cashflow, payables/receivables, labour/expense breakdowns
- Dashboard KPIs and navigation

## System rules

Every cost entry should include: project, stage, category, vendor or labour, payment type, date.

Every payment should update: cash balance, payables, stage cost, project cost.

Every sale should update: revenue, customer receivables, project profit.

## Non-functional requirements

- Responsive layout (mobile drawer + desktop sidebar)
- Role model and JWT authentication
- Material request → issue audit trail
- PostgreSQL persistence; TypeORM `synchronize` acceptable in current environments
- Deployable API on Render (`render.yaml`)

## Backlog vs out of scope

**Commercial backlog** (not permanent exclusions — see [Tasks.md](Tasks.md) P1–P5):

- Multi-level approval matrices / notifications (P2)
- BOQ, equipment/fuel/maintenance, document blob storage (P3–P5)

**Explicitly out of scope (for now):**

- Full office HRIS (leave, hiring, office payroll)
- Replacing operational P&L with COA-only P&L (both may coexist)
- Native mobile site-engineer app (responsive web first)

## Success criteria

- A project can be tracked from land registration through construction costs to sale and profitability reports
- Materials can be requested, approved, ordered, received, and issued to a stage with a clear trail
- Accountants can post journals and view TB, GL, balance sheet, and basic bank reconciliation
- Roadmap progresses P1 deepen → P2 deepen → BOQ → Equipment → Documents without rebuilding shipped foundations
