# API

NestJS controllers under `backend/server/src/`. Base URL locally: `http://localhost:4000`. Vite proxies `/api` → that host.

## Auth

- **Login:** `POST /api/auth/login` with `{ email, password }` → `{ access_token, user }` (JWT payload includes `role` name).
- **Client:** stores JWT in `localStorage` and sends `Authorization: Bearer <token>` via `getAuthHeaders()`.
- **Secret:** `JWT_SECRET` env (fallback to built-in dev secret locally).
- **Guards (partial):** Accounting **POST/PATCH** require `JwtAuthGuard` + `RolesGuard` with roles `Admin`, `Owner / Director`, or `Accountant`. Accounting **GET**s remain open for this slice. Other `/api/*` modules are still unguarded ([Tasks.md](Tasks.md) Phase 8).

Health/ping are intentionally public.

---

## Auth — `/api/auth`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/login` | Email/password login; returns JWT |

---

## Users — `/api/users`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/users` | List users |
| GET | `/api/users/roles` | List roles |
| GET | `/api/users/:id` | Get user |
| POST | `/api/users` | Create user |
| PATCH | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Deactivate user |

---

## Projects — `/api/projects`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/projects` | List projects |
| GET | `/api/projects/:id` | Get project |
| POST | `/api/projects` | Create project |
| PATCH | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| GET | `/api/projects/:id/stages` | List stages |
| POST | `/api/projects/:id/stages` | Create stage (+ budget fields via DTO) |
| PATCH | `/api/projects/stages/:stageId` | Update stage |

---

## Land — `/api/land/parcels`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/land/parcels` | List parcels (optional filters in service) |
| GET | `/api/land/parcels/:id` | Get parcel |
| POST | `/api/land/parcels` | Create parcel |
| PATCH | `/api/land/parcels/:id` | Update parcel |
| DELETE | `/api/land/parcels/:id` | Delete parcel |

---

## Material requests — `/api/material-requests`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/material-requests` | List; query `project_id`, `status` |
| GET | `/api/material-requests/:id` | Get with items |
| POST | `/api/material-requests` | Create draft |
| PATCH | `/api/material-requests/:id` | Update draft |
| POST | `/api/material-requests/:id/submit` | Draft → Submitted |
| POST | `/api/material-requests/:id/approve` | Approve; body may include approver fields |
| POST | `/api/material-requests/:id/reject` | Reject; body includes reason |
| POST | `/api/material-requests/:id/convert-to-po` | Approved → PO; body includes supplier etc. |

---

## Procurement — `/api/procurement`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/procurement` | List POs; optional query filters |
| GET | `/api/procurement/receipts` | List receipts; query `purchase_order_id` |
| GET | `/api/procurement/:id` | Get PO |
| POST | `/api/procurement` | Create PO |
| PATCH | `/api/procurement/:id` | Update PO |
| DELETE | `/api/procurement/:id` | Delete PO |
| POST | `/api/procurement/:id/receipts` | Create receipt; writes stock ledger |

Declare static `receipts` route before `:id` (already ordered in controller).

---

## Inventory — `/api/inventory`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/inventory/materials` | Catalog; query `category` |
| GET | `/api/inventory/materials/categories` | Distinct categories |
| GET | `/api/inventory/materials/:id` | One material |
| POST | `/api/inventory/materials` | Create |
| PATCH | `/api/inventory/materials/:id` | Update |
| DELETE | `/api/inventory/materials/:id` | Delete |
| GET | `/api/inventory/stock` | Stock summary; query `project_id` |
| GET | `/api/inventory/stock/low-alerts` | Below min level |
| GET | `/api/inventory/ledger` | Ledger; query `material_id`, `project_id`, `movement_type`, `from`, `to` |
| POST | `/api/inventory/receive` | Manual receipt movement |
| POST | `/api/inventory/issue` | Issue to project/stage |
| GET | `/api/inventory/issues` | Issue history; project/stage/material filters |
| POST | `/api/inventory/adjust` | Adjustment / return |
| GET | `/api/inventory/utilization/:project_id` | Project material utilization |

---

## Suppliers — `/api/suppliers`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/suppliers` | List |
| GET | `/api/suppliers/:id` | Get |
| POST | `/api/suppliers` | Create |
| PATCH | `/api/suppliers/:id` | Update |
| DELETE | `/api/suppliers/:id` | Delete |

---

## Labour — `/api/labour`

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/labour/contractors` | List / create |
| GET/PATCH/DELETE | `/api/labour/contractors/:id` | CRUD one |
| GET/POST | `/api/labour/attendance` | List (query project/contractor) / create |
| PATCH/DELETE | `/api/labour/attendance/:id` | Update / delete |
| GET | `/api/labour/wages` | Calculated wages; query project/contractor |
| GET/POST | `/api/labour/payments` | List / create |
| PATCH/DELETE | `/api/labour/payments/:id` | Update / delete |
| GET/POST | `/api/labour/advances` | List / create |

---

## Expenses — `/api/expenses`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/expenses` | List; query `project_id`, `project_stage_id`, `category`, `status`, `entry_mode` |
| GET | `/api/expenses/summary` | Summary; query `project_id` |
| GET | `/api/expenses/:id/payments` | Bill payment history |
| POST | `/api/expenses` | Create (`DIRECT` or `BILL`); JE `EXP-*` |
| POST | `/api/expenses/:id/pay` | Pay accrual bill (partial OK); JE `EXPPMT-*` |
| PATCH | `/api/expenses/:id` | Update |
| DELETE | `/api/expenses/:id` | Delete + remove `EXP-*` / `EXPPMT-*` journals |

