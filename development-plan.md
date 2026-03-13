## Construction ERP – Development Plan
> Last updated: 2026-03-06 — Phase 5 (Advanced Features) complete

### ✅ Phase 6 – Material & Inventory Management (COMPLETED)
- [x] Material Catalog — name, unit, category, min stock level, standard unit cost, description
- [x] 14 predefined units (bags, kg, ton, pieces, sft, rft, etc.) and 12 categories
- [x] Stock Ledger — every movement recorded: RECEIPT, ISSUE, TRANSFER_IN/OUT, ADJUSTMENT, RETURN
- [x] Receive Stock — record purchase/receipt with unit cost, reference no, project linkage
- [x] Issue Materials to Project — select project, stage, quantity; stock balance validated (prevents over-issue)
- [x] Auto unit cost from material standard cost when issuing
- [x] Stock Adjustments — manual corrections + returns from site
- [x] Stock Summary — current balance, total IN/OUT, stock value per material
- [x] Low Stock Alerts — flags materials below min_stock_level
- [x] Stock Ledger History — filterable by material, project, movement type, date range
- [x] Issues History — all issues with purpose, reference, cost
- [x] Project Utilization Report — total material cost per project, breakdown by material + stage
- [x] Dashboard integration — stock value KPI card + Inventory quick nav
- [x] Profitability report updated to include material issues cost

### ✅ Phase 5 – Advanced Features & Reporting (COMPLETED)
- [x] User Management UI — list, create, edit, assign 9 roles, activate/deactivate
- [x] 9 predefined roles auto-seeded: Admin, Owner/Director, Project Manager, Site Engineer, Procurement Officer, Accountant, Sales Manager, Store Keeper, Supervisor
- [x] Reports Module (backend + frontend) — 8 report types:
  - [x] Project Profitability (profit, margin %, revenue vs cost)
  - [x] Budget vs Actual (project + stage level)
  - [x] P&L Statement (by date range)
  - [x] Cash Flow Report (daily/weekly/monthly grouping)
  - [x] Supplier Payables / Ledger
  - [x] Customer Receivables & Aging
  - [x] Labour Cost by project & contractor
  - [x] Expense Breakdown by category, vendor type, month
- [x] Wage Auto-calculation from attendance × daily rate
- [x] Advance Payments to labour (entity + API + UI)
- [x] Material Receipts — record receiving of PO items, auto-update PO status
- [x] Enhanced Dashboard — budget utilization, property inventory, expected profit, payables, receivables, quick nav
- [x] Cashflow service extended with full dashboard KPIs



This file tracks the development progress of the Construction ERP (frontend + backend).

### Tech Stack (from scope)
- **Frontend**: React.js
- **Backend**: Node.js (Express or NestJS)
- **Database**: MySQL (local, user `root`, no password)
- **Auth**: JWT

---

### Phase 0 – Environment & Skeleton
- [x] Backend project initialized (Express + TypeScript)
- [ ] MySQL database created (`construction_erp`) and connection tested
- [x] Database schema SQL file prepared (`db/schema.sql`)
- [ ] Health check endpoint (`/api/health`)
- [ ] Frontend React app initialized
- [ ] Basic routing + layout (desktop & mobile friendly)

**Testing checklist**
- [ ] Run `npm install` inside `backend/`
- [ ] Start backend with `npm run dev` and see "Backend server running" in console
- [ ] `GET /api/health` returns `{ status: "ok" }`
- [ ] Frontend loads at `http://localhost:3000` and is usable on mobile view

---

### Phase 1 – Core Operations (MVP)

#### 1. Authentication & User Management
- [x] Database tables: `users`, `roles`, `permissions`
- [x] `POST /api/auth/login` (JWT based)
- [ ] `GET /api/auth/me`
- [ ] RBAC middleware (role/permission checks)
- [ ] User management UI (list, create, assign roles)

**Testing checklist**
- [x] Login succeeds with valid credentials and returns JWT
- [ ] Protected endpoints reject requests without/with invalid token
- [ ] Admin can create/edit users and assign roles

#### 2. Project & Construction Stages
- [ ] Tables: `projects`, `project_stages`, `stage_budgets`, `stage_progress`
- [ ] Project CRUD endpoints
- [ ] Stage CRUD endpoints per project
- [ ] Track stage budget, actual costs, dates, completion %
- [ ] Project & stage screens in frontend (list + detail views)

**Testing checklist**
- [ ] Create/edit/delete project via UI and verify in DB
- [ ] Add stages with budgets and completion %; values reflected in project detail
- [ ] Mobile view is readable and scrollable for projects and stages

#### 3. Supplier, Labour & Expense Management
- [ ] Tables: `suppliers`, `labour_contractors`, `labour_attendance`, `labour_payments`, `expenses`
- [ ] Supplier CRUD endpoints + UI
- [ ] Labour CRUD, attendance, and payments endpoints + UI
- [ ] Expense entry with required links (project, stage, category, vendor/labour, payment type, date)

**Testing checklist**
- [ ] API rejects cost entries missing required fields (project, stage, etc.)
- [ ] UI allows entering and viewing suppliers, labour, and expenses
- [ ] Stage and project costs update based on expenses and labour payments

#### 4. Cashflow & Dashboard (MVP)
- [ ] Table: `cash_transactions`
- [ ] Cash inflow/outflow endpoints
- [ ] Basic dashboard widgets (active projects, budget vs actual, cash balance)
- [ ] Simple charts for expenses over time or stage completion

**Testing checklist**
- [ ] Adding expenses/payments changes cash balance correctly
- [ ] Dashboard numbers match underlying data
- [ ] Dashboard is usable on mobile (cards/charts adapt to small screens)

---

### Phase 2 – Procurement, Inventory, Fund & Sales

#### 5. Procurement & Inventory
- [ ] Tables: `purchase_orders`, `purchase_order_items`, `material_receipts`
- [ ] Procurement workflow endpoints (request → PO → receipt)
- [ ] Procurement & inventory UI

#### 6. Fund Management
- [ ] Tables: `fund_sources`, `fund_transactions`
- [ ] Fund entry & utilization endpoints
- [ ] Fund overview UI (by source and by project)

#### 7. Sales & Customer Receivables
- [ ] Tables: `customers`, `properties`, `property_units`, `sales`, `sale_installments`
- [ ] Sales & receivables endpoints
- [ ] Property inventory & sales UI

---

### Phase 3 – Accounting, Analytics, Approvals, Mobile Polish

#### 8. Accounting
- [ ] Tables: `accounts`, `journal_entries`
- [ ] Basic accounting endpoints (receipts, payments, journals)
- [ ] Financial reports (P&L, Balance Sheet, Cashflow, Project profitability)

#### 9. Advanced Analytics & Forecasting
- [ ] Aggregation/analytics endpoints
- [ ] Advanced charts & reports in UI

#### 10. Approval Workflows & Mobile Polish
- [ ] Approval statuses for key entities (POs, payments, etc.)
- [ ] Approval screens
- [ ] Final mobile UX polish (navigation, performance, readability)

---

### Notes
- Update this file as tasks are started/completed.
- Use the testing checklists before moving to the next phase or module.
