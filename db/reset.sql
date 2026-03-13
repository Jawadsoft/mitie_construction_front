-- Construction ERP - Reset Schema
-- Run this once to drop all tables so TypeORM can recreate them cleanly.
-- WARNING: This will DELETE all data. Only run on fresh/dev setups.
--
-- Usage in MySQL shell:
--   mysql -u root construction_erp < d:/mitieconstructios/db/reset.sql
-- OR in MySQL shell:
--   USE construction_erp;
--   SOURCE d:/mitieconstructios/db/reset.sql;

USE construction_erp;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS journal_entry_lines;
DROP TABLE IF EXISTS journal_entries;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS sale_installments;
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS property_units;
DROP TABLE IF EXISTS properties;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS fund_transactions;
DROP TABLE IF EXISTS fund_sources;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS cash_transactions;
DROP TABLE IF EXISTS material_receipts;
DROP TABLE IF EXISTS purchase_order_items;
DROP TABLE IF EXISTS po_items;
DROP TABLE IF EXISTS purchase_orders;
DROP TABLE IF EXISTS labour_payments;
DROP TABLE IF EXISTS labour_attendance;
DROP TABLE IF EXISTS labour_contractors;
DROP TABLE IF EXISTS stage_progress;
DROP TABLE IF EXISTS stage_budgets;
DROP TABLE IF EXISTS project_stages;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'All tables dropped. Start the backend server - TypeORM will recreate them automatically.' AS message;