**Direct:** Dr expense / Cr Cash or selected partner bank COA. **Bill:** Dr expense / Cr AP (`2000`); later pay clears AP from selected bank.  
Expense COA map: LABOUR→5100; SUPPLIER/material→5200; overhead/land/admin→5300; else→5000.

---

## Funds — `/api/funds`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/funds/sources` | List; query `bank_account_id`, `project_id`, `status` (joins bank name) |
| GET | `/api/funds/sources/:id` | Get source |
| POST | `/api/funds/sources` | Create commitment (`bank_account_id` required; status defaults Committed) |
| PATCH/DELETE | `/api/funds/sources/:id` | Update (incl. Cancelled / Reactivate) / delete |
| GET | `/api/funds/transactions` | List; query `fund_source_id` |
| POST | `/api/funds/transactions` | Create receipt + auto-post JE `FUND-*`; recomputes source status |
| PATCH/DELETE | `/api/funds/transactions/:id` | Update / delete (+ status recompute) |

Status rules: `Committed` (received≈0), `Partially_Received`, `Fully_Received` (received≥committed); `Cancelled` is manual and sticky until reactivated.

---

## Cashflow — `/api/cashflow`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/cashflow` | List; query `project_id`, `type`, `from`, `to` |
| POST | `/api/cashflow` | Create transaction |
| PATCH | `/api/cashflow/:id` | Update |
| DELETE | `/api/cashflow/:id` | Delete |
| GET | `/api/cashflow/summary` | Period summary |
| GET | `/api/cashflow/dashboard` | Dashboard stats |

Static paths `summary` / `dashboard` should be registered before `:id` — verify order if those return 404/cast errors.

---

## Sales — `/api/sales`

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/sales/customers` | List / create |
| PATCH/DELETE | `/api/sales/customers/:id` | Update / delete |
| GET | `/api/sales/units` | List; query `project_id`, `status` |
| POST | `/api/sales/units` | Create unit |
| PATCH/DELETE | `/api/sales/units/:id` | Update / delete |
| GET | `/api/sales/list` | List sales; query project/customer |
| GET | `/api/sales/list/:id` | One sale |
| POST | `/api/sales/list` | Create sale (**also** posts JE `SALE-{id}`: Dr 1100 AR / Cr 4000 Revenue) |
| PATCH/DELETE | `/api/sales/list/:id` | Update / delete |
| GET | `/api/sales/installments` | List; query `sale_id`, `status` |
| POST | `/api/sales/installments/:id/pay` | Record payment (**also** posts JE `PMT-{id}`: Dr 1000 / Cr 1100) |

---

## Accounting — `/api/accounting`

**Auth:** All **POST** and **PATCH** below require Bearer JWT and role `Admin`, `Owner / Director`, or `Accountant`. **GET**s are open.

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/accounting/accounts` | COA list / create |
| PATCH | `/api/accounting/accounts/:id` | Update account |
| GET | `/api/accounting/journal` | List JEs; query `project_id` |
| GET | `/api/accounting/journal/:id` | One JE + lines |
| POST | `/api/accounting/journal` | Create draft (balanced lines) |
| POST | `/api/accounting/journal/:id/post` | Draft → Posted |
| DELETE | `/api/accounting/journal/:id` | Delete JE + lines |
| POST | `/api/accounting/journal/purge-orphans` | Remove auto JEs whose source row is gone |
| GET | `/api/accounting/reports/trial-balance` | Query `from`, `to` |
| GET | `/api/accounting/reports/general-ledger` | Query `account_id`, `from`, `to` |
| GET | `/api/accounting/reports/balance-sheet` | Query `as_of` |
| GET/POST | `/api/accounting/bank-accounts` | List / create |
| PATCH | `/api/accounting/bank-accounts/:id` | Update |
| GET/POST | `/api/accounting/bank-accounts/:id/statements` | List / bulk create statement lines |
| PATCH | `/api/accounting/statement-lines/:id/match` | Match line to cash/JE |
| GET | `/api/accounting/reconciliations` | Query `bank_account_id` |
| POST | `/api/accounting/reconciliations` | Open period |
| POST | `/api/accounting/reconciliations/:id/complete` | Complete recon |

Operational auto-journals (expenses/sales/funds) use refs `EXP-*`, `SALE-*`, `PMT-*`, `FUND-*`. Deleting the source row now deletes the matching JE(s).

---

## Reports — `/api/reports`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/reports/budget-vs-actual` | Query `project_id` |
| GET | `/api/reports/stage-budget/:project_id` | Stage budget vs actual |
| GET | `/api/reports/profitability` | Query `project_id` |
| GET | `/api/reports/profit-loss` | Query `from`, `to` |
| GET | `/api/reports/supplier-payables` | Payables |
| GET | `/api/reports/receivables` | Aging |
| GET | `/api/reports/labour-cost` | Query `project_id` |
| GET | `/api/reports/cashflow` | Query `period` (`daily`\|`weekly`\|`monthly`), `from`, `to` |
| GET | `/api/reports/expenses` | Breakdown; query `project_id` |

---

## Health — `/api`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/ping` | Liveness |
| GET | `/api/health` | DB connectivity check |

Also: `GET /` on root `AppController` (Nest hello).

---

## Settings — `/api/settings`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/settings/reset` | Destructive truncate. Body: `{ mode: 'transactions' \| 'full', confirm: 'RESET' }` |

Use only in local/demo. Does not wipe users / material catalog on full reset (per controller message).

---

## Related

- [Architecture.md](Architecture.md) — request flow  
- [Database.md](Database.md) — tables behind these routes  
- [Decisions.md](Decisions.md) — Nest is the only active API  
