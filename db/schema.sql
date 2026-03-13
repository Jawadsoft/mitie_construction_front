-- Construction ERP Database Schema
-- Database: construction_erp
-- MySQL user: root, no password (local)

CREATE DATABASE IF NOT EXISTS construction_erp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE construction_erp;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------
-- 1. User Management
-- -----------------------------------------------------

CREATE TABLE roles (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(50) NOT NULL UNIQUE,
  description   VARCHAR(255) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE permissions (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code          VARCHAR(100) NOT NULL UNIQUE,
  name          VARCHAR(100) NOT NULL,
  description   VARCHAR(255) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE role_permissions (
  role_id       BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role
    FOREIGN KEY (role_id) REFERENCES roles(id),
  CONSTRAINT fk_role_permissions_permission
    FOREIGN KEY (permission_id) REFERENCES permissions(id)
) ENGINE=InnoDB;

CREATE TABLE users (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  email           VARCHAR(150) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  role_id         BIGINT UNSIGNED NOT NULL,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at   DATETIME NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role
    FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB;

CREATE TABLE activity_logs (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT UNSIGNED NULL,
  entity_type   VARCHAR(100) NULL,
  entity_id     BIGINT UNSIGNED NULL,
  action        VARCHAR(100) NOT NULL,
  description   TEXT NULL,
  ip_address    VARCHAR(45) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_activity_logs_user
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 2. Projects & Stages
-- -----------------------------------------------------

CREATE TABLE projects (
  id                       BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name                     VARCHAR(150) NOT NULL,
  location                 VARCHAR(255) NULL,
  plot_size                VARCHAR(100) NULL,
  start_date               DATE NULL,
  expected_completion_date DATE NULL,
  project_type             VARCHAR(100) NULL,
  total_estimated_budget   DECIMAL(18,2) NULL,
  status                   VARCHAR(50) NOT NULL DEFAULT 'Planning',
  created_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE project_stages (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id         BIGINT UNSIGNED NOT NULL,
  name               VARCHAR(100) NOT NULL,
  description        VARCHAR(255) NULL,
  sequence_order     INT NOT NULL DEFAULT 0,
  start_date         DATE NULL,
  end_date           DATE NULL,
  completion_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  status             VARCHAR(50) NOT NULL DEFAULT 'Planned',
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_project_stages_project
    FOREIGN KEY (project_id) REFERENCES projects(id)
) ENGINE=InnoDB;

CREATE TABLE stage_budgets (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_stage_id   BIGINT UNSIGNED NOT NULL,
  labour_budget      DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  material_budget    DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  equipment_budget   DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  other_budget       DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  total_budget       DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_stage_budgets_stage
    FOREIGN KEY (project_stage_id) REFERENCES project_stages(id)
) ENGINE=InnoDB;

CREATE TABLE stage_progress (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_stage_id   BIGINT UNSIGNED NOT NULL,
  report_date        DATE NOT NULL,
  completion_percent DECIMAL(5,2) NOT NULL,
  notes              TEXT NULL,
  has_delay          TINYINT(1) NOT NULL DEFAULT 0,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stage_progress_stage
    FOREIGN KEY (project_stage_id) REFERENCES project_stages(id)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 3. Suppliers & Procurement
-- -----------------------------------------------------

CREATE TABLE suppliers (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(150) NOT NULL,
  contact_name   VARCHAR(100) NULL,
  phone          VARCHAR(50) NULL,
  email          VARCHAR(150) NULL,
  category       VARCHAR(100) NULL,
  payment_terms  VARCHAR(255) NULL,
  address        VARCHAR(255) NULL,
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE purchase_orders (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id           BIGINT UNSIGNED NOT NULL,
  supplier_id          BIGINT UNSIGNED NOT NULL,
  order_date           DATE NOT NULL,
  expected_delivery    DATE NULL,
  status               VARCHAR(50) NOT NULL DEFAULT 'Draft',
  total_amount         DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  tax_amount           DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  notes                TEXT NULL,
  created_by_user_id   BIGINT UNSIGNED NULL,
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_purchase_orders_project
    FOREIGN KEY (project_id) REFERENCES projects(id),
  CONSTRAINT fk_purchase_orders_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  CONSTRAINT fk_purchase_orders_user
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE purchase_order_items (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  purchase_order_id  BIGINT UNSIGNED NOT NULL,
  project_stage_id   BIGINT UNSIGNED NULL,
  item_name          VARCHAR(150) NOT NULL,
  description        VARCHAR(255) NULL,
  unit               VARCHAR(50) NULL,
  quantity           DECIMAL(18,3) NOT NULL DEFAULT 0.000,
  unit_price         DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  total_price        DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_po_items_po
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
  CONSTRAINT fk_po_items_stage
    FOREIGN KEY (project_stage_id) REFERENCES project_stages(id)
) ENGINE=InnoDB;

CREATE TABLE material_receipts (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  purchase_order_id    BIGINT UNSIGNED NOT NULL,
  receipt_date         DATE NOT NULL,
  received_by_user_id  BIGINT UNSIGNED NULL,
  status               VARCHAR(50) NOT NULL DEFAULT 'Received',
  notes                TEXT NULL,
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_material_receipts_po
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
  CONSTRAINT fk_material_receipts_user
    FOREIGN KEY (received_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 4. Labour / Contractor Management
-- -----------------------------------------------------

CREATE TABLE labour_contractors (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(150) NOT NULL,
  contractor_type VARCHAR(100) NULL,
  phone          VARCHAR(50) NULL,
  email          VARCHAR(150) NULL,
  daily_rate     DECIMAL(18,2) NULL,
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE labour_attendance (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contractor_id      BIGINT UNSIGNED NOT NULL,
  project_id         BIGINT UNSIGNED NOT NULL,
  project_stage_id   BIGINT UNSIGNED NULL,
  attendance_date    DATE NOT NULL,
  present_days       DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  notes              VARCHAR(255) NULL,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_labour_attendance_contractor
    FOREIGN KEY (contractor_id) REFERENCES labour_contractors(id),
  CONSTRAINT fk_labour_attendance_project
    FOREIGN KEY (project_id) REFERENCES projects(id),
  CONSTRAINT fk_labour_attendance_stage
    FOREIGN KEY (project_stage_id) REFERENCES project_stages(id)
) ENGINE=InnoDB;

CREATE TABLE labour_payments (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contractor_id      BIGINT UNSIGNED NOT NULL,
  project_id         BIGINT UNSIGNED NOT NULL,
  project_stage_id   BIGINT UNSIGNED NULL,
  payment_date       DATE NOT NULL,
  amount             DECIMAL(18,2) NOT NULL,
  payment_method     VARCHAR(50) NOT NULL,
  reference_no       VARCHAR(100) NULL,
  notes              VARCHAR(255) NULL,
  cash_transaction_id BIGINT UNSIGNED NULL,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_labour_payments_contractor
    FOREIGN KEY (contractor_id) REFERENCES labour_contractors(id),
  CONSTRAINT fk_labour_payments_project
    FOREIGN KEY (project_id) REFERENCES projects(id),
  CONSTRAINT fk_labour_payments_stage
    FOREIGN KEY (project_stage_id) REFERENCES project_stages(id)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 5. Expenses & Cashflow / Funds
-- -----------------------------------------------------

CREATE TABLE cash_transactions (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  transaction_date   DATE NOT NULL,
  type               ENUM('IN', 'OUT') NOT NULL,
  amount             DECIMAL(18,2) NOT NULL,
  method             VARCHAR(50) NOT NULL,
  reference_no       VARCHAR(100) NULL,
  description        VARCHAR(255) NULL,
  project_id         BIGINT UNSIGNED NULL,
  project_stage_id   BIGINT UNSIGNED NULL,
  related_entity_type VARCHAR(100) NULL,
  related_entity_id  BIGINT UNSIGNED NULL,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cash_transactions_project
    FOREIGN KEY (project_id) REFERENCES projects(id),
  CONSTRAINT fk_cash_transactions_stage
    FOREIGN KEY (project_stage_id) REFERENCES project_stages(id)
) ENGINE=InnoDB;

CREATE TABLE expenses (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id         BIGINT UNSIGNED NOT NULL,
  project_stage_id   BIGINT UNSIGNED NOT NULL,
  category           VARCHAR(100) NOT NULL,
  vendor_type        ENUM('SUPPLIER', 'LABOUR', 'OTHER') NOT NULL,
  supplier_id        BIGINT UNSIGNED NULL,
  contractor_id      BIGINT UNSIGNED NULL,
  payment_type       VARCHAR(50) NOT NULL,
  expense_date       DATE NOT NULL,
  amount             DECIMAL(18,2) NOT NULL,
  description        VARCHAR(255) NULL,
  cash_transaction_id BIGINT UNSIGNED NULL,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_expenses_project
    FOREIGN KEY (project_id) REFERENCES projects(id),
  CONSTRAINT fk_expenses_stage
    FOREIGN KEY (project_stage_id) REFERENCES project_stages(id),
  CONSTRAINT fk_expenses_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  CONSTRAINT fk_expenses_contractor
    FOREIGN KEY (contractor_id) REFERENCES labour_contractors(id),
  CONSTRAINT fk_expenses_cash_transaction
    FOREIGN KEY (cash_transaction_id) REFERENCES cash_transactions(id)
) ENGINE=InnoDB;

CREATE TABLE fund_sources (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(150) NOT NULL,
  source_type    ENUM('OWNER', 'INVESTOR', 'LOAN', 'PARTNER') NOT NULL,
  contact_name   VARCHAR(100) NULL,
  phone          VARCHAR(50) NULL,
  email          VARCHAR(150) NULL,
  notes          VARCHAR(255) NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE fund_transactions (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fund_source_id     BIGINT UNSIGNED NOT NULL,
  project_id         BIGINT UNSIGNED NULL,
  transaction_date   DATE NOT NULL,
  type               ENUM('IN', 'OUT') NOT NULL,
  amount             DECIMAL(18,2) NOT NULL,
  description        VARCHAR(255) NULL,
  cash_transaction_id BIGINT UNSIGNED NULL,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_fund_transactions_source
    FOREIGN KEY (fund_source_id) REFERENCES fund_sources(id),
  CONSTRAINT fk_fund_transactions_project
    FOREIGN KEY (project_id) REFERENCES projects(id),
  CONSTRAINT fk_fund_transactions_cash
    FOREIGN KEY (cash_transaction_id) REFERENCES cash_transactions(id)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 6. Properties, Customers, Sales
-- -----------------------------------------------------

CREATE TABLE customers (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(150) NOT NULL,
  phone          VARCHAR(50) NULL,
  email          VARCHAR(150) NULL,
  address        VARCHAR(255) NULL,
  national_id    VARCHAR(100) NULL,
  notes          VARCHAR(255) NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE properties (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id     BIGINT UNSIGNED NOT NULL,
  name           VARCHAR(150) NOT NULL,
  address        VARCHAR(255) NULL,
  property_type  VARCHAR(100) NULL,
  description    VARCHAR(255) NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_properties_project
    FOREIGN KEY (project_id) REFERENCES projects(id)
) ENGINE=InnoDB;

CREATE TABLE property_units (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id    BIGINT UNSIGNED NOT NULL,
  unit_number    VARCHAR(100) NOT NULL,
  area           DECIMAL(18,2) NULL,
  sale_price     DECIMAL(18,2) NOT NULL,
  status         ENUM('AVAILABLE', 'RESERVED', 'SOLD') NOT NULL DEFAULT 'AVAILABLE',
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_property_units_property
    FOREIGN KEY (property_id) REFERENCES properties(id)
) ENGINE=InnoDB;

CREATE TABLE sales (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_unit_id   BIGINT UNSIGNED NOT NULL,
  customer_id        BIGINT UNSIGNED NOT NULL,
  project_id         BIGINT UNSIGNED NOT NULL,
  sale_date          DATE NOT NULL,
  total_price        DECIMAL(18,2) NOT NULL,
  token_amount       DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  discount_amount    DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  status             VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sales_unit
    FOREIGN KEY (property_unit_id) REFERENCES property_units(id),
  CONSTRAINT fk_sales_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_sales_project
    FOREIGN KEY (project_id) REFERENCES projects(id)
) ENGINE=InnoDB;

CREATE TABLE sale_installments (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sale_id            BIGINT UNSIGNED NOT NULL,
  due_date           DATE NOT NULL,
  amount             DECIMAL(18,2) NOT NULL,
  paid_amount        DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  paid_date          DATE NULL,
  status             VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  cash_transaction_id BIGINT UNSIGNED NULL,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sale_installments_sale
    FOREIGN KEY (sale_id) REFERENCES sales(id),
  CONSTRAINT fk_sale_installments_cash
    FOREIGN KEY (cash_transaction_id) REFERENCES cash_transactions(id)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 7. Accounting
-- -----------------------------------------------------

CREATE TABLE accounts (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code             VARCHAR(50) NOT NULL UNIQUE,
  name             VARCHAR(150) NOT NULL,
  account_type     VARCHAR(50) NOT NULL,
  parent_account_id BIGINT UNSIGNED NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_accounts_parent
    FOREIGN KEY (parent_account_id) REFERENCES accounts(id)
) ENGINE=InnoDB;

CREATE TABLE journal_entries (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  entry_date     DATE NOT NULL,
  description    VARCHAR(255) NULL,
  reference_no   VARCHAR(100) NULL,
  project_id     BIGINT UNSIGNED NULL,
  created_by_user_id BIGINT UNSIGNED NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_journal_entries_project
    FOREIGN KEY (project_id) REFERENCES projects(id),
  CONSTRAINT fk_journal_entries_user
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE journal_entry_lines (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  journal_entry_id   BIGINT UNSIGNED NOT NULL,
  account_id         BIGINT UNSIGNED NOT NULL,
  debit              DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  credit             DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_journal_entry_lines_entry
    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id),
  CONSTRAINT fk_journal_entry_lines_account
    FOREIGN KEY (account_id) REFERENCES accounts(id)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 8. Documents
-- -----------------------------------------------------

CREATE TABLE documents (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id       BIGINT UNSIGNED NULL,
  project_stage_id BIGINT UNSIGNED NULL,
  supplier_id      BIGINT UNSIGNED NULL,
  sale_id          BIGINT UNSIGNED NULL,
  document_type    VARCHAR(100) NOT NULL,
  file_name        VARCHAR(255) NOT NULL,
  file_path        VARCHAR(500) NOT NULL,
  uploaded_by_user_id BIGINT UNSIGNED NULL,
  uploaded_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_documents_project
    FOREIGN KEY (project_id) REFERENCES projects(id),
  CONSTRAINT fk_documents_stage
    FOREIGN KEY (project_stage_id) REFERENCES project_stages(id),
  CONSTRAINT fk_documents_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  CONSTRAINT fk_documents_sale
    FOREIGN KEY (sale_id) REFERENCES sales(id),
  CONSTRAINT fk_documents_user
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

