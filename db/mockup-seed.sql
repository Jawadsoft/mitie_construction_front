-- ============================================================
--  Construction ERP – Full Mockup Data Seed
--  3 Projects: Al-Noor Heights (Active), Faisal Plaza (Active),
--              Green Valley Villas (Completed)
-- ============================================================
USE construction_erp;
SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM material_issues;
DELETE FROM stock_ledger;
DELETE FROM material_receipts;
DELETE FROM po_items;
DELETE FROM purchase_orders;
DELETE FROM labour_advances;
DELETE FROM labour_payments;
DELETE FROM labour_attendance;
DELETE FROM labour_contractors;
DELETE FROM expenses;
DELETE FROM cash_transactions;
DELETE FROM fund_transactions;
DELETE FROM fund_sources;
DELETE FROM sale_installments;
DELETE FROM sales;
DELETE FROM property_units;
DELETE FROM customers;
DELETE FROM stage_budgets;
DELETE FROM stage_progress;
DELETE FROM project_stages;
DELETE FROM projects;
DELETE FROM suppliers;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 1. PROJECTS
-- ============================================================
INSERT INTO projects (id, name, location, plot_size, project_type, status,
  total_estimated_budget, start_date, expected_completion_date) VALUES
(1,'Al-Noor Heights (Luxury Apartments)','DHA Phase 6, Lahore','2 Kanal',
  'Residential Apartments','Active',85000000,'2025-03-01','2026-12-31'),
(2,'Faisal Commercial Plaza','Main Boulevard, Gulberg III, Lahore','1 Kanal',
  'Commercial','Active',42000000,'2025-06-01','2026-09-30'),
(3,'Green Valley Villas Phase 1','Bahria Town, Rawalpindi','5 Kanal',
  'Residential Villas','Completed',65000000,'2024-01-01','2025-11-30');

-- ============================================================
-- 2. PROJECT STAGES
-- ============================================================
INSERT INTO project_stages (id,project_id,name,sequence_order,status,
  completion_percent,start_date,end_date,description) VALUES
(1, 1,'Land Development & Levelling',1,'Completed',100,'2025-03-01','2025-03-31','Site clearing and levelling'),
(2, 1,'Foundation & Basement',2,'Completed',100,'2025-04-01','2025-06-30','Pile foundation and basement walls'),
(3, 1,'Ground Floor Structure',3,'Completed',100,'2025-07-01','2025-08-31','Columns beams and slab GF'),
(4, 1,'1st to 3rd Floor Structure',4,'In Progress',65,'2025-09-01','2026-01-31','Structural work floors 1-3'),
(5, 1,'4th to 6th Floor Structure',5,'Planned',0,'2026-02-01','2026-05-31','Structural work floors 4-6'),
(6, 1,'Brick Masonry & Plastering',6,'Planned',0,'2026-04-01','2026-08-31','External and internal brickwork'),
(7, 1,'MEP Works',7,'Planned',0,'2026-06-01','2026-10-31','Mechanical Electrical Plumbing'),
(8, 1,'Finishing & Handover',8,'Planned',0,'2026-09-01','2026-12-31','Tiles paint fixtures and handover'),

(9, 2,'Demolition & Site Preparation',1,'Completed',100,'2025-06-01','2025-06-30','Old structure demolition'),
(10,2,'Foundation Work',2,'Completed',100,'2025-07-01','2025-08-31','Pile caps and foundation'),
(11,2,'Ground + Mezzanine Structure',3,'In Progress',80,'2025-09-01','2025-11-30','RCC frame G+M'),
(12,2,'1st & 2nd Floor Structure',4,'In Progress',30,'2025-11-01','2026-02-28','Floors 1 and 2'),
(13,2,'Facade & Glazing',5,'Planned',0,'2026-03-01','2026-06-30','Glass curtain wall and cladding'),
(14,2,'Interiors & MEP',6,'Planned',0,'2026-04-01','2026-08-31','Fitout and services'),

(15,3,'Land Subdivision & Roads',1,'Completed',100,'2024-01-01','2024-03-31','Plot subdivision and roads'),
(16,3,'Foundation All Villas',2,'Completed',100,'2024-04-01','2024-06-30','Strip foundation 12 villas'),
(17,3,'Structural Work',3,'Completed',100,'2024-07-01','2024-10-31','Complete RCC structure'),
(18,3,'Brick Plaster & Waterproof',4,'Completed',100,'2024-10-01','2025-02-28','Envelope works'),
(19,3,'MEP & Finishing',5,'Completed',100,'2025-01-01','2025-09-30','All MEP and interior finishing'),
(20,3,'Landscaping & Handover',6,'Completed',100,'2025-09-01','2025-11-30','External works and handovers');

-- ============================================================
-- 3. STAGE BUDGETS
-- ============================================================
INSERT INTO stage_budgets (project_stage_id,labour_budget,material_budget,equipment_budget,other_budget) VALUES
(1, 800000,  1200000, 400000, 200000),
(2, 3000000, 6000000, 1500000,500000),
(3, 2500000, 5000000, 800000, 300000),
(4, 3500000, 7000000, 600000, 400000),
(5, 3500000, 7000000, 600000, 400000),
(6, 4000000, 6000000, 200000, 500000),
(7, 3000000, 5000000, 300000, 700000),
(8, 2500000, 4500000, 100000,1200000),
(9,  600000,  400000, 300000, 200000),
(10,1500000, 3000000, 800000, 200000),
(11,2000000, 5000000, 600000, 400000),
(12,2000000, 5000000, 600000, 400000),
(13, 800000, 4500000, 100000, 600000),
(14,1500000, 3500000, 200000, 900000),
(15, 800000, 1000000, 600000, 300000),
(16,2000000, 4000000, 600000, 200000),
(17,6000000,12000000,1200000, 500000),
(18,4000000, 8000000, 200000, 400000),
(19,5000000,10000000, 300000,1000000),
(20, 800000, 1500000, 200000, 500000);

-- ============================================================
-- 4. SUPPLIERS (using correct column: contact_name, category)
-- ============================================================
INSERT INTO suppliers (id,name,contact_name,phone,email,address,category,payment_terms,is_active) VALUES
(1,'Al-Rehman Steel & Iron','Tariq Mahmood','0300-1234567','tariq@alrehmansteel.pk','Steel Market, Shahdara, Lahore','Steel & Iron','Net 30 days',1),
(2,'Punjab Cement Traders','Bilal Hussain','0321-9876543','bilal@punjabcement.pk','GT Road, Gujranwala','Cement & Binding','Cash on Delivery',1),
(3,'Master Tiles & Marble','Salman Sheikh','0333-5551234','sales@mastertiles.pk','Hafeez Centre, Lahore','Finishing','Net 15 days',1),
(4,'City Electrical Supplies','Usman Ali','0345-7778888','usman@cityelectric.pk','Hall Road, Lahore','Electrical','Net 30 days',1),
(5,'Pak Plumbing Mart','Asif Raza','0311-2223333','asif@pakplumbing.pk','Circular Road, Rawalpindi','Plumbing','Net 15 days',1),
(6,'Lahore Sand & Crush','Nadeem Akhtar','0322-4445566',NULL,'Raiwind Road, Lahore','Sand & Aggregate','Cash',1),
(7,'National Bricks Factory','Zubair Ahmed','0301-9998877',NULL,'Sheikhupura Road, Lahore','Bricks & Blocks','Cash on Delivery',1),
(8,'Excel Hardware & Tools','Kamran Butt','0312-3334455','kamran@excelhardware.pk','Anarkali Bazaar, Lahore','Hardware','Net 7 days',1);

