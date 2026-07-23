-- ============================================================
-- Construction ERP – Postgres mock seed
-- Projects + stages + stage budgets (dashboard-friendly)
--
-- Re-runnable: cleanup removes any previous [MOCK] rows first.
-- Load after Nest has created tables (synchronize: true):
--   psql -h localhost -p PORT -U postgres -d construction_erp -f backend/db/seed-mock-projects.pg.sql
-- Or paste into pgAdmin Query Tool on database construction_erp.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Cleanup previous mock data
-- ------------------------------------------------------------
DELETE FROM stage_budgets
WHERE project_stage_id IN (
  SELECT ps.id
  FROM project_stages ps
  INNER JOIN projects p ON p.id = ps.project_id
  WHERE p.name LIKE '[MOCK]%'
);

DELETE FROM stage_progress
WHERE project_stage_id IN (
  SELECT ps.id
  FROM project_stages ps
  INNER JOIN projects p ON p.id = ps.project_id
  WHERE p.name LIKE '[MOCK]%'
);

DELETE FROM project_stages
WHERE project_id IN (
  SELECT id FROM projects WHERE name LIKE '[MOCK]%'
);

DELETE FROM projects
WHERE name LIKE '[MOCK]%';

-- ------------------------------------------------------------
-- 2. Projects (4: Active x2, Completed, Planning)
-- ------------------------------------------------------------
INSERT INTO projects (
  name,
  location,
  plot_size,
  project_type,
  status,
  total_estimated_budget,
  start_date,
  expected_completion_date
) VALUES
(
  '[MOCK] Al-Noor Heights',
  'DHA Phase 6, Lahore',
  '2 Kanal',
  'Residential Apartments',
  'Active',
  85000000,
  '2025-03-01',
  '2026-12-31'
),
(
  '[MOCK] Faisal Commercial Plaza',
  'Main Boulevard, Gulberg III, Lahore',
  '1 Kanal',
  'Commercial',
  'Active',
  42000000,
  '2025-06-01',
  '2026-09-30'
),
(
  '[MOCK] Green Valley Villas',
  'Bahria Town, Rawalpindi',
  '5 Kanal',
  'Residential Villas',
  'Completed',
  65000000,
  '2024-01-01',
  '2025-11-30'
),
(
  '[MOCK] Canal View Residences',
  'Canal Bank Road, Lahore',
  '3 Kanal',
  'Residential',
  'Planning',
  28000000,
  '2026-08-01',
  '2028-03-31'
);

-- ------------------------------------------------------------
-- 3. Project stages (keyed by project name — no hardcoded IDs)
-- ------------------------------------------------------------
INSERT INTO project_stages (
  project_id,
  name,
  sequence_order,
  status,
  completion_percent,
  start_date,
  end_date,
  description
)
SELECT
  p.id,
  s.name,
  s.sequence_order,
  s.status,
  s.completion_percent,
  s.start_date::date,
  s.end_date::date,
  s.description
