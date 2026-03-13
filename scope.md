# Construction ERP System
## Project Scope Document

### Technology Stack

- **Frontend:** React.js  
- **Backend:** Node.js (Express / NestJS recommended)  
- **Database:** MySQL  
- **Authentication:** JWT  
- **Deployment:** Cloud / VPS

---

# 1. Overview

This ERP system is designed for a **construction-to-sale property business** where the entire lifecycle of a project is managed from:

**Land Purchase → Construction Stages → Supplier & Labour Payments → Cashflow → Property Sales → Profit Calculation**

The system will allow the business owner to monitor:

- Project progress
- Stage-wise construction
- Cost tracking
- Supplier payments
- Labour payments
- Cashflow
- Fund utilization
- Property sales
- Profitability

---

# 2. Core Modules

## 2.1 User Management

User management controls system access and permissions.

### Features

- User creation
- Role assignment
- Permission management
- Password management
- Activity tracking
- Account status control

### User Roles

- Admin
- Owner / Director
- Project Manager
- Site Engineer
- Procurement Officer
- Accountant
- Sales Manager
- Store Keeper
- Supervisor

### Functionalities

- Create / edit users
- Assign roles
- Role-based access control (RBAC)
- Login authentication
- Password reset
- Account activation / deactivation
- Activity logs

---

# 3. Project Management

Manage all construction projects.

### Features

- Create project
- Edit project
- Project overview dashboard
- Track project status

### Fields

- Project Name
- Location
- Plot Size
- Start Date
- Expected Completion
- Project Type
- Total Estimated Budget
- Project Status

### Status Types

- Planning
- Active
- On Hold
- Completed
- Sold

---

# 4. Construction Stage Management

Tracks the progress of construction work.

### Example Stages

- Land Purchase
- Design & Approvals
- Excavation
- Foundation
- Structure / Grey Work
- Masonry
- Plumbing
- Electrical
- Plaster
- Flooring
- Paint
- Fixtures & Finishing
- External Works
- Final Inspection
- Ready for Sale

### Stage Features

- Stage budget
- Actual cost
- Start date
- End date
- Completion percentage
- Stage notes
- Delay reporting

### Cost Tracking

Each stage should track:

- Labour cost
- Material cost
- Equipment cost
- Other expenses

---

# 5. BOQ / Cost Estimation

Bill of Quantities for project budgeting.

### Features

- Stage-wise cost estimation
- Material estimates
- Labour estimates
- Equipment estimates
- Overhead estimation
- Contingency budget

### Reporting

- Estimated vs actual cost comparison

---

# 6. Procurement / Supplier Management

Manage suppliers and material purchases.

### Features

- Supplier database
- Purchase requests
- Purchase orders
- Material receiving
- Supplier invoices
- Payment tracking

### Supplier Details

- Supplier name
- Contact details
- Category
- Payment terms
- Ledger history

---

# 7. Labour / Contractor Management

Manage labour teams and subcontractors.

### Features

- Labour database
- Contractor management
- Attendance tracking
- Wage calculation
- Labour allocation to projects
- Advance payments
- Labour payment records

### Labour Reports

- Labour cost by stage
- Labour cost by project

---

# 8. Expense Management

Track miscellaneous project expenses.

### Expense Types

- Transport
- Fuel
- Equipment rent
- Utilities
- Security
- Government fees
- Site admin expenses

### Features

- Expense entry
- Expense category
- Project allocation
- Stage allocation
- Receipt upload

---

# 9. Cashflow Management

Monitor inflow and outflow of money.

### Features

- Incoming funds
- Outgoing payments
- Cash vs bank tracking
- Daily cash balance
- Payment schedules
- Cashflow forecasting

### Reports

- Daily cashflow
- Weekly cashflow
- Monthly cashflow

---

# 10. Fund Management

Track funding sources.

### Fund Sources

- Owner investment
- Investor contributions
- Loans
- Partner capital

### Features

- Fund entry
- Fund utilization
- Investment tracking
- Profit share calculation

---

# 11. Property / Unit Management

Track properties available for sale.

### Features

- Property inventory
- Unit details
- Availability tracking
- Pricing management

### Fields

- Unit number
- Property type
- Area
- Sale price
- Status

### Status Types

- Available
- Reserved
- Sold

---

# 12. Sales Management

Manage property sales.

### Features

- Customer database
- Booking management
- Token payments
- Installment plans
- Sale agreements
- Payment tracking

### Sales Reports

- Units sold
- Pending payments
- Customer receivables

---

# 13. Finance / Accounting

Handles financial records.

### Features

- Chart of accounts
- Receipts
- Payments
- Journal entries
- Bank accounts
- Petty cash management

### Financial Reports

- Profit & Loss
- Balance Sheet
- Cashflow statement
- Project profitability

---

# 14. Profit Calculation

Profit must be calculated automatically.

### Formula


Profit = Revenue from Sale
- Land Cost
- Construction Cost
- Labour Cost
- Supplier Payments
- Overhead Costs
- Financing Costs


### Profit Reports

- Profit per project
- Profit per stage
- Profit per property unit

---

# 15. Document Management

Store project documents.

### Documents

- Supplier invoices
- Contracts
- Project drawings
- Approvals
- Sale agreements
- Site images

### Features

- File upload
- File categorization
- Document linking with projects

---

# 16. Dashboard & Reporting

Central control dashboard.

### Dashboard Widgets

- Active projects
- Stage completion %
- Budget vs actual cost
- Payables due
- Receivables expected
- Cash balance
- Total investment
- Total expenses
- Expected profit

---

# 17. System Administration

### Features

- Audit logs
- Backup & restore
- System configuration
- Notification management
- Activity monitoring

---

# 18. Database Entities (High Level)
users
roles
permissions
projects
project_stages
stage_budgets
stage_progress
suppliers
purchase_orders
purchase_order_items
material_receipts
labour_contractors
labour_attendance
labour_payments
expenses
fund_sources
fund_transactions
cash_transactions
customers
properties
property_units
sales
sale_installments
accounts
journal_entries
documents
activity_logs


---

# 19. Development Phases

## Phase 1 (MVP)

- User Management
- Project Management
- Construction Stages
- Budget vs Actual Cost
- Supplier Management
- Labour Management
- Expense Tracking
- Cashflow Dashboard

---

## Phase 2

- Procurement workflow
- Inventory management
- Fund management
- Sales module
- Customer receivables

---

## Phase 3

- Full accounting
- Advanced analytics
- Forecasting
- Mobile support
- Approval workflows

---

# 20. Important System Rules

Every cost entry must include:

- Project
- Stage
- Category
- Vendor or labour
- Payment type
- Date

Every payment must update:

- Cash balance
- Payables
- Stage cost
- Project cost

Every sale must update:

- Revenue
- Customer receivable
- Project profit

---

# 21. Key Benefits

The ERP will allow the business to:

- Track project progress in real time
- Control construction costs
- Monitor labour and suppliers
- Maintain accurate cashflow
- Manage investors
- Track property sales
- Calculate profit automatically