-- ============================================================
-- 5. LABOUR CONTRACTORS
-- ============================================================
INSERT INTO labour_contractors (id,name,contractor_type,phone,email,daily_rate,is_active) VALUES
(1, 'Haji Muhammad Nawaz',   'Mason / Bhatti',      '0300-1111111',NULL, 2500,1),
(2, 'Riaz Carpenter Work',   'Carpenter',            '0301-2222222',NULL, 2200,1),
(3, 'Steel Fixers Group',    'Steel Fixer',          '0302-3333333',NULL, 2800,1),
(4, 'Plumbing Services Co.', 'Plumber',              '0303-4444444',NULL, 3000,1),
(5, 'City Electricians',     'Electrician',          '0304-5555555',NULL, 3500,1),
(6, 'Ahmed Labour Cont.',    'General Labour',       '0305-6666666',NULL, 1200,1),
(7, 'Malik Painters',        'Painter',              '0306-7777777',NULL, 2000,1),
(8, 'Shah Tiling Work',      'Tile Fixer',           '0307-8888888',NULL, 2500,1),
(9, 'Khan Waterproofing',    'Waterproofing',        '0308-9999999',NULL, 3200,1),
(10,'Modern Formwork Co.',   'Formwork & Shuttering','0309-0000000',NULL, 4000,1);

-- ============================================================
-- 6. CUSTOMERS
-- ============================================================
INSERT INTO customers (id,name,phone,email,cnic,address) VALUES
(1, 'Mr. Arif Nawaz Khan',       '0300-9991111','arif.khan@gmail.com',    '35201-1234567-1','Gulberg II, Lahore'),
(2, 'Mrs. Sadia Malik',          '0321-8882222','sadia.malik@hotmail.com','35202-2345678-2','Model Town, Lahore'),
(3, 'Mr. Farhan Ahmed Siddiqui', '0333-7773333','farhan@yahoo.com',       '35203-3456789-3','DHA Phase 5, Lahore'),
(4, 'Mr. Imran ul Haq',          '0312-6664444','imran.haq@gmail.com',    '35204-4567890-4','Johar Town, Lahore'),
(5, 'Dr. Asma Shehzad',          '0345-5555555','asma.shehzad@gmail.com', '35205-5678901-5','Cantt, Lahore'),
(6, 'Mr. Tariq Pervez',          '0322-4446666',NULL,                      '35206-6789012-6','Faisalabad'),
(7, 'Zain Enterprises Pvt Ltd',  '0300-3337777','info@zainenterprises.pk','35207-7890123-7','Gulberg, Lahore'),
(8, 'Star Pharma Chain',         '0321-2228888','accounts@starpharma.pk', '35208-8901234-8','Garden Town, Lahore'),
(9, 'Col. (r) Shahid Iqbal',     '0300-1119999','shahid.iqbal@gmail.com', '37201-9012345-9','Islamabad'),
(10,'Mr. Saleem Chaudhry',       '0311-0001111','saleem.ch@hotmail.com',  '38101-0123456-0','Rawalpindi'),
(11,'Mrs. Nadia Pervaiz',        '0322-1112222',NULL,                      '35201-1111222-1','Bahria Town, RWP'),
(12,'Mr. Hassan Raza Mirza',     '0333-2223333','hassan.mirza@gmail.com', '35202-2222333-2','F-7, Islamabad');

-- ============================================================
-- 7. PROPERTY UNITS
-- ============================================================
INSERT INTO property_units (id,project_id,unit_number,unit_type,area_sqft,floor,list_price,status) VALUES
(1, 1,'A-01','2 Bed Apartment',  1050,'Ground', 7500000,'Sold'),
(2, 1,'A-02','3 Bed Apartment',  1450,'Ground',10000000,'Sold'),
(3, 1,'B-01','2 Bed Apartment',  1050,'1st',    7800000,'Sold'),
(4, 1,'B-02','3 Bed Apartment',  1450,'1st',   10500000,'Reserved'),
(5, 1,'C-01','2 Bed Apartment',  1050,'2nd',    8000000,'Available'),
(6, 1,'C-02','3 Bed Apartment',  1450,'2nd',   11000000,'Available'),
(7, 1,'D-01','Penthouse 4 Bed',  2200,'3rd',   18000000,'Reserved'),
(8, 1,'D-02','Penthouse 4 Bed',  2200,'3rd',   18500000,'Available'),
(9, 2,'G-01','Ground Floor Shop', 450,'Ground', 8500000,'Sold'),
(10,2,'G-02','Ground Floor Shop', 550,'Ground',10000000,'Available'),
(11,2,'M-01','Mezzanine Office',  800,'Mezzanine',5500000,'Sold'),
(12,2,'1-01','1st Floor Office',  900,'1st',    4500000,'Available'),
(13,3,'V-01','5 Marla Villa',    1800,'Ground',18000000,'Sold'),
(14,3,'V-02','5 Marla Villa',    1800,'Ground',18000000,'Sold'),
(15,3,'V-03','10 Marla Villa',   2500,'Ground',28000000,'Sold'),
(16,3,'V-04','10 Marla Villa',   2500,'Ground',28500000,'Sold'),
(17,3,'V-05','1 Kanal Villa',    4000,'Ground',55000000,'Sold'),
(18,3,'V-06','1 Kanal Villa',    4000,'Ground',56000000,'Sold');

-- ============================================================
-- 8. SALES
-- ============================================================
INSERT INTO sales (id,property_unit_id,customer_id,sale_date,total_sale_price,total_paid,status) VALUES
(1, 1, 1,'2025-04-15', 7500000, 6500000,'Active'),
(2, 2, 2,'2025-05-10',10000000, 7000000,'Active'),
(3, 3, 3,'2025-06-20', 7800000, 5200000,'Active'),
(4, 4, 4,'2025-07-01',10500000, 3000000,'Active'),
(5, 9, 7,'2025-08-15', 8500000, 8500000,'Completed'),
(6,11, 8,'2025-09-01', 5500000, 3500000,'Active'),
(7, 13,9, '2024-03-01',18000000,18000000,'Completed'),
(8, 14,10,'2024-03-15',18000000,18000000,'Completed'),
(9, 15,11,'2024-04-01',28000000,28000000,'Completed'),
(10,16,12,'2024-04-15',28500000,28500000,'Completed'),
(11,17,9, '2024-05-01',55000000,55000000,'Completed'),
(12,18,10,'2024-05-20',56000000,56000000,'Completed');