FROM projects p
INNER JOIN (
  VALUES
    -- Al-Noor Heights (8 stages)
    ('[MOCK] Al-Noor Heights', 'Land Development & Levelling', 1, 'Completed', 100.00, '2025-03-01', '2025-03-31', 'Site clearing and levelling'),
    ('[MOCK] Al-Noor Heights', 'Foundation & Basement', 2, 'Completed', 100.00, '2025-04-01', '2025-06-30', 'Pile foundation and basement walls'),
    ('[MOCK] Al-Noor Heights', 'Ground Floor Structure', 3, 'Completed', 100.00, '2025-07-01', '2025-08-31', 'Columns beams and slab GF'),
    ('[MOCK] Al-Noor Heights', '1st to 3rd Floor Structure', 4, 'In Progress', 65.00, '2025-09-01', '2026-01-31', 'Structural work floors 1-3'),
    ('[MOCK] Al-Noor Heights', '4th to 6th Floor Structure', 5, 'Planned', 0.00, '2026-02-01', '2026-05-31', 'Structural work floors 4-6'),
    ('[MOCK] Al-Noor Heights', 'Brick Masonry & Plastering', 6, 'Planned', 0.00, '2026-04-01', '2026-08-31', 'External and internal brickwork'),
    ('[MOCK] Al-Noor Heights', 'MEP Works', 7, 'Planned', 0.00, '2026-06-01', '2026-10-31', 'Mechanical Electrical Plumbing'),
    ('[MOCK] Al-Noor Heights', 'Finishing & Handover', 8, 'Planned', 0.00, '2026-09-01', '2026-12-31', 'Tiles paint fixtures and handover'),

    -- Faisal Commercial Plaza (6 stages)
    ('[MOCK] Faisal Commercial Plaza', 'Demolition & Site Preparation', 1, 'Completed', 100.00, '2025-06-01', '2025-06-30', 'Old structure demolition'),
    ('[MOCK] Faisal Commercial Plaza', 'Foundation Work', 2, 'Completed', 100.00, '2025-07-01', '2025-08-31', 'Pile caps and foundation'),
    ('[MOCK] Faisal Commercial Plaza', 'Ground + Mezzanine Structure', 3, 'In Progress', 80.00, '2025-09-01', '2025-11-30', 'RCC frame G+M'),
    ('[MOCK] Faisal Commercial Plaza', '1st & 2nd Floor Structure', 4, 'In Progress', 30.00, '2025-11-01', '2026-02-28', 'Floors 1 and 2'),
    ('[MOCK] Faisal Commercial Plaza', 'Facade & Glazing', 5, 'Planned', 0.00, '2026-03-01', '2026-06-30', 'Glass curtain wall and cladding'),
    ('[MOCK] Faisal Commercial Plaza', 'Interiors & MEP', 6, 'Planned', 0.00, '2026-04-01', '2026-08-31', 'Fitout and services'),

    -- Green Valley Villas (6 stages — all completed)
    ('[MOCK] Green Valley Villas', 'Land Subdivision & Roads', 1, 'Completed', 100.00, '2024-01-01', '2024-03-31', 'Plot subdivision and roads'),
    ('[MOCK] Green Valley Villas', 'Foundation All Villas', 2, 'Completed', 100.00, '2024-04-01', '2024-06-30', 'Strip foundation 12 villas'),
    ('[MOCK] Green Valley Villas', 'Structural Work', 3, 'Completed', 100.00, '2024-07-01', '2024-10-31', 'Complete RCC structure'),
    ('[MOCK] Green Valley Villas', 'Brick Plaster & Waterproof', 4, 'Completed', 100.00, '2024-10-01', '2025-02-28', 'Envelope works'),
    ('[MOCK] Green Valley Villas', 'MEP & Finishing', 5, 'Completed', 100.00, '2025-01-01', '2025-09-30', 'All MEP and interior finishing'),
    ('[MOCK] Green Valley Villas', 'Landscaping & Handover', 6, 'Completed', 100.00, '2025-09-01', '2025-11-30', 'External works and handovers'),

    -- Canal View Residences (4 stages — planning)
    ('[MOCK] Canal View Residences', 'Land Purchase & Approvals', 1, 'Planned', 0.00, '2026-08-01', '2026-09-30', 'Title transfer and building approvals'),
    ('[MOCK] Canal View Residences', 'Design & Soil Investigation', 2, 'Planned', 0.00, '2026-09-01', '2026-11-30', 'Architectural design and geotech'),
    ('[MOCK] Canal View Residences', 'Site Mobilization', 3, 'Planned', 0.00, '2026-12-01', '2027-01-15', 'Temporary works and site setup'),
    ('[MOCK] Canal View Residences', 'Foundation (Planned)', 4, 'Planned', 0.00, '2027-01-16', '2027-04-30', 'Foundation package not started')
) AS s(
  project_name,
  name,
  sequence_order,
  status,
  completion_percent,
  start_date,
  end_date,
  description
) ON p.name = s.project_name;

-- ------------------------------------------------------------
-- 4. Stage budgets (total_budget = sum of components)
-- ------------------------------------------------------------
INSERT INTO stage_budgets (
  project_stage_id,
  labour_budget,
  material_budget,
  equipment_budget,
  other_budget,
  total_budget
)
SELECT
  ps.id,
  b.labour_budget,
  b.material_budget,
  b.equipment_budget,
  b.other_budget,
  (b.labour_budget + b.material_budget + b.equipment_budget + b.other_budget)
