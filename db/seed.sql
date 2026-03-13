-- Seed initial Admin role and admin user for Construction ERP
-- Run: mysql -u root construction_erp < db/seed.sql
-- Or in MySQL: USE construction_erp; SOURCE d:/mitieconstructios/db/seed.sql;

USE construction_erp;

-- Insert Admin role
INSERT INTO roles (name, description) VALUES ('Admin', 'System administrator')
ON DUPLICATE KEY UPDATE description = 'System administrator';

-- Insert admin user (password: Admin@123)
-- Uses bcrypt hash generated for 'Admin@123'
SET @role_id = (SELECT id FROM roles WHERE name = 'Admin' LIMIT 1);

INSERT INTO users (name, email, password_hash, role_id, is_active)
VALUES (
  'Administrator',
  'admin@example.com',
  '$2b$10$ZopqVbLK0ANVB4eiBNkFPO37IFEYic2wEPT1vCahRk5eG16jL.KiW',
  @role_id,
  1
)
ON DUPLICATE KEY UPDATE
  password_hash = '$2b$10$ZopqVbLK0ANVB4eiBNkFPO37IFEYic2wEPT1vCahRk5eG16jL.KiW',
  is_active = 1;