-- ============================================================
-- 9. SALE INSTALLMENTS
-- ============================================================
INSERT INTO sale_installments (sale_id,due_date,due_amount,paid_amount,paid_date,status) VALUES
-- Sale 1 - Arif (7.5M, 5 instalments)
(1,'2025-04-15',2000000,2000000,'2025-04-15','Paid'),
(1,'2025-06-30',1500000,1500000,'2025-06-25','Paid'),
(1,'2025-09-30',1500000,1500000,'2025-09-30','Paid'),
(1,'2025-12-31',1500000,1500000,'2025-12-28','Paid'),
(1,'2026-03-31',1000000,0,NULL,'Overdue'),
-- Sale 2 - Sadia (10M, 5 instalments)
(2,'2025-05-10',3000000,3000000,'2025-05-10','Paid'),
(2,'2025-08-31',1500000,1500000,'2025-08-28','Paid'),
(2,'2025-11-30',1500000,1500000,'2025-11-30','Paid'),
(2,'2026-02-28',2000000,1000000,'2026-02-15','Partial'),
(2,'2026-05-31',2000000,0,NULL,'Pending'),
-- Sale 3 - Farhan (7.8M)
(3,'2025-06-20',2000000,2000000,'2025-06-20','Paid'),
(3,'2025-09-30',1500000,1500000,'2025-09-28','Paid'),
(3,'2025-12-31',1500000,1500000,'2025-12-30','Paid'),
(3,'2026-04-30',1400000,0,NULL,'Pending'),
(3,'2026-07-31',1400000,0,NULL,'Pending'),
-- Sale 4 - Imran (10.5M)
(4,'2025-07-01',3000000,3000000,'2025-07-01','Paid'),
(4,'2025-12-31',2500000,0,NULL,'Overdue'),
(4,'2026-06-30',2500000,0,NULL,'Pending'),
(4,'2026-12-31',2500000,0,NULL,'Pending'),
-- Sale 5 - Zain Enterprises (fully paid)
(5,'2025-08-15',4000000,4000000,'2025-08-15','Paid'),
(5,'2025-11-15',2500000,2500000,'2025-11-10','Paid'),
(5,'2026-02-15',2000000,2000000,'2026-02-14','Paid'),
-- Sale 6 - Star Pharma
(6,'2025-09-01',2000000,2000000,'2025-09-01','Paid'),
(6,'2025-12-31',1500000,1500000,'2025-12-30','Paid'),
(6,'2026-03-31',2000000,0,NULL,'Pending'),
-- Sales 7-12 Green Valley (all paid in full, single installment each)
(7, '2024-03-01',18000000,18000000,'2024-03-01','Paid'),
(8, '2024-03-15',18000000,18000000,'2024-03-15','Paid'),
(9, '2024-04-01',28000000,28000000,'2024-04-01','Paid'),
(10,'2024-04-15',28500000,28500000,'2024-04-15','Paid'),
(11,'2024-05-01',55000000,55000000,'2024-05-01','Paid'),
(12,'2024-05-20',56000000,56000000,'2024-05-20','Paid');

-- ============================================================
-- 10. FUND SOURCES (project_id required, source_type ENUM, total_committed required)
-- ============================================================
INSERT INTO fund_sources (id,project_id,source_name,source_type,total_committed,received_so_far,notes) VALUES
(1,1,'Director – Muhammad Arshad', 'EQUITY',    25000000,25000000,'Primary director equity P1'),
(2,1,'HBL Business Finance',       'LOAN',      35000000,35000000,'Secured term loan against DHA plot'),
(3,1,'Silent Partner – Riaz Group','INVESTOR',  10000000,10000000,'Profit-sharing investor 20%'),
(4,2,'Director – Muhammad Arshad', 'EQUITY',    12000000,12000000,'Equity P2'),
(5,2,'NBP Construction Loan',      'LOAN',      25000000,25000000,'Construction finance P2'),
(6,3,'Director – Muhammad Arshad', 'EQUITY',    20000000,20000000,'Equity P3'),
(7,3,'HBL Business Finance',       'LOAN',      45000000,45000000,'Loan P3 Green Valley');

-- ============================================================
-- 11. FUND TRANSACTIONS (fund_source_id only, no project_id col)
-- ============================================================
INSERT INTO fund_transactions (fund_source_id,transaction_date,amount,reference_no,notes) VALUES
(1,'2025-03-01',15000000,'FT-001','Director equity injection tranche 1 P1'),
(1,'2025-05-01',10000000,'FT-002','Director equity tranche 2 P1'),
(2,'2025-05-15',20000000,'FT-003','HBL loan disbursement tranche 1'),
(2,'2025-09-01',15000000,'FT-004','HBL loan disbursement tranche 2'),
(3,'2025-07-01',10000000,'FT-005','Riaz Group investment disbursed'),
(4,'2025-06-01', 8000000,'FT-006','Director equity P2 tranche 1'),
(4,'2025-08-01', 4000000,'FT-007','Director equity P2 tranche 2'),
(5,'2025-07-01',18000000,'FT-008','NBP loan P2 disbursed'),
(5,'2025-10-01', 7000000,'FT-009','NBP loan P2 second draw'),
(6,'2024-01-01',12000000,'FT-010','Director equity P3 tranche 1'),
(6,'2024-06-01', 8000000,'FT-011','Director equity P3 tranche 2'),
(7,'2024-03-01',25000000,'FT-012','HBL loan P3 tranche 1'),
(7,'2024-08-01',20000000,'FT-013','HBL loan P3 tranche 2');