FROM project_stages ps
INNER JOIN projects p ON p.id = ps.project_id
INNER JOIN (
  VALUES
    -- Al-Noor Heights
    ('[MOCK] Al-Noor Heights', 'Land Development & Levelling', 800000, 1200000, 400000, 200000),
    ('[MOCK] Al-Noor Heights', 'Foundation & Basement', 3000000, 6000000, 1500000, 500000),
    ('[MOCK] Al-Noor Heights', 'Ground Floor Structure', 2500000, 5000000, 800000, 300000),
    ('[MOCK] Al-Noor Heights', '1st to 3rd Floor Structure', 3500000, 7000000, 600000, 400000),
    ('[MOCK] Al-Noor Heights', '4th to 6th Floor Structure', 3500000, 7000000, 600000, 400000),
    ('[MOCK] Al-Noor Heights', 'Brick Masonry & Plastering', 4000000, 6000000, 200000, 500000),
    ('[MOCK] Al-Noor Heights', 'MEP Works', 3000000, 5000000, 300000, 700000),
    ('[MOCK] Al-Noor Heights', 'Finishing & Handover', 2500000, 4500000, 100000, 1200000),

    -- Faisal Commercial Plaza
    ('[MOCK] Faisal Commercial Plaza', 'Demolition & Site Preparation', 600000, 400000, 300000, 200000),
    ('[MOCK] Faisal Commercial Plaza', 'Foundation Work', 1500000, 3000000, 800000, 200000),
    ('[MOCK] Faisal Commercial Plaza', 'Ground + Mezzanine Structure', 2000000, 5000000, 600000, 400000),
    ('[MOCK] Faisal Commercial Plaza', '1st & 2nd Floor Structure', 2000000, 5000000, 600000, 400000),
    ('[MOCK] Faisal Commercial Plaza', 'Facade & Glazing', 800000, 4500000, 100000, 600000),
    ('[MOCK] Faisal Commercial Plaza', 'Interiors & MEP', 1500000, 3500000, 200000, 900000),

    -- Green Valley Villas
    ('[MOCK] Green Valley Villas', 'Land Subdivision & Roads', 800000, 1000000, 600000, 300000),
    ('[MOCK] Green Valley Villas', 'Foundation All Villas', 2000000, 4000000, 600000, 200000),
    ('[MOCK] Green Valley Villas', 'Structural Work', 6000000, 12000000, 1200000, 500000),
    ('[MOCK] Green Valley Villas', 'Brick Plaster & Waterproof', 4000000, 8000000, 200000, 400000),
    ('[MOCK] Green Valley Villas', 'MEP & Finishing', 5000000, 10000000, 300000, 1000000),
    ('[MOCK] Green Valley Villas', 'Landscaping & Handover', 800000, 1500000, 200000, 500000),

    -- Canal View Residences
    ('[MOCK] Canal View Residences', 'Land Purchase & Approvals', 200000, 50000, 0, 1500000),
    ('[MOCK] Canal View Residences', 'Design & Soil Investigation', 800000, 100000, 50000, 400000),
    ('[MOCK] Canal View Residences', 'Site Mobilization', 500000, 300000, 400000, 200000),
    ('[MOCK] Canal View Residences', 'Foundation (Planned)', 1800000, 3500000, 700000, 200000)
) AS b(
  project_name,
  stage_name,
  labour_budget,
  material_budget,
  equipment_budget,
  other_budget
) ON p.name = b.project_name AND ps.name = b.stage_name;

COMMIT;

-- ------------------------------------------------------------
-- 5. Verification summary
-- ------------------------------------------------------------
SELECT
  p.name AS project,
  p.status,
  COUNT(ps.id) AS stage_count,
  COALESCE(SUM(sb.total_budget), 0) AS total_stage_budgets
FROM projects p
LEFT JOIN project_stages ps ON ps.project_id = p.id
LEFT JOIN stage_budgets sb ON sb.project_stage_id = ps.id
WHERE p.name LIKE '[MOCK]%'
GROUP BY p.id, p.name, p.status
ORDER BY p.name;