-- ============================================================
-- 12. PURCHASE ORDERS
-- ============================================================
INSERT INTO purchase_orders (id,project_id,supplier_id,order_date,expected_delivery,status,total_amount,notes) VALUES
(1, 1,1,'2025-04-01','2025-04-15','Received',  3500000,'Steel rebar for foundation'),
(2, 1,2,'2025-04-05','2025-04-10','Received',   900000,'1000 bags OPC cement tranche 1'),
(3, 1,6,'2025-04-05','2025-04-08','Received',   480000,'Sand and crush for foundation'),
(4, 1,7,'2025-07-01','2025-07-05','Received',   350000,'Bricks for ground floor'),
(5, 1,2,'2025-07-15','2025-07-20','Received',   810000,'900 bags cement tranche 2'),
(6, 1,1,'2025-09-01','2025-09-10','Received',  2800000,'Steel for floors 1-3 structure'),
(7, 1,2,'2025-10-01','2025-10-05','Pending',    720000,'800 bags cement tranche 3'),
(8, 2,1,'2025-07-01','2025-07-10','Received',  1800000,'Steel foundation and ground floor P2'),
(9, 2,2,'2025-07-10','2025-07-15','Received',   540000,'600 bags cement P2'),
(10,2,6,'2025-07-10','2025-07-12','Received',   240000,'Sand and crush P2'),
(11,2,4,'2025-10-01','2025-10-15','Received',   750000,'Electrical materials ground floor P2'),
(12,3,1,'2024-04-01','2024-04-10','Received',  5500000,'Steel rebar complete order P3'),
(13,3,2,'2024-04-01','2024-04-05','Received',  2700000,'Cement 3000 bags P3'),
(14,3,7,'2024-04-15','2024-04-20','Received',  1200000,'Bricks 100000 nos P3'),
(15,3,3,'2024-10-01','2024-10-15','Received',  3800000,'Tiles and marble all villas'),
(16,3,5,'2024-07-01','2024-07-10','Received',  1200000,'Plumbing materials all villas'),
(17,3,4,'2024-08-01','2024-08-10','Received',  1500000,'Electrical complete package P3');

INSERT INTO po_items (purchase_order_id,material_name,unit,quantity,unit_price,total_price) VALUES
(1,'Steel Rebar 12mm','kg',8000,280,2240000),(1,'Steel Rebar 16mm','kg',4000,280,1120000),(1,'Binding Wire','kg',500,280,140000),
(2,'OPC Cement 50kg','bags',1000,900,900000),
(3,'Fine Sand','cubic ft',2000,85,170000),(3,'Crush 3/4 inch','cubic ft',2000,120,240000),(3,'Bajri','cubic ft',700,100,70000),
(4,'Red Clay Bricks','nos',25000,12,300000),(4,'Concrete Block 6 inch','nos',700,65,45500),
(5,'OPC Cement 50kg','bags',900,900,810000),
(6,'Steel Rebar 10mm','kg',4000,270,1080000),(6,'Steel Rebar 12mm','kg',4000,280,1120000),(6,'Steel Rebar 16mm','kg',2000,280,560000),
(7,'OPC Cement 50kg','bags',800,900,720000),
(8,'Steel Rebar 12mm','kg',4000,280,1120000),(8,'Steel Rebar 16mm','kg',2000,285,570000),(8,'Binding Wire','kg',400,280,112000),
(9,'OPC Cement 50kg','bags',600,900,540000),
(10,'Fine Sand','cubic ft',1000,85,85000),(10,'Crush 3/4 inch','cubic ft',1000,120,120000),(10,'Bajri','cubic ft',300,100,30000),
(11,'Copper Wire 7/44','rft',3000,55,165000),(11,'Conduit Pipe 20mm','rft',2000,18,36000),(11,'MCB Single Pole','nos',80,450,36000),(11,'DB Box 6 way','nos',8,2800,22400),
(12,'Steel Rebar 10mm','kg',8000,265,2120000),(12,'Steel Rebar 12mm','kg',8000,270,2160000),(12,'Binding Wire','kg',1000,280,280000),
(13,'OPC Cement 50kg','bags',3000,900,2700000),
(14,'Red Clay Bricks','nos',80000,12,960000),(14,'Concrete Block 6 inch','nos',3000,65,195000),(14,'Concrete Block 8 inch','nos',500,85,42500),
(15,'Porcelain Tile 24x24','sft',8000,180,1440000),(15,'Ceramic Wall Tile 8x12','sft',4000,95,380000),(15,'Marble Local White','sft',3000,320,960000),
(16,'uPVC Pipe 4 inch','rft',800,220,176000),(16,'CPVC Pipe 0.5 inch','rft',4000,55,220000),(16,'Gate Valve 0.5 inch','nos',120,250,30000),
(17,'Copper Wire 7/44','rft',5000,55,275000),(17,'Copper Wire 3/29','rft',8000,28,224000),(17,'MCB Single Pole','nos',150,450,67500);

INSERT INTO material_receipts (purchase_order_id,receipt_date,status,notes) VALUES
(1,'2025-04-16','Received','Full steel order received OK'),
(2,'2025-04-10','Received','1000 bags cement received'),
(3,'2025-04-08','Received','Sand and crush OK'),
(4,'2025-07-06','Received',NULL),(5,'2025-07-21','Received',NULL),
(6,'2025-09-11','Received','Steel received and checked'),
(8,'2025-07-11','Received',NULL),(9,'2025-07-16','Received',NULL),
(10,'2025-07-13','Received',NULL),(11,'2025-10-16','Received',NULL),
(12,'2024-04-11','Received',NULL),(13,'2024-04-06','Received',NULL),
(14,'2024-04-21','Received',NULL),(15,'2024-10-16','Received',NULL),
(16,'2024-07-11','Received',NULL),(17,'2024-08-11','Received',NULL);

-- ============================================================
-- 13. EXPENSES
-- ============================================================
INSERT INTO expenses (project_id,project_stage_id,category,vendor_type,supplier_id,payment_type,expense_date,amount,description) VALUES
-- Project 1
(1,1,'Materials','SUPPLIER',2,'Cash','2025-03-15',180000,'Cement for levelling and PCC'),
(1,1,'Materials','SUPPLIER',6,'Cash','2025-03-20',95000,'Sand and bajri site prep'),
(1,1,'Equipment','OTHER',NULL,'Cash','2025-03-10',120000,'JCB excavator rental 10 days'),
(1,2,'Materials','SUPPLIER',1,'Bank Transfer','2025-04-20',3500000,'Steel rebar PO-001'),
(1,2,'Materials','SUPPLIER',2,'Bank Transfer','2025-04-12',900000,'Cement PO-002'),
(1,2,'Materials','SUPPLIER',6,'Cash','2025-04-09',480000,'Sand & crush PO-003'),
(1,2,'Equipment','OTHER',NULL,'Cash','2025-05-01',250000,'Concrete mixer rental 30 days'),
(1,2,'Other','OTHER',NULL,'Cash','2025-05-15',85000,'Formwork timber purchase'),
(1,3,'Materials','SUPPLIER',7,'Cash','2025-07-06',350000,'Bricks PO-004'),
(1,3,'Materials','SUPPLIER',2,'Bank Transfer','2025-07-22',810000,'Cement PO-005'),
(1,3,'Equipment','OTHER',NULL,'Cash','2025-07-01',180000,'Crane rental slab work'),
(1,4,'Materials','SUPPLIER',1,'Bank Transfer','2025-09-12',2800000,'Steel PO-006'),
(1,4,'Other','OTHER',NULL,'Cash','2025-09-20',65000,'Site safety equipment'),
(1,4,'Equipment','OTHER',NULL,'Cash','2025-10-01',220000,'Hoist and scaffolding'),
-- Project 2
(2,9,'Equipment','OTHER',NULL,'Cash','2025-06-05',180000,'Demolition machinery rental'),
(2,9,'Other','OTHER',NULL,'Cash','2025-06-10',45000,'Debris removal charges'),
(2,10,'Materials','SUPPLIER',1,'Bank Transfer','2025-07-12',1800000,'Steel PO-008'),
(2,10,'Materials','SUPPLIER',2,'Cash','2025-07-16',540000,'Cement PO-009'),
(2,10,'Materials','SUPPLIER',6,'Cash','2025-07-13',240000,'Sand & crush PO-010'),
(2,11,'Materials','SUPPLIER',4,'Bank Transfer','2025-10-17',750000,'Electrical PO-011'),
(2,11,'Equipment','OTHER',NULL,'Cash','2025-09-15',320000,'Shuttering and props rental'),
-- Project 3
(3,15,'Materials','SUPPLIER',6,'Cash','2024-01-15',420000,'Excavation fill murram'),
(3,15,'Equipment','OTHER',NULL,'Cash','2024-01-10',280000,'Bulldozer and grader rental'),
(3,16,'Materials','SUPPLIER',1,'Bank Transfer','2024-04-12',5500000,'Steel PO-012'),
(3,16,'Materials','SUPPLIER',2,'Bank Transfer','2024-04-07',2700000,'Cement PO-013'),
(3,17,'Materials','SUPPLIER',7,'Cash','2024-04-22',1200000,'Bricks PO-014'),
(3,17,'Equipment','OTHER',NULL,'Cash','2024-07-01',600000,'Concrete pumps and mixers'),
(3,18,'Other','OTHER',NULL,'Cash','2024-10-05',180000,'Waterproofing chemicals'),
(3,19,'Materials','SUPPLIER',3,'Bank Transfer','2024-10-17',3800000,'Tiles and marble PO-015'),
(3,19,'Materials','SUPPLIER',5,'Bank Transfer','2024-07-12',1200000,'Plumbing PO-016'),
(3,19,'Materials','SUPPLIER',4,'Bank Transfer','2024-08-12',1500000,'Electrical PO-017'),
(3,20,'Other','OTHER',NULL,'Cash','2025-09-15',350000,'Landscaping and boundary wall'),
(3,20,'Other','OTHER',NULL,'Cash','2025-10-01',120000,'Handover documentation and legal');

-- ============================================================
-- 14. LABOUR ATTENDANCE
-- ============================================================
INSERT INTO labour_attendance (contractor_id,project_id,attendance_date,present_days,notes) VALUES
(1,1,'2025-04-30',26,'Mason team April P1'),(3,1,'2025-04-30',26,'Steel fixers April'),(6,1,'2025-04-30',26,'12 labourers April'),(10,1,'2025-04-30',20,'Formwork April'),
(1,1,'2025-05-31',27,'Mason May'),(3,1,'2025-05-31',27,'Steel May'),(6,1,'2025-05-31',27,'Labour May'),(10,1,'2025-05-31',25,'Formwork May'),
(1,1,'2025-06-30',25,'Mason June'),(3,1,'2025-06-30',25,'Steel June'),(6,1,'2025-06-30',25,'Labour June'),
(1,1,'2025-07-31',27,'Mason GF'),(2,1,'2025-07-31',22,'Carpenter shuttering'),(3,1,'2025-07-31',27,'Steel GF'),(6,1,'2025-07-31',27,'Labour GF 15 workers'),
(1,1,'2025-08-31',26,'Mason GF completion'),(2,1,'2025-08-31',24,'Carpenter GF'),(3,1,'2025-08-31',26,'Steel GF done'),
(1,1,'2025-09-30',26,'Mason upper floors'),(2,1,'2025-09-30',26,'Carpenter F1'),(3,1,'2025-09-30',26,'Steel fixers F1'),(6,1,'2025-09-30',26,'Labour 18 workers'),(10,1,'2025-09-30',20,'Formwork upper'),
(1,1,'2025-10-31',27,'Mason Oct'),(3,1,'2025-10-31',27,'Steel Oct'),(6,1,'2025-10-31',27,'Labour Oct'),
(1,2,'2025-07-31',25,'Mason P2'),(3,2,'2025-07-31',25,'Steel P2'),(6,2,'2025-07-31',25,'Labour P2'),
(1,2,'2025-08-31',26,'Mason P2 Aug'),(3,2,'2025-08-31',26,'Steel P2 Aug'),(6,2,'2025-08-31',26,'Labour P2 Aug 12 workers'),
(2,2,'2025-09-30',20,'Carpenter shuttering P2'),(10,2,'2025-09-30',22,'Formwork P2'),
(1,3,'2024-05-31',27,'Mason foundation P3'),(3,3,'2024-05-31',27,'Steel P3'),(6,3,'2024-05-31',27,'Labour 20 workers P3'),
(1,3,'2024-08-31',27,'Mason structure P3'),(3,3,'2024-08-31',27,'Steel structure P3'),(6,3,'2024-08-31',27,'Labour 25 workers structure'),
(7,3,'2025-03-31',26,'Painters P3'),(8,3,'2025-03-31',26,'Tile fixers P3'),
(4,3,'2025-01-31',25,'Plumbers P3'),(5,3,'2025-02-28',24,'Electricians P3'),
(9,3,'2024-11-30',22,'Waterproofing team P3');

-- ============================================================
-- 15. LABOUR PAYMENTS
-- ============================================================
INSERT INTO labour_payments (contractor_id,project_id,payment_date,amount,payment_method,reference_no,notes) VALUES
(1,1,'2025-04-30',325000,'Cash','LP-001','Mason April'),(3,1,'2025-04-30',364000,'Cash','LP-002','Steel April'),(6,1,'2025-04-30',374400,'Cash','LP-003','Labour 12 workers April'),(10,1,'2025-04-30',320000,'Bank Transfer','LP-004','Formwork April'),
(1,1,'2025-05-31',337500,'Cash','LP-005','Mason May'),(3,1,'2025-05-31',378000,'Cash','LP-006','Steel May'),(6,1,'2025-05-31',388800,'Cash','LP-007','Labour May'),(10,1,'2025-05-31',400000,'Bank Transfer','LP-008','Formwork May'),
(1,1,'2025-06-30',312500,'Cash','LP-009','Mason June'),(3,1,'2025-06-30',350000,'Cash','LP-010','Steel June'),(6,1,'2025-06-30',360000,'Cash','LP-011','Labour June'),
(1,1,'2025-07-31',337500,'Cash','LP-012','Mason July'),(2,1,'2025-07-31',290400,'Cash','LP-013','Carpenter July'),(3,1,'2025-07-31',378000,'Cash','LP-014','Steel July'),(6,1,'2025-07-31',583200,'Cash','LP-015','Labour 15 workers July'),
(1,1,'2025-08-31',325000,'Cash','LP-016','Mason Aug'),(2,1,'2025-08-31',316800,'Cash','LP-017','Carpenter Aug'),(3,1,'2025-08-31',364000,'Cash','LP-018','Steel Aug'),
(1,1,'2025-09-30',325000,'Cash','LP-019','Mason Sep'),(2,1,'2025-09-30',343200,'Bank Transfer','LP-020','Carpenter Sep'),(3,1,'2025-09-30',364000,'Cash','LP-021','Steel Sep'),(6,1,'2025-09-30',748800,'Cash','LP-022','Labour 18 workers Sep'),(10,1,'2025-09-30',520000,'Bank Transfer','LP-023','Formwork Sep'),
(1,1,'2025-10-31',337500,'Cash','LP-024','Mason Oct'),(3,1,'2025-10-31',378000,'Cash','LP-025','Steel Oct'),(6,1,'2025-10-31',778320,'Cash','LP-026','Labour Oct'),
(1,2,'2025-07-31',312500,'Cash','LP-030','Mason P2 July'),(3,2,'2025-07-31',350000,'Cash','LP-031','Steel P2 July'),(6,2,'2025-07-31',360000,'Cash','LP-032','Labour P2 July'),
(1,2,'2025-08-31',325000,'Cash','LP-033','Mason P2 Aug'),(3,2,'2025-08-31',364000,'Cash','LP-034','Steel P2 Aug'),(6,2,'2025-08-31',446400,'Cash','LP-035','Labour 12 workers P2'),
(2,2,'2025-09-30',264000,'Cash','LP-036','Carpenter P2 Sep'),(10,2,'2025-09-30',352000,'Bank Transfer','LP-037','Formwork P2 Sep'),
(1,3,'2024-05-31',337500,'Cash','LP-050','Mason foundation P3'),(3,3,'2024-05-31',378000,'Cash','LP-051','Steel P3'),(6,3,'2024-05-31',648000,'Cash','LP-052','Labour 20 workers P3'),
(1,3,'2024-08-31',337500,'Cash','LP-053','Mason structure P3'),(3,3,'2024-08-31',378000,'Cash','LP-054','Steel structure P3'),(6,3,'2024-08-31',810000,'Cash','LP-055','Labour 25 workers P3'),
(7,3,'2025-03-31',520000,'Cash','LP-056','Painters P3'),(8,3,'2025-03-31',650000,'Cash','LP-057','Tile fixers P3'),
(4,3,'2025-01-31',375000,'Cash','LP-058','Plumbers P3'),(5,3,'2025-02-28',840000,'Bank Transfer','LP-059','Electricians P3'),
(9,3,'2024-11-30',352000,'Cash','LP-060','Waterproofing P3');

-- ============================================================
-- 16. LABOUR ADVANCES
-- ============================================================
INSERT INTO labour_advances (contractor_id,project_id,advance_date,amount,recovered_amount,reference_no,notes) VALUES
(1,1,'2025-04-01',50000,50000,'ADV-001','Advance Mason – recovered April'),
(6,1,'2025-05-01',30000,30000,'ADV-002','Advance labour team'),
(3,1,'2025-09-01',80000,40000,'ADV-003','Steel fixers advance – partial recovery'),
(1,2,'2025-07-01',40000,40000,'ADV-004','Mason advance P2'),
(6,3,'2024-05-01',60000,60000,'ADV-005','Labour advance P3 – recovered');

-- ============================================================
-- 17. CASH TRANSACTIONS
-- ============================================================
INSERT INTO cash_transactions (project_id,type,amount,method,reference_no,description,transaction_date) VALUES
-- P1 IN
(1,'IN',15000000,'Bank Transfer','FT-001','Director equity P1 tranche 1','2025-03-01'),
(1,'IN',10000000,'Bank Transfer','FT-002','Director equity P1 tranche 2','2025-05-01'),
(1,'IN',20000000,'Bank Transfer','FT-003','HBL loan tranche 1 P1','2025-05-15'),
(1,'IN',15000000,'Bank Transfer','FT-004','HBL loan tranche 2 P1','2025-09-01'),
(1,'IN',10000000,'Bank Transfer','FT-005','Riaz Group investment P1','2025-07-01'),
(1,'IN', 7500000,'Bank Transfer','SR-001','A-01 Mr. Arif full booking','2025-04-15'),
(1,'IN',10000000,'Bank Transfer','SR-002','A-02 Mrs. Sadia booking','2025-05-10'),
(1,'IN', 7800000,'Bank Transfer','SR-003','B-01 Mr. Farhan booking','2025-06-20'),
(1,'IN', 3000000,'Bank Transfer','SR-004','B-02 Mr. Imran advance','2025-07-01'),
(1,'IN', 1500000,'Bank Transfer','SR-005','A-01 instalment 2','2025-06-25'),
(1,'IN', 1500000,'Bank Transfer','SR-006','A-02 instalment 2','2025-08-28'),
(1,'IN', 1500000,'Bank Transfer','SR-007','A-01 instalment 3','2025-09-30'),
(1,'IN', 1500000,'Bank Transfer','SR-008','A-02 instalment 3','2025-11-30'),
(1,'IN', 1400000,'Bank Transfer','SR-009','B-01 instalment 3','2025-09-28'),
(1,'IN', 1500000,'Bank Transfer','SR-010','A-01 instalment 4','2025-12-28'),
(1,'IN', 1400000,'Bank Transfer','SR-011','B-01 instalment 4','2025-12-30'),
(1,'IN', 1000000,'Bank Transfer','SR-012','A-02 instalment 4 partial','2026-02-15'),
(1,'IN', 2000000,'Bank Transfer','SR-013','G-01 Zain last instalment','2026-02-14'),
-- P1 OUT
(1,'OUT',3500000,'Bank Transfer','PO-001','Steel PO-001 payment','2025-04-20'),
(1,'OUT', 900000,'Bank Transfer','PO-002','Cement PO-002','2025-04-12'),
(1,'OUT', 480000,'Cash','PO-003','Sand & crush PO-003','2025-04-09'),
(1,'OUT', 120000,'Cash','EQ-001','JCB rental','2025-03-10'),
(1,'OUT', 350000,'Cash','PO-004','Bricks PO-004','2025-07-06'),
(1,'OUT', 810000,'Bank Transfer','PO-005','Cement PO-005','2025-07-22'),
(1,'OUT',2800000,'Bank Transfer','PO-006','Steel PO-006','2025-09-12'),
(1,'OUT', 250000,'Cash','EQ-002','Concrete mixer rental','2025-05-01'),
(1,'OUT', 325000,'Cash','LP-001','Mason labour April','2025-04-30'),
(1,'OUT', 364000,'Cash','LP-002','Steel fixers April','2025-04-30'),
(1,'OUT', 374400,'Cash','LP-003','General labour April','2025-04-30'),
(1,'OUT', 337500,'Cash','LP-005','Mason May','2025-05-31'),
(1,'OUT', 325000,'Cash','LP-019','Mason Sep','2025-09-30'),
(1,'OUT', 748800,'Cash','LP-022','Labour 18 workers Sep','2025-09-30'),
-- P2 IN
(2,'IN', 8000000,'Bank Transfer','FT-006','Director equity P2','2025-06-01'),
(2,'IN',18000000,'Bank Transfer','FT-007','NBP loan P2 tranche 1','2025-07-01'),
(2,'IN', 7000000,'Bank Transfer','FT-008','NBP loan P2 tranche 2','2025-10-01'),
(2,'IN', 4000000,'Bank Transfer','FT-009','Director equity P2 tranche 2','2025-08-01'),
(2,'IN', 8500000,'Bank Transfer','SR-020','G-01 Zain Enterprises full','2025-08-15'),
(2,'IN', 2000000,'Bank Transfer','SR-021','M-01 Star Pharma booking','2025-09-01'),
(2,'IN', 2500000,'Bank Transfer','SR-022','G-01 installment 2','2025-11-10'),
(2,'IN', 1500000,'Bank Transfer','SR-023','M-01 installment 2','2025-12-30'),
(2,'IN', 2000000,'Bank Transfer','SR-024','G-01 final payment','2026-02-14'),
-- P2 OUT
(2,'OUT',1800000,'Bank Transfer','PO-008','Steel P2','2025-07-12'),
(2,'OUT', 540000,'Cash','PO-009','Cement P2','2025-07-16'),
(2,'OUT', 750000,'Bank Transfer','PO-011','Electrical P2','2025-10-17'),
(2,'OUT', 312500,'Cash','LP-030','Mason P2 July','2025-07-31'),
(2,'OUT', 350000,'Cash','LP-031','Steel P2 July','2025-07-31'),
-- P3 IN (completed)
(3,'IN',12000000,'Bank Transfer','FT-010','Director equity P3','2024-01-01'),
(3,'IN', 8000000,'Bank Transfer','FT-011','Director equity P3 tranche 2','2024-06-01'),
(3,'IN',25000000,'Bank Transfer','FT-012','HBL loan P3 tranche 1','2024-03-01'),
(3,'IN',20000000,'Bank Transfer','FT-013','HBL loan P3 tranche 2','2024-08-01'),
(3,'IN',18000000,'Bank Transfer','SR-030','V-01 Col. Shahid full payment','2024-03-01'),
(3,'IN',18000000,'Bank Transfer','SR-031','V-02 Mr. Saleem full payment','2024-03-15'),
(3,'IN',28000000,'Bank Transfer','SR-032','V-03 Mrs. Nadia full payment','2024-04-01'),
(3,'IN',28500000,'Bank Transfer','SR-033','V-04 Mr. Hassan full payment','2024-04-15'),
(3,'IN',55000000,'Bank Transfer','SR-034','V-05 Col. Shahid villa 2','2024-05-01'),
(3,'IN',56000000,'Bank Transfer','SR-035','V-06 Mr. Saleem villa 2','2024-05-20'),
-- P3 OUT
(3,'OUT',5500000,'Bank Transfer','PO-012','Steel all villas P3','2024-04-12'),
(3,'OUT',2700000,'Bank Transfer','PO-013','Cement P3','2024-04-07'),
(3,'OUT',1200000,'Cash','PO-014','Bricks P3','2024-04-22'),
(3,'OUT',3800000,'Bank Transfer','PO-015','Tiles & marble P3','2024-10-17'),
(3,'OUT',1200000,'Bank Transfer','PO-016','Plumbing P3','2024-07-12'),
(3,'OUT',1500000,'Bank Transfer','PO-017','Electrical P3','2024-08-12'),
(3,'OUT', 337500,'Cash','LP-050','Mason P3 foundation','2024-05-31'),
(3,'OUT', 378000,'Cash','LP-051','Steel P3 foundation','2024-05-31'),
(3,'OUT', 648000,'Cash','LP-052','Labour 20 workers P3','2024-05-31'),
(3,'OUT', 840000,'Bank Transfer','LP-059','Electricians P3 final','2025-02-28'),
(3,'OUT', 650000,'Cash','LP-057','Tile fixers P3','2025-03-31');

-- ============================================================
-- 18. STOCK LEDGER & MATERIAL ISSUES
-- ============================================================
INSERT INTO stock_ledger (material_id,movement_type,quantity,unit_cost,total_cost,
  project_id,purchase_order_id,movement_date,reference_no,notes)
SELECT m.id,'RECEIPT',1000,900,900000,1,2,'2025-04-10','GRN-PO002','OPC Cement tranche 1'
FROM materials m WHERE m.name='OPC Cement (50kg bag)' LIMIT 1;

INSERT INTO stock_ledger (material_id,movement_type,quantity,unit_cost,total_cost,
  project_id,purchase_order_id,movement_date,reference_no,notes)
SELECT m.id,'RECEIPT',8000,280,2240000,1,1,'2025-04-16','GRN-PO001-12','Steel 12mm foundation'
FROM materials m WHERE m.name='Steel Rebar 12mm' LIMIT 1;

INSERT INTO stock_ledger (material_id,movement_type,quantity,unit_cost,total_cost,
  project_id,purchase_order_id,movement_date,reference_no,notes)
SELECT m.id,'RECEIPT',4000,280,1120000,1,1,'2025-04-16','GRN-PO001-16','Steel 16mm foundation'
FROM materials m WHERE m.name='Steel Rebar 16mm' LIMIT 1;

INSERT INTO stock_ledger (material_id,movement_type,quantity,unit_cost,total_cost,
  project_id,purchase_order_id,movement_date,reference_no,notes)
SELECT m.id,'RECEIPT',2000,85,170000,1,3,'2025-04-08','GRN-PO003-SND','Fine sand'
FROM materials m WHERE m.name='Fine Sand (Ravi)' LIMIT 1;

INSERT INTO stock_ledger (material_id,movement_type,quantity,unit_cost,total_cost,
  project_id,purchase_order_id,movement_date,reference_no,notes)
SELECT m.id,'RECEIPT',2000,120,240000,1,3,'2025-04-08','GRN-PO003-CRH','Crush 3/4 inch'
FROM materials m WHERE m.name='Crush (3/4 inch)' LIMIT 1;

INSERT INTO stock_ledger (material_id,movement_type,quantity,unit_cost,total_cost,
  project_id,purchase_order_id,movement_date,reference_no,notes)
SELECT m.id,'RECEIPT',900,900,810000,1,5,'2025-07-21','GRN-PO005','OPC Cement tranche 2'
FROM materials m WHERE m.name='OPC Cement (50kg bag)' LIMIT 1;

INSERT INTO stock_ledger (material_id,movement_type,quantity,unit_cost,total_cost,
  project_id,purchase_order_id,movement_date,reference_no,notes)
SELECT m.id,'RECEIPT',4000,280,1120000,1,6,'2025-09-11','GRN-PO006','Steel 12mm F1-F3'
FROM materials m WHERE m.name='Steel Rebar 12mm' LIMIT 1;

INSERT INTO stock_ledger (material_id,movement_type,quantity,unit_cost,total_cost,
  project_id,purchase_order_id,movement_date,reference_no,notes)
SELECT m.id,'RECEIPT',4000,280,1120000,2,8,'2025-07-11','GRN-PO008','Steel 12mm P2'
FROM materials m WHERE m.name='Steel Rebar 12mm' LIMIT 1;

INSERT INTO stock_ledger (material_id,movement_type,quantity,unit_cost,total_cost,
  project_id,purchase_order_id,movement_date,reference_no,notes)
SELECT m.id,'RECEIPT',600,900,540000,2,9,'2025-07-16','GRN-PO009','OPC Cement P2'
FROM materials m WHERE m.name='OPC Cement (50kg bag)' LIMIT 1;

-- Issues
INSERT INTO stock_ledger (material_id,movement_type,quantity,unit_cost,total_cost,
  project_id,project_stage_id,movement_date,reference_no,notes)
SELECT m.id,'ISSUE',400,900,360000,1,2,'2025-04-20','MIS-001','Cement foundation PCC'
FROM materials m WHERE m.name='OPC Cement (50kg bag)' LIMIT 1;

INSERT INTO stock_ledger (material_id,movement_type,quantity,unit_cost,total_cost,
  project_id,project_stage_id,movement_date,reference_no,notes)
SELECT m.id,'ISSUE',6000,280,1680000,1,2,'2025-04-25','MIS-002','Steel foundation rebars'
FROM materials m WHERE m.name='Steel Rebar 12mm' LIMIT 1;

INSERT INTO stock_ledger (material_id,movement_type,quantity,unit_cost,total_cost,
  project_id,project_stage_id,movement_date,reference_no,notes)
SELECT m.id,'ISSUE',500,900,450000,1,3,'2025-07-15','MIS-003','Cement ground floor'
FROM materials m WHERE m.name='OPC Cement (50kg bag)' LIMIT 1;

INSERT INTO stock_ledger (material_id,movement_type,quantity,unit_cost,total_cost,
  project_id,project_stage_id,movement_date,reference_no,notes)
SELECT m.id,'ISSUE',3000,280,840000,1,4,'2025-09-20','MIS-004','Steel floors 1-3'
FROM materials m WHERE m.name='Steel Rebar 12mm' LIMIT 1;

INSERT INTO stock_ledger (material_id,movement_type,quantity,unit_cost,total_cost,
  project_id,project_stage_id,movement_date,reference_no,notes)
SELECT m.id,'ISSUE',3000,280,840000,2,10,'2025-07-20','MIS-010','Steel P2 foundation'
FROM materials m WHERE m.name='Steel Rebar 12mm' LIMIT 1;

INSERT INTO material_issues (material_id,project_id,project_stage_id,issue_date,quantity,unit_cost,total_cost,purpose,reference_no)
SELECT m.id,1,2,'2025-04-20',400,900,360000,'Foundation PCC concrete','MIS-001' FROM materials m WHERE m.name='OPC Cement (50kg bag)' LIMIT 1;
INSERT INTO material_issues (material_id,project_id,project_stage_id,issue_date,quantity,unit_cost,total_cost,purpose,reference_no)
SELECT m.id,1,2,'2025-04-25',6000,280,1680000,'Foundation reinforcement bars','MIS-002' FROM materials m WHERE m.name='Steel Rebar 12mm' LIMIT 1;
INSERT INTO material_issues (material_id,project_id,project_stage_id,issue_date,quantity,unit_cost,total_cost,purpose,reference_no)
SELECT m.id,1,3,'2025-07-15',500,900,450000,'Ground floor concrete','MIS-003' FROM materials m WHERE m.name='OPC Cement (50kg bag)' LIMIT 1;
INSERT INTO material_issues (material_id,project_id,project_stage_id,issue_date,quantity,unit_cost,total_cost,purpose,reference_no)
SELECT m.id,1,4,'2025-09-20',3000,280,840000,'Steel fixing floors 1-3','MIS-004' FROM materials m WHERE m.name='Steel Rebar 12mm' LIMIT 1;
INSERT INTO material_issues (material_id,project_id,project_stage_id,issue_date,quantity,unit_cost,total_cost,purpose,reference_no)
SELECT m.id,2,10,'2025-07-20',3000,280,840000,'P2 foundation steel fixing','MIS-010' FROM materials m WHERE m.name='Steel Rebar 12mm' LIMIT 1;

-- ============================================================
-- SUMMARY
-- ============================================================
SELECT 'projects'          AS tbl,COUNT(*) n FROM projects UNION ALL
SELECT 'project_stages',          COUNT(*) FROM project_stages UNION ALL
SELECT 'stage_budgets',           COUNT(*) FROM stage_budgets UNION ALL
SELECT 'suppliers',               COUNT(*) FROM suppliers UNION ALL
SELECT 'labour_contractors',      COUNT(*) FROM labour_contractors UNION ALL
SELECT 'customers',               COUNT(*) FROM customers UNION ALL
SELECT 'property_units',          COUNT(*) FROM property_units UNION ALL
SELECT 'sales',                   COUNT(*) FROM sales UNION ALL
SELECT 'sale_installments',       COUNT(*) FROM sale_installments UNION ALL
SELECT 'purchase_orders',         COUNT(*) FROM purchase_orders UNION ALL
SELECT 'po_items',                COUNT(*) FROM po_items UNION ALL
SELECT 'fund_sources',            COUNT(*) FROM fund_sources UNION ALL
SELECT 'fund_transactions',       COUNT(*) FROM fund_transactions UNION ALL
SELECT 'expenses',                COUNT(*) FROM expenses UNION ALL
SELECT 'labour_attendance',       COUNT(*) FROM labour_attendance UNION ALL
SELECT 'labour_payments',         COUNT(*) FROM labour_payments UNION ALL
SELECT 'labour_advances',         COUNT(*) FROM labour_advances UNION ALL
SELECT 'cash_transactions',       COUNT(*) FROM cash_transactions UNION ALL
SELECT 'stock_ledger',            COUNT(*) FROM stock_ledger UNION ALL
SELECT 'material_issues',         COUNT(*) FROM material_issues;
