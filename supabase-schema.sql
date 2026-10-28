-- ======================================================================
-- FACTORYOPS SUPABASE DATABASE SCHEMA & INITIAL SEED
-- Multi-Factory Industrial Operations & Maintenance Platform
-- Run this script in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ======================================================================

-- 1. CLEANUP (OPTIONAL: UNCOMMENT IF YOU WANT A COMPLETE FRESH RESET)
-- DROP TABLE IF EXISTS data_quality_metrics CASCADE;
-- DROP TABLE IF EXISTS sops CASCADE;
-- DROP TABLE IF EXISTS work_orders CASCADE;
-- DROP TABLE IF EXISTS incidents CASCADE;
-- DROP TABLE IF EXISTS maintenance_records CASCADE;
-- DROP TABLE IF EXISTS production_records CASCADE;
-- DROP TABLE IF EXISTS machines CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TABLE IF EXISTS factories CASCADE;

-- 2. CREATE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. FACTORIES TABLE
CREATE TABLE IF NOT EXISTS factories (
    id TEXT PRIMARY KEY,
    factory_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    industry TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Operational',
    capacity TEXT NOT NULL,
    established_year INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity TEXT
);

-- 4. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    salt TEXT,
    role TEXT NOT NULL,
    factory_id TEXT REFERENCES factories(id) ON DELETE SET NULL,
    factory_name TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. MACHINES TABLE
CREATE TABLE IF NOT EXISTS machines (
    id TEXT PRIMARY KEY,
    factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    machine_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    line TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running',
    health_score NUMERIC(5,2) NOT NULL DEFAULT 85.0,
    temperature_c NUMERIC(5,2) NOT NULL DEFAULT 65.0,
    vibration_mms NUMERIC(5,2) NOT NULL DEFAULT 2.0,
    pressure_bar NUMERIC(5,2) NOT NULL DEFAULT 6.0,
    speed_rpm NUMERIC(7,2) NOT NULL DEFAULT 1200,
    oee NUMERIC(5,2) NOT NULL DEFAULT 85.0,
    operator TEXT NOT NULL,
    install_date DATE,
    last_service_date DATE
);

-- 6. PRODUCTION RECORDS TABLE
CREATE TABLE IF NOT EXISTS production_records (
    id TEXT PRIMARY KEY,
    factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    machine_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    shift TEXT NOT NULL,
    target_units INTEGER NOT NULL,
    actual_units INTEGER NOT NULL,
    defective_units INTEGER NOT NULL DEFAULT 0,
    scrap_kg NUMERIC(8,2) NOT NULL DEFAULT 0.0,
    cycle_time_sec NUMERIC(6,2) NOT NULL DEFAULT 45.0,
    operator TEXT NOT NULL
);

-- 7. MAINTENANCE RECORDS TABLE
CREATE TABLE IF NOT EXISTS maintenance_records (
    id TEXT PRIMARY KEY,
    factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    machine_id TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Scheduled',
    scheduled_date DATE NOT NULL,
    completed_date DATE,
    technician TEXT NOT NULL,
    description TEXT NOT NULL,
    cost_usd NUMERIC(10,2) NOT NULL DEFAULT 0.0,
    downtime_hours NUMERIC(6,2) NOT NULL DEFAULT 0.0
);

-- 8. INCIDENTS TABLE
CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    incident_id TEXT NOT NULL UNIQUE,
    factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    machine_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT NOT NULL DEFAULT 'Medium',
    status TEXT NOT NULL DEFAULT 'Open',
    reported_by TEXT NOT NULL,
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    root_cause TEXT,
    resolution_notes TEXT
);

-- 9. WORK ORDERS TABLE
CREATE TABLE IF NOT EXISTS work_orders (
    id TEXT PRIMARY KEY,
    work_order_id TEXT NOT NULL UNIQUE,
    factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    machine_id TEXT NOT NULL,
    title TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'Medium',
    status TEXT NOT NULL DEFAULT 'Pending',
    assigned_to TEXT NOT NULL,
    due_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    estimated_hours NUMERIC(5,2) NOT NULL DEFAULT 2.0,
    actual_hours NUMERIC(5,2),
    parts_required TEXT
);

-- 10. SOPS (STANDARD OPERATING PROCEDURES) TABLE
CREATE TABLE IF NOT EXISTS sops (
    id TEXT PRIMARY KEY,
    sop_id TEXT NOT NULL UNIQUE,
    factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    machine_type TEXT NOT NULL,
    category TEXT NOT NULL,
    version TEXT NOT NULL,
    last_updated DATE NOT NULL,
    author TEXT NOT NULL,
    steps TEXT[] NOT NULL DEFAULT '{}',
    safety_precautions TEXT[] NOT NULL DEFAULT '{}',
    target_audience TEXT NOT NULL
);

-- 11. DATA QUALITY METRICS TABLE
CREATE TABLE IF NOT EXISTS data_quality_metrics (
    id TEXT PRIMARY KEY,
    factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    sensor_name TEXT NOT NULL,
    machine_id TEXT NOT NULL,
    uptime_percentage NUMERIC(5,2) NOT NULL DEFAULT 99.0,
    data_completeness_pct NUMERIC(5,2) NOT NULL DEFAULT 99.0,
    latency_ms INTEGER NOT NULL DEFAULT 25,
    anomalies_detected INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Healthy',
    last_sync TEXT NOT NULL
);

-- 12. CREATE OPTIMIZED INDEXES
CREATE INDEX IF NOT EXISTS idx_machines_factory ON machines(factory_id);
CREATE INDEX IF NOT EXISTS idx_machines_status ON machines(status);
CREATE INDEX IF NOT EXISTS idx_production_factory ON production_records(factory_id);
CREATE INDEX IF NOT EXISTS idx_production_machine ON production_records(machine_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_factory ON maintenance_records(factory_id);
CREATE INDEX IF NOT EXISTS idx_incidents_factory ON incidents(factory_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_factory ON work_orders(factory_id);
CREATE INDEX IF NOT EXISTS idx_sops_factory ON sops(factory_id);
CREATE INDEX IF NOT EXISTS idx_dq_factory ON data_quality_metrics(factory_id);

-- 13. CONFIGURE ROW LEVEL SECURITY (RLS) FOR API / ANON ACCESS
ALTER TABLE factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_metrics ENABLE ROW LEVEL SECURITY;

-- Allow full access for anon key (all operations)
CREATE POLICY "Public full access to factories" ON factories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to machines" ON machines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to production" ON production_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to maintenance" ON maintenance_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to incidents" ON incidents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to work_orders" ON work_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to sops" ON sops FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to data_quality" ON data_quality_metrics FOR ALL USING (true) WITH CHECK (true);

-- ======================================================================
-- 14. INITIAL SEED DATA
-- ======================================================================

-- Seed Factories
INSERT INTO factories (id, factory_code, name, location, industry, owner_name, status, capacity, established_year, created_at, last_activity)
VALUES ('FAC-001', 'APX-01', 'Apex Precision Manufacturing', 'Hyderabad, Telangana', 'Automotive Components', 'Rajesh Kumar', 'Operational', '45,000 units/mo', 2014, '2023-01-15T08:00:00Z', '10 mins ago')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, status = EXCLUDED.status, last_activity = EXCLUDED.last_activity;
INSERT INTO factories (id, factory_code, name, location, industry, owner_name, status, capacity, established_year, created_at, last_activity)
VALUES ('FAC-002', 'NOV-02', 'Nova Industrial Systems', 'Pune, Maharashtra', 'Engineering Components', 'Vikram Malhotra', 'Operational', '38,000 units/mo', 2017, '2023-03-20T09:30:00Z', '25 mins ago')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, status = EXCLUDED.status, last_activity = EXCLUDED.last_activity;
INSERT INTO factories (id, factory_code, name, location, industry, owner_name, status, capacity, established_year, created_at, last_activity)
VALUES ('FAC-003', 'VTX-03', 'Vertex Auto Components', 'Chennai, Tamil Nadu', 'Automotive', 'Suresh Raman', 'Operational', '52,000 units/mo', 2011, '2023-05-10T10:15:00Z', '5 mins ago')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, status = EXCLUDED.status, last_activity = EXCLUDED.last_activity;
INSERT INTO factories (id, factory_code, name, location, industry, owner_name, status, capacity, established_year, created_at, last_activity)
VALUES ('FAC-004', 'PRM-04', 'PrimeTech Manufacturing', 'Bengaluru, Karnataka', 'Electronics', 'Ananya Sharma', 'Production Slowdown', '80,000 units/mo', 2019, '2023-08-01T11:00:00Z', '1 hour ago')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, status = EXCLUDED.status, last_activity = EXCLUDED.last_activity;
INSERT INTO factories (id, factory_code, name, location, industry, owner_name, status, capacity, established_year, created_at, last_activity)
VALUES ('FAC-005', 'ORN-05', 'Orion Industrial Works', 'Coimbatore, Tamil Nadu', 'Heavy Engineering', 'K. Swaminathan', 'Maintenance Alert', '25,000 units/mo', 2008, '2023-11-12T14:45:00Z', '40 mins ago')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, status = EXCLUDED.status, last_activity = EXCLUDED.last_activity;

-- Seed Users
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-001', 'Super Admin Officer', 'superadmin@factoryops.com', '92eececd779a0fde506ea61607c58131481f15436cb0991ddc110e6d2cca105ef6574f989290213b643bbbe5e3270e95bc7ee7d32cb29ab68b765f2167fb013f', '7311e958b62e1d8579481cc7f83a7b4b', 'SUPER_ADMIN', NULL, NULL, 'active', '2026-10-26T09:15:48.551Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-002', 'Rajesh Kumar (Plant Admin)', 'admin.apex@factoryops.com', 'cbe9e674f4969ff1d0207616aeda9471a9f39645c3d94123a9f3995b3ccb35b28db522cdea895bc5c9acfa0d73d4050c84d4b4b8cf5b4425f849cca72fb3455c', '265effdfab33ca5e191392833848aa7d', 'ADMIN', 'FAC-001', 'Apex Precision Manufacturing', 'active', '2026-10-26T09:15:48.552Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-002L', 'Rajesh Kumar', 'owner.apex@factoryops.com', 'af6702b99d566347c92a80db4a24ff6fe449335287e89a43cc13ade06ed63ace857ed80cef3444881a4a8994190e472bc19c245c9d3ad639bb224079d4deb03d', 'dbbe07d5da0ecf7ea58d5d3b200866ed', 'ADMIN', 'FAC-001', 'Apex Precision Manufacturing', 'active', '2026-10-26T09:15:48.552Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-003', 'Vikram Malhotra (Plant Admin)', 'admin.nova@factoryops.com', '1020e283685b7c5302833b14fe5f094afe1264406f952ebe2a8ca92ee02836b8901b4b78f14d9a3158a28ea9b6316b72e8ef2e64c86853fd1646e2875e125f63', '0d0d1bbc9a9108425e168b7ee87286c5', 'ADMIN', 'FAC-002', 'Nova Industrial Systems', 'active', '2026-10-26T09:15:48.553Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-003L', 'Vikram Malhotra', 'owner.nova@factoryops.com', 'f26e0ee83d877f0fbea8f0860a4004a5e5b26e391e4168ccaa0ec5ba069621b6fba1c2c17afd6493d2a41192bdb29bbb24a206790dd8ec40a080aea82e5a807d', '14d05547a1c1b97c3e57730133059593', 'ADMIN', 'FAC-002', 'Nova Industrial Systems', 'active', '2026-10-26T09:15:48.553Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-004', 'Suresh Raman (Plant Admin)', 'admin.vertex@factoryops.com', '1fff6b310c78ace8f8d257f5ea80d9f308cea5b0060d22af161db07576a5509f91918705de5c492a99c7681a87efc7b4693a794ad8b058f1dff8f0f46c4b5f29', '1ff7ab147a4096afc10cb564438147d9', 'ADMIN', 'FAC-003', 'Vertex Auto Components', 'active', '2026-10-26T09:15:48.553Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-004L', 'Suresh Raman', 'owner.vertex@factoryops.com', 'a6604bc75f183ae46fb38d3cc4319039555f0b7f2d6d070a55c1d7bf64d870fd90f1c067f63b144e976873b33100e97f844565a84e668e86e5c1ab10470d6b36', '53eefa6cacafb95b4a3e60ea197dcef8', 'ADMIN', 'FAC-003', 'Vertex Auto Components', 'active', '2026-10-26T09:15:48.554Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-005', 'Ananya Sharma', 'owner.primetech@factoryops.com', '0e8a844e18dbf0eadb44f56bcd78971b112ab75c9ac6152de72b5b2b658cbd37546deb46b291fe260ec1ed6e48d8b79d93579afc439db0a15fe1d1aedf40ca87', '399b80be21bf43ff7d2811ea9e21b96f', 'ADMIN', 'FAC-004', 'PrimeTech Manufacturing', 'active', '2026-10-26T09:15:48.554Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-006', 'K. Swaminathan', 'owner.orion@factoryops.com', '615e55abbe223f011ab4fef885b7a207ca83c356331414fb476e56f82d05a54f3cad1e3c4c7c0fd4cf2dd15beb3a63b2d0fee60bf82af0f9f6824667def97fdf', '5be1c824db048d6373e6f0a900ca0836', 'ADMIN', 'FAC-005', 'Orion Industrial Works', 'active', '2026-10-26T09:15:48.555Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-007', 'Amit Deshmukh (Manager/Supervisor)', 'manager.apex@factoryops.com', '83a134c7463e7625604ff21784438fc811b190e492ef8f453da2087e9fd39c21ddaf9da7b7dd5d72e323b09b3d2adb8cfd439fdaad6bc7c0f594a0c791e43e8a', '8835043b56e69a45bac65c7b8bdeee5c', 'MANAGER_SUPERVISOR', 'FAC-001', 'Apex Precision Manufacturing', 'active', '2026-10-26T09:15:48.555Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-008', 'Neha Joshi (Manager/Supervisor)', 'manager.nova@factoryops.com', '4a91714f701e37c0b1eec4ee960129c67ae65040dd32c84db4adf4dd789b975f2acfd8a37be4e07adc5870283986e36267dc0f8a8b1b2ffe0f50202f713c9998', 'a310f6e4449d0debee879c5705074acb', 'MANAGER_SUPERVISOR', 'FAC-002', 'Nova Industrial Systems', 'active', '2026-10-26T09:15:48.556Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-009', 'Karthik Raja (Manager/Supervisor)', 'manager.vertex@factoryops.com', '3a69b26bfd3e61e759adc946f9e7845274f9d70434d8d3692eba6452d0f56ca42ae9481f4472978698231202605007277b133c8001f77fef81fc9cda5e3833b4', '74a9ae1e72742fb68c258961e3bfb0f0', 'MANAGER_SUPERVISOR', 'FAC-003', 'Vertex Auto Components', 'active', '2026-10-26T09:15:48.556Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-010', 'Rahul Hegde', 'manager.primetech@factoryops.com', 'b054487b108085712bc566d002cb3737168882386fec061e8f0a8a269946cf6f632e7a2375d97540094f4c789737b722bef6c4437ca49174d86b5380793ddf5d', '707602efe5bd4790907d24c07b69633a', 'MANAGER_SUPERVISOR', 'FAC-004', 'PrimeTech Manufacturing', 'active', '2026-10-26T09:15:48.556Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-011', 'Manoj Pillai', 'manager.orion@factoryops.com', '8d0b032449bf9bdf9e51f7d6a09f17f649014a2179c3728350ef9bd4b56ca5910810b3f94373bee607c8982b74117332139737d0305c07cc4d11fee038f18221', '30ad666ce8d2d8d5d14bf5e6b012fd11', 'MANAGER_SUPERVISOR', 'FAC-005', 'Orion Industrial Works', 'active', '2026-10-26T09:15:48.557Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-012', 'Ramesh Varma (Senior Technician)', 'tech.apex@factoryops.com', 'baaf44bc35d5d3baa5606281f22d8413da286bccb41f9670e36854ac95699c23064489f3f987d6168f86911f7dc9350667aee60c7b82954cc4cfb94e107b6349', 'b9eb4f41a4aa5adc25f00b7c386aeb25', 'TECHNICIAN', 'FAC-001', 'Apex Precision Manufacturing', 'active', '2026-10-26T09:15:48.557Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-013', 'Anil Sharma (Technician)', 'tech.nova@factoryops.com', 'fe85087db85dbf56f4e6cb124e84be8726d27ad34cded70edda994b79589084c76c375be4f25ee53553e31bf113f473645a779066ae23ca7feb6e8eaf9ed3297', 'd2d6feb8b8b673822840f10519b766cb', 'TECHNICIAN', 'FAC-002', 'Nova Industrial Systems', 'active', '2026-10-26T09:15:48.557Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-014', 'Praveen Nair (Technician)', 'tech.vertex@factoryops.com', 'e2d4c9f0d9f0a6cd6702dd46128845bacebba44bef33524ee7145f660f485939a1a74756346156d870c9f01ea31e17aef8f0543b3d87d01b77b4d5f03cc52760', '27ac4268ab28e6bd565ee8aeaae2379a', 'TECHNICIAN', 'FAC-003', 'Vertex Auto Components', 'active', '2026-10-26T09:15:48.558Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-015', 'Priya Sundaram (Production Planner)', 'planner.apex@factoryops.com', '2b920facbced993cff58d488460fb24f5622852a7dbaa3929f3fad4b04bf04c325f5d9bb4256a43131ddbb5fe68bfa3b9d58fb69fe1094442912080e8f2f8fa1', '124a4b5459ecb1d8868cb996a7c67035', 'PRODUCTION_PLANNER', 'FAC-001', 'Apex Precision Manufacturing', 'active', '2026-10-26T09:15:48.558Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-016', 'Siddharth Rao (Production Planner)', 'planner.nova@factoryops.com', '8cfbb0095948d901f91779863409710dbcf96813826726c71fde0f68336cf53c75f37931b3150cc0d8c60d3008b7bd9e82ae1fb143ceee4c1d7bae9498539f03', '2aba475b9b879ec9e398b3e77fe84a48', 'PRODUCTION_PLANNER', 'FAC-002', 'Nova Industrial Systems', 'active', '2026-10-26T09:15:48.559Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-017', 'Deepa Krishnan (Production Planner)', 'planner.vertex@factoryops.com', '6950d28dec346a8281118323fdec793d8913fa0651e0be9f0e9094fbbae01598b913c33559eede0068718d106e6a7035c27c9fa4d4bbe9d9b3720e57123c5c99', 'd22b661539e53cc5a816da92bd1ea773', 'PRODUCTION_PLANNER', 'FAC-003', 'Vertex Auto Components', 'active', '2026-10-26T09:15:48.559Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;

-- Seed Machines (81 units)
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-A1', 'FAC-001', 'APX-CNC-01', '5-Axis CNC Milling #1', '5-Axis CNC Milling', 'Engine Block Line A', 'running', 91, 63.5, 2, 6.2, 1500, 89.5, 'Ramesh V.', '2021-04-12', '2026-09-18')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-A2', 'FAC-001', 'APX-CNC-02', '5-Axis CNC Milling #2', '5-Axis CNC Milling', 'Engine Block Line A', 'running', 90, 65, 2.2, 6.6, 1550, 92.5, 'Sanjay P.', '2021-04-12', '2026-09-18')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-A3', 'FAC-001', 'APX-CNC-03', '5-Axis CNC Milling #3', '5-Axis CNC Milling', 'Engine Block Line A', 'running', 89, 66.5, 2.4, 5.8, 1600, 87.5, 'Gita K.', '2021-04-12', '2026-09-18')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-A4', 'FAC-001', 'APX-CNC-04', '5-Axis CNC Milling #4', '5-Axis CNC Milling', 'Engine Block Line A', 'running', 88, 68, 2.6, 6.2, 1450, 90.5, 'Deepak R.', '2021-04-12', '2026-09-18')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-A5', 'FAC-001', 'APX-CNC-05', '5-Axis CNC Milling #5', '5-Axis CNC Milling', 'Engine Block Line A', 'running', 92, 69.5, 2.8, 6.6, 1500, 93.5, 'Arun M.', '2021-04-12', '2026-09-18')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-A6', 'FAC-001', 'APX-CNC-06', '5-Axis CNC Milling #6', '5-Axis CNC Milling', 'Engine Block Line A', 'running', 91, 71, 3, 5.8, 1550, 88.5, 'Ramesh V.', '2021-04-12', '2026-09-18')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-A7', 'FAC-001', 'APX-PRS-01', 'Hydraulic Stamping Press 500T #1', 'Hydraulic Stamping Press 500T', 'Transmission Line B', 'warning', 74, 81.5, 3.8, 6.2, 1600, 79.2, 'Sanjay P.', '2021-04-12', '2026-09-18')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-A8', 'FAC-001', 'APX-PRS-02', 'Hydraulic Stamping Press 500T #2', 'Hydraulic Stamping Press 500T', 'Transmission Line B', 'running', 89, 74, 1.9, 6.6, 1450, 86.5, 'Gita K.', '2021-04-12', '2026-09-18')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-A9', 'FAC-001', 'APX-PRS-03', 'Hydraulic Stamping Press 500T #3', 'Hydraulic Stamping Press 500T', 'Transmission Line B', 'running', 88, 75.5, 2.1, 5.8, 1500, 89.5, 'Deepak R.', '2021-04-12', '2026-09-18')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-A10', 'FAC-001', 'APX-PRS-04', 'Hydraulic Stamping Press 500T #4', 'Hydraulic Stamping Press 500T', 'Transmission Line B', 'running', 92, 62, 2.3, 6.2, 1550, 92.5, 'Arun M.', '2021-04-12', '2026-09-18')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-A11', 'FAC-001', 'APX-ROB-01', '6-Axis Robotic Welder #1', '6-Axis Robotic Welder', 'Chassis Line C', 'running', 91, 63.5, 2.5, 6.6, 1600, 87.5, 'Ramesh V.', '2021-04-12', '2026-09-18')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-A12', 'FAC-001', 'APX-ROB-02', '6-Axis Robotic Welder #2', '6-Axis Robotic Welder', 'Chassis Line C', 'warning', 71, 83, 4.1, 5.8, 1450, 76.5, 'Sanjay P.', '2021-04-12', '2026-09-18')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-A13', 'FAC-001', 'APX-ROB-03', '6-Axis Robotic Welder #3', '6-Axis Robotic Welder', 'Chassis Line C', 'running', 89, 66.5, 2.9, 6.2, 1500, 93.5, 'Gita K.', '2021-04-12', '2026-09-18')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-A14', 'FAC-001', 'APX-CMM-01', 'Coordinate Measuring Machine #1', 'Coordinate Measuring Machine', 'Engine Block Line A', 'running', 88, 68, 3.1, 6.6, 1550, 88.5, 'Deepak R.', '2021-04-12', '2026-09-18')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-A15', 'FAC-001', 'APX-WLD-01', 'Laser Welding Cell #1', 'Laser Welding Cell', 'Chassis Line C', 'maintenance', 58, 42, 0.5, 5.8, 1600, 0, 'Arun M.', '2021-04-12', '2026-09-18')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B1', 'FAC-002', 'NOV-MIL-01', 'Vertical Machining Center #1', 'Vertical Machining Center', 'Turbine Blades Line 1', 'running', 87, 66.8, 2.4, 6.4, 1280, 84.5, 'Sunil M.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B2', 'FAC-002', 'NOV-MIL-02', 'Vertical Machining Center #2', 'Vertical Machining Center', 'Turbine Blades Line 1', 'running', 86, 68.6, 2.6, 6.7, 1360, 87, 'Prashant T.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B3', 'FAC-002', 'NOV-MIL-03', 'Vertical Machining Center #3', 'Vertical Machining Center', 'Turbine Blades Line 1', 'running', 85, 70.4, 2.9, 6.1, 1440, 82.5, 'Sneha R.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B4', 'FAC-002', 'NOV-MIL-04', 'Vertical Machining Center #4', 'Vertical Machining Center', 'Turbine Blades Line 1', 'warning', 73, 79.4, 3.9, 6.4, 1520, 78.1, 'Vinod B.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B5', 'FAC-002', 'NOV-MIL-05', 'Vertical Machining Center #5', 'Vertical Machining Center', 'Turbine Blades Line 1', 'running', 83, 74, 3.4, 6.7, 1200, 87.5, 'Sunil M.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B6', 'FAC-002', 'NOV-MIL-06', 'Vertical Machining Center #6', 'Vertical Machining Center', 'Turbine Blades Line 1', 'running', 88, 75.8, 3.6, 6.1, 1280, 83, 'Prashant T.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B7', 'FAC-002', 'NOV-LTH-01', 'Heavy Duty CNC Lathe #1', 'Heavy Duty CNC Lathe', 'Heavy Gearboxes Line 2', 'running', 87, 77.6, 3.9, 6.4, 1360, 85.5, 'Sneha R.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B8', 'FAC-002', 'NOV-LTH-02', 'Heavy Duty CNC Lathe #2', 'Heavy Duty CNC Lathe', 'Heavy Gearboxes Line 2', 'running', 86, 79.4, 2.3, 6.7, 1440, 88, 'Vinod B.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B9', 'FAC-002', 'NOV-LTH-03', 'Heavy Duty CNC Lathe #3', 'Heavy Duty CNC Lathe', 'Heavy Gearboxes Line 2', 'warning', 75, 81.2, 4.2, 6.1, 1520, 75.8, 'Sunil M.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B10', 'FAC-002', 'NOV-LTH-04', 'Heavy Duty CNC Lathe #4', 'Heavy Duty CNC Lathe', 'Heavy Gearboxes Line 2', 'running', 84, 65, 2.8, 6.4, 1200, 86, 'Prashant T.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B11', 'FAC-002', 'NOV-LTH-05', 'Heavy Duty CNC Lathe #5', 'Heavy Duty CNC Lathe', 'Heavy Gearboxes Line 2', 'running', 83, 66.8, 3.1, 6.7, 1280, 88.5, 'Sneha R.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B12', 'FAC-002', 'NOV-LTH-06', 'Heavy Duty CNC Lathe #6', 'Heavy Duty CNC Lathe', 'Heavy Gearboxes Line 2', 'running', 88, 68.6, 3.3, 6.1, 1360, 84, 'Vinod B.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B13', 'FAC-002', 'NOV-GRD-01', 'Cylindrical Surface Grinder #1', 'Cylindrical Surface Grinder', 'Precision Shafts Line 3', 'running', 87, 70.4, 3.6, 6.4, 1440, 86.5, 'Sunil M.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B14', 'FAC-002', 'NOV-GRD-02', 'Cylindrical Surface Grinder #2', 'Cylindrical Surface Grinder', 'Precision Shafts Line 3', 'warning', 70, 83.5, 4.4, 6.7, 1520, 74.2, 'Prashant T.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B15', 'FAC-002', 'NOV-GRD-03', 'Cylindrical Surface Grinder #3', 'Cylindrical Surface Grinder', 'Precision Shafts Line 3', 'running', 85, 74, 2.3, 6.1, 1200, 84.5, 'Sneha R.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B16', 'FAC-002', 'NOV-GRD-04', 'Cylindrical Surface Grinder #4', 'Cylindrical Surface Grinder', 'Precision Shafts Line 3', 'running', 84, 75.8, 2.5, 6.4, 1280, 87, 'Vinod B.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B17', 'FAC-002', 'NOV-ASM-01', 'Robotic Gearbox Assembly Station #1', 'Robotic Gearbox Assembly Station', 'Heavy Gearboxes Line 2', 'running', 83, 77.6, 2.8, 6.7, 1360, 82.5, 'Sunil M.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B18', 'FAC-002', 'NOV-ASM-02', 'Robotic Gearbox Assembly Station #2', 'Robotic Gearbox Assembly Station', 'Heavy Gearboxes Line 2', 'maintenance', 54, 38, 0.2, 6.1, 1440, 0, 'Prashant T.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C1', 'FAC-003', 'VTX-STP-01', 'Progressive Stamping Press #1', 'Progressive Stamping Press', 'Body Shop Line', 'running', 93, 56, 1.6, 5.5, 1500, 91.5, 'Murugan C.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C2', 'FAC-003', 'VTX-STP-02', 'Progressive Stamping Press #2', 'Progressive Stamping Press', 'Body Shop Line', 'running', 92, 57, 1.8, 5.5, 1500, 93, 'Jayanthi S.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C3', 'FAC-003', 'VTX-STP-03', 'Progressive Stamping Press #3', 'Progressive Stamping Press', 'Body Shop Line', 'running', 91, 58, 2, 5.5, 1500, 94.5, 'Venkatesh P.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C4', 'FAC-003', 'VTX-STP-04', 'Progressive Stamping Press #4', 'Progressive Stamping Press', 'Body Shop Line', 'running', 90, 59, 2.2, 5.5, 1500, 91, 'Murugan C.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C5', 'FAC-003', 'VTX-STP-05', 'Progressive Stamping Press #5', 'Progressive Stamping Press', 'Body Shop Line', 'running', 94, 60, 1.4, 5.5, 1500, 92.5, 'Jayanthi S.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C6', 'FAC-003', 'VTX-ROB-01', 'Spot Welding Robot #1', 'Spot Welding Robot', 'Body Shop Line', 'warning', 77, 61, 1.6, 5.5, 1500, 83.2, 'Venkatesh P.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C7', 'FAC-003', 'VTX-ROB-02', 'Spot Welding Robot #2', 'Spot Welding Robot', 'Body Shop Line', 'running', 92, 62, 1.8, 5.5, 1500, 90.5, 'Murugan C.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C8', 'FAC-003', 'VTX-ROB-03', 'Spot Welding Robot #3', 'Spot Welding Robot', 'Body Shop Line', 'running', 91, 63, 2, 5.5, 1500, 92, 'Jayanthi S.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C9', 'FAC-003', 'VTX-ROB-04', 'Spot Welding Robot #4', 'Spot Welding Robot', 'Body Shop Line', 'running', 90, 64, 2.2, 5.5, 1500, 93.5, 'Venkatesh P.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C10', 'FAC-003', 'VTX-ROB-05', 'Spot Welding Robot #5', 'Spot Welding Robot', 'Body Shop Line', 'running', 94, 55, 1.4, 5.5, 1500, 90, 'Murugan C.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C11', 'FAC-003', 'VTX-PNT-01', 'Automated Electrostatic Paint Booth #1', 'Automated Electrostatic Paint Booth', 'Paint Shop Line', 'running', 93, 56, 1.6, 5.5, 1500, 91.5, 'Jayanthi S.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C12', 'FAC-003', 'VTX-PNT-02', 'Automated Electrostatic Paint Booth #2', 'Automated Electrostatic Paint Booth', 'Paint Shop Line', 'running', 92, 57, 1.8, 5.5, 1500, 93, 'Venkatesh P.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C13', 'FAC-003', 'VTX-PNT-03', 'Automated Electrostatic Paint Booth #3', 'Automated Electrostatic Paint Booth', 'Paint Shop Line', 'running', 91, 58, 2, 5.5, 1500, 94.5, 'Murugan C.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C14', 'FAC-003', 'VTX-QC-01', 'Automated Optical Inspection Cell #1', 'Automated Optical Inspection Cell', 'Final Assembly Line', 'running', 90, 59, 2.2, 5.5, 1500, 91, 'Jayanthi S.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C15', 'FAC-003', 'VTX-QC-02', 'Automated Optical Inspection Cell #2', 'Automated Optical Inspection Cell', 'Final Assembly Line', 'running', 94, 60, 1.4, 5.5, 1500, 92.5, 'Venkatesh P.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C16', 'FAC-003', 'VTX-QC-03', 'Automated Optical Inspection Cell #3', 'Automated Optical Inspection Cell', 'Final Assembly Line', 'maintenance', 60, 61, 1.6, 5.5, 1500, 0, 'Murugan C.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D1', 'FAC-004', 'PRM-SMT-01', 'High-Speed SMT Pick & Place #1', 'High-Speed SMT Pick & Place', 'SMT High-Speed Line 1', 'running', 84, 49, 0.8, 6, 2800, 79.8, 'Pooja N.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D2', 'FAC-004', 'PRM-SMT-02', 'High-Speed SMT Pick & Place #2', 'High-Speed SMT Pick & Place', 'SMT High-Speed Line 1', 'warning', 71, 50, 0.8, 6, 2800, 72.5, 'Chethan K.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D3', 'FAC-004', 'PRM-SMT-03', 'High-Speed SMT Pick & Place #3', 'High-Speed SMT Pick & Place', 'SMT High-Speed Line 1', 'running', 82, 51, 0.8, 6, 2800, 83.4, 'Divya S.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D4', 'FAC-004', 'PRM-SMT-04', 'High-Speed SMT Pick & Place #4', 'High-Speed SMT Pick & Place', 'SMT High-Speed Line 1', 'running', 81, 52, 0.8, 6, 2800, 79.2, 'Pooja N.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D5', 'FAC-004', 'PRM-SMT-05', 'High-Speed SMT Pick & Place #5', 'High-Speed SMT Pick & Place', 'SMT High-Speed Line 1', 'running', 80, 53, 0.8, 6, 2800, 81, 'Chethan K.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D6', 'FAC-004', 'PRM-SMT-06', 'High-Speed SMT Pick & Place #6', 'High-Speed SMT Pick & Place', 'SMT High-Speed Line 1', 'running', 79, 54, 0.8, 6, 2800, 82.8, 'Divya S.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D7', 'FAC-004', 'PRM-SMT-07', 'High-Speed SMT Pick & Place #7', 'High-Speed SMT Pick & Place', 'SMT High-Speed Line 1', 'warning', 71, 55, 0.8, 6, 2800, 72.5, 'Pooja N.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D8', 'FAC-004', 'PRM-SMT-08', 'High-Speed SMT Pick & Place #8', 'High-Speed SMT Pick & Place', 'SMT High-Speed Line 1', 'running', 84, 48, 0.8, 6, 2800, 80.4, 'Chethan K.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D9', 'FAC-004', 'PRM-AOI-01', '3D Automated Optical Inspection #1', '3D Automated Optical Inspection', 'SMT High-Speed Line 2', 'running', 83, 49, 0.8, 6, 2800, 82.2, 'Divya S.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D10', 'FAC-004', 'PRM-AOI-02', '3D Automated Optical Inspection #2', '3D Automated Optical Inspection', 'SMT High-Speed Line 2', 'running', 82, 50, 0.8, 6, 2800, 78, 'Pooja N.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D11', 'FAC-004', 'PRM-AOI-03', '3D Automated Optical Inspection #3', '3D Automated Optical Inspection', 'SMT High-Speed Line 2', 'warning', 71, 51, 0.8, 6, 2800, 72.5, 'Chethan K.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D12', 'FAC-004', 'PRM-AOI-04', '3D Automated Optical Inspection #4', '3D Automated Optical Inspection', 'SMT High-Speed Line 2', 'running', 80, 52, 0.8, 6, 2800, 81.6, 'Divya S.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D13', 'FAC-004', 'PRM-RFL-01', 'Nitrogen Reflow Oven 12-Zone #1', 'Nitrogen Reflow Oven 12-Zone', 'SMT High-Speed Line 2', 'running', 79, 53, 0.8, 6, 2800, 83.4, 'Pooja N.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D14', 'FAC-004', 'PRM-RFL-02', 'Nitrogen Reflow Oven 12-Zone #2', 'Nitrogen Reflow Oven 12-Zone', 'SMT High-Speed Line 2', 'running', 85, 54, 0.8, 6, 2800, 79.2, 'Chethan K.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D15', 'FAC-004', 'PRM-RFL-03', 'Nitrogen Reflow Oven 12-Zone #3', 'Nitrogen Reflow Oven 12-Zone', 'SMT High-Speed Line 2', 'warning', 71, 55, 0.8, 6, 2800, 72.5, 'Divya S.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D16', 'FAC-004', 'PRM-RFL-04', 'Nitrogen Reflow Oven 12-Zone #4', 'Nitrogen Reflow Oven 12-Zone', 'SMT High-Speed Line 2', 'running', 83, 48, 0.8, 6, 2800, 82.8, 'Pooja N.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D17', 'FAC-004', 'PRM-TST-01', 'In-Circuit ICT / Functional Tester #1', 'In-Circuit ICT / Functional Tester', 'Testing & Packaging Line', 'running', 82, 49, 0.8, 6, 2800, 78.6, 'Chethan K.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D18', 'FAC-004', 'PRM-TST-02', 'In-Circuit ICT / Functional Tester #2', 'In-Circuit ICT / Functional Tester', 'Testing & Packaging Line', 'running', 81, 50, 0.8, 6, 2800, 80.4, 'Divya S.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D19', 'FAC-004', 'PRM-TST-03', 'In-Circuit ICT / Functional Tester #3', 'In-Circuit ICT / Functional Tester', 'Testing & Packaging Line', 'running', 80, 51, 0.8, 6, 2800, 82.2, 'Pooja N.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D20', 'FAC-004', 'PRM-TST-04', 'In-Circuit ICT / Functional Tester #4', 'In-Circuit ICT / Functional Tester', 'Testing & Packaging Line', 'maintenance', 52, 52, 0.8, 6, 2800, 0, 'Chethan K.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-E1', 'FAC-005', 'ORN-FRG-01', 'Hydraulic Open-Die Forging Press 2000T #1', 'Hydraulic Open-Die Forging Press 2000T', 'Heavy Forging Line', 'running', 85, 71, 3.2, 8.5, 650, 88, 'Kuppuswamy R.', '2016-11-20', '2026-09-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-E2', 'FAC-005', 'ORN-FRG-02', 'Hydraulic Open-Die Forging Press 2000T #2', 'Hydraulic Open-Die Forging Press 2000T', 'Heavy Forging Line', 'running', 84, 72, 3.2, 8.5, 650, 86, 'Dhandapani M.', '2016-11-20', '2026-09-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-E3', 'FAC-005', 'ORN-FRG-03', 'Hydraulic Open-Die Forging Press 2000T #3', 'Hydraulic Open-Die Forging Press 2000T', 'Heavy Forging Line', 'warning', 74, 73, 3.2, 8.5, 650, 79.5, 'Palanisamy V.', '2016-11-20', '2026-09-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-E4', 'FAC-005', 'ORN-FRG-04', 'Hydraulic Open-Die Forging Press 2000T #4', 'Hydraulic Open-Die Forging Press 2000T', 'Heavy Forging Line', 'running', 82, 74, 3.2, 8.5, 650, 86, 'Kuppuswamy R.', '2016-11-20', '2026-09-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-E5', 'FAC-005', 'ORN-TRN-01', 'Heavy Vertical Boring Mill #1', 'Heavy Vertical Boring Mill', 'Precision Machining Line', 'running', 86, 75, 3.2, 8.5, 650, 88, 'Dhandapani M.', '2016-11-20', '2026-09-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-E6', 'FAC-005', 'ORN-TRN-02', 'Heavy Vertical Boring Mill #2', 'Heavy Vertical Boring Mill', 'Precision Machining Line', 'running', 85, 76, 3.2, 8.5, 650, 86, 'Palanisamy V.', '2016-11-20', '2026-09-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-E7', 'FAC-005', 'ORN-TRN-03', 'Heavy Vertical Boring Mill #3', 'Heavy Vertical Boring Mill', 'Precision Machining Line', 'running', 84, 77, 3.2, 8.5, 650, 88, 'Kuppuswamy R.', '2016-11-20', '2026-09-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-E8', 'FAC-005', 'ORN-TRN-04', 'Heavy Vertical Boring Mill #4', 'Heavy Vertical Boring Mill', 'Precision Machining Line', 'running', 83, 78, 3.2, 8.5, 650, 86, 'Dhandapani M.', '2016-11-20', '2026-09-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-E9', 'FAC-005', 'ORN-PLN-01', 'Double-Housing Planer Mill #1', 'Double-Housing Planer Mill', 'Precision Machining Line', 'running', 82, 79, 3.2, 8.5, 650, 88, 'Palanisamy V.', '2016-11-20', '2026-09-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-E10', 'FAC-005', 'ORN-PLN-02', 'Double-Housing Planer Mill #2', 'Double-Housing Planer Mill', 'Precision Machining Line', 'running', 86, 80, 3.2, 8.5, 650, 86, 'Kuppuswamy R.', '2016-11-20', '2026-09-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-E11', 'FAC-005', 'ORN-QC-01', 'Ultrasonic Flaw Detector & CMM #1', 'Ultrasonic Flaw Detector & CMM', 'Precision Machining Line', 'running', 85, 81, 3.2, 8.5, 650, 88, 'Dhandapani M.', '2016-11-20', '2026-09-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, type, line, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-E12', 'FAC-005', 'ORN-QC-02', 'Ultrasonic Flaw Detector & CMM #2', 'Ultrasonic Flaw Detector & CMM', 'Precision Machining Line', 'maintenance', 55, 70, 3.2, 8.5, 650, 0, 'Palanisamy V.', '2016-11-20', '2026-09-05')
ON CONFLICT (id) DO NOTHING;

-- Seed Incidents
INSERT INTO incidents (id, incident_id, factory_id, machine_id, title, description, severity, status, reported_by, reported_at, resolved_at, root_cause, resolution_notes)
VALUES ('INC-A01', 'INC-2026-0104', 'FAC-001', 'APX-PRS-03', 'Hydraulic Seal Micro-leakage & Pressure Drop', 'Intermittent pressure drops noticed on valve block manifold. Pressure fluctuated between 4.2 and 5.9 bar.', 'Medium', 'Investigating', 'Sanjay P.', '2026-10-05T14:22:00Z', NULL, 'Seal wear at primary piston fitting under high thermal cycle.', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, factory_id, machine_id, title, description, severity, status, reported_by, reported_at, resolved_at, root_cause, resolution_notes)
VALUES ('INC-A02', 'INC-2026-0098', 'FAC-001', 'APX-CNC-04', 'Spindle Bearing Thermal Warning (>82°C)', 'Vibration frequency anomaly detected on axis Z with thermal buildup exceeding standard threshold.', 'High', 'Open', 'Ramesh V.', '2026-10-06T01:10:00Z', NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, factory_id, machine_id, title, description, severity, status, reported_by, reported_at, resolved_at, root_cause, resolution_notes)
VALUES ('INC-A03', 'INC-2026-0087', 'FAC-001', 'APX-ROB-02', 'Welding Torch Tip Cladding Oxidation', 'Automated torch cleaner nozzle blockage caused partial cladding splatter.', 'Low', 'Resolved', 'Deepak R.', '2026-10-04T09:15:00Z', '2026-10-04T16:30:00Z', 'Gas shield flow restrictor clogged.', 'Cleaned nozzle, calibrated gas mix, passed QA verification.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, factory_id, machine_id, title, description, severity, status, reported_by, reported_at, resolved_at, root_cause, resolution_notes)
VALUES ('INC-B01', 'INC-2026-0210', 'FAC-002', 'NOV-LTH-03', 'Chucking Hydraulic Pressure Deviation', 'Automatic bar feeder reported clamping pressure drop below 35 bar minimum threshold.', 'High', 'Open', 'Sunil M.', '2026-10-06T03:15:00Z', NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, factory_id, machine_id, title, description, severity, status, reported_by, reported_at, resolved_at, root_cause, resolution_notes)
VALUES ('INC-B02', 'INC-2026-0205', 'FAC-002', 'NOV-GRD-02', 'Coolant Flow Rate Sensor Stoppage', 'Flow meter indicated zero flow while pump motor remained energized. Preventative interlock tripped.', 'Medium', 'Investigating', 'Prashant T.', '2026-10-05T18:40:00Z', NULL, 'Particulate sludge clogging fine mesh suction strainer.', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, factory_id, machine_id, title, description, severity, status, reported_by, reported_at, resolved_at, root_cause, resolution_notes)
VALUES ('INC-C01', 'INC-2026-0301', 'FAC-003', 'VTX-ROB-03', 'Spot Welder Current Density Fluctuation', 'Secondary current dropped by 8% during outer door panel tack sequence.', 'Medium', 'Open', 'Murugan C.', '2026-10-06T00:45:00Z', NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, factory_id, machine_id, title, description, severity, status, reported_by, reported_at, resolved_at, root_cause, resolution_notes)
VALUES ('INC-D01', 'INC-2026-0415', 'FAC-004', 'PRM-SMT-02', 'Feeder Reel Feeder Jamming Error 402', 'Component mispick rate exceeded 0.05% on 0201 capacitor reels.', 'Medium', 'Open', 'Pooja N.', '2026-10-06T02:30:00Z', NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, factory_id, machine_id, title, description, severity, status, reported_by, reported_at, resolved_at, root_cause, resolution_notes)
VALUES ('INC-E01', 'INC-2026-0509', 'FAC-005', 'ORN-FRG-02', 'Forging Ram Guide Rail Thermal Expansion Alert', 'Lube oil temperature elevated to 68°C; thermal sensor triggered yellow caution.', 'High', 'Open', 'Kuppuswamy R.', '2026-10-06T03:00:00Z', NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Seed Work Orders
INSERT INTO work_orders (id, work_order_id, factory_id, machine_id, title, priority, status, assigned_to, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required)
VALUES ('WO-A01', 'WO-2026-0412', 'FAC-001', 'APX-CNC-04', 'Spindle Bearing Re-alignment and Lubricant Purge', 'High', 'In Progress', 'Ramesh Varma (Senior Technician)', '2026-10-18', '2026-10-06T02:00:00Z', NULL, 4, NULL, 'SKF Ceramic Hybrid Bearing Set, Mobil Vactra #2')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, factory_id, machine_id, title, priority, status, assigned_to, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required)
VALUES ('WO-A02', 'WO-2026-0395', 'FAC-001', 'APX-PRS-03', 'Manifold High-Pressure O-Ring Seal Replacement', 'Critical', 'In Progress', 'Ramesh Varma (Senior Technician)', '2026-10-11', '2026-10-05T15:30:00Z', NULL, 3, NULL, 'Viton 90 Durometer High-Temp Seal Kit')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, factory_id, machine_id, title, priority, status, assigned_to, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required)
VALUES ('WO-A03', 'WO-2026-0380', 'FAC-001', 'APX-CMM-01', 'Granite Table Levelling & Laser Interferometer Verification', 'Low', 'Completed', 'Ramesh Varma (Senior Technician)', '2026-10-02', '2026-09-29T10:00:00Z', '2026-10-01T17:00:00Z', 6, 5.5, NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, factory_id, machine_id, title, priority, status, assigned_to, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required)
VALUES ('WO-A04', 'WO-2026-0428', 'FAC-001', 'APX-ROB-02', 'Robotic Arm Axis 4 Servo Harmonic Drive Greasing', 'Medium', 'Pending', 'Ramesh Varma (Senior Technician)', '2026-10-16', '2026-10-12T08:00:00Z', NULL, 2, NULL, 'Harmonic grease cartridge, Seal ring')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, factory_id, machine_id, title, priority, status, assigned_to, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required)
VALUES ('WO-A05', 'WO-2026-0435', 'FAC-001', 'APX-WLD-01', 'Fiber Laser Optic Chiller De-ionizing Filter Exchange', 'High', 'Pending', 'Anil S.', '2026-10-15', '2026-10-13T11:20:00Z', NULL, 2.5, NULL, '0.2 Micron Chiller Cartridge')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, factory_id, machine_id, title, priority, status, assigned_to, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required)
VALUES ('WO-B01', 'WO-2026-0501', 'FAC-002', 'NOV-LTH-03', 'Chuck Cylinder Rotary Joint Seal Inspection', 'High', 'Pending', 'Sagar N.', '2026-10-07', '2026-10-06T03:30:00Z', NULL, 3.5, NULL, 'Kitagawa Hydraulic Cylinder Rotary Joint Kit')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, factory_id, machine_id, title, priority, status, assigned_to, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required)
VALUES ('WO-B02', 'WO-2026-0488', 'FAC-002', 'NOV-GRD-02', 'Coolant Sump Ultrasonic Cleaning & Micron Filter Renewal', 'Medium', 'In Progress', 'Maintenance Crew B', '2026-10-06', '2026-10-05T19:00:00Z', NULL, 2, NULL, '10 Micron Bag Filters x 4, Castrol Hysol Coolant 50L')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, factory_id, machine_id, title, priority, status, assigned_to, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required)
VALUES ('WO-C01', 'WO-2026-0610', 'FAC-003', 'VTX-ROB-03', 'Electrode Tip Dresser Maintenance and Transformer Check', 'Medium', 'Pending', 'R. Balaji', '2026-10-08', '2026-10-06T01:00:00Z', NULL, 2.5, NULL, NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, factory_id, machine_id, title, priority, status, assigned_to, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required)
VALUES ('WO-D01', 'WO-2026-0720', 'FAC-004', 'PRM-SMT-02', 'Vacuum Nozzle Ultrasonic Cleaning & Feeder Calibration', 'High', 'In Progress', 'Naveen K.', '2026-10-06', '2026-10-06T02:45:00Z', NULL, 1.5, NULL, NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, factory_id, machine_id, title, priority, status, assigned_to, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required)
VALUES ('WO-E01', 'WO-2026-0811', 'FAC-005', 'ORN-FRG-02', 'Oil Heat Exchanger Descaling & Flow Check', 'High', 'Pending', 'N. Muthusamy', '2026-10-07', '2026-10-06T03:10:00Z', NULL, 4, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Seed Maintenance Records
INSERT INTO maintenance_records (id, factory_id, machine_id, type, status, scheduled_date, completed_date, technician, description, cost_usd, downtime_hours)
VALUES ('MNT-A01', 'FAC-001', 'APX-WLD-01', 'Preventive', 'In Progress', '2026-10-06', NULL, 'Kishore B. (Senior Tech)', 'Bi-annual optics calibration, chiller flush, and laser power meter alignment.', 1250, 4.5)
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, factory_id, machine_id, type, status, scheduled_date, completed_date, technician, description, cost_usd, downtime_hours)
VALUES ('MNT-A02', 'FAC-001', 'APX-CNC-02', 'Predictive', 'Scheduled', '2026-10-08', NULL, 'Anil S.', 'Spindle vibration harmonic analysis and grease replenishing.', 480, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, factory_id, machine_id, type, status, scheduled_date, completed_date, technician, description, cost_usd, downtime_hours)
VALUES ('MNT-A03', 'FAC-001', 'APX-PRS-01', 'Preventive', 'Completed', '2026-09-30', '2026-09-30', 'Kishore B.', 'Filter replacement, hydraulic fluid flush, pressure transducer zeroing.', 820, 3)
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, factory_id, machine_id, type, status, scheduled_date, completed_date, technician, description, cost_usd, downtime_hours)
VALUES ('MNT-B01', 'FAC-002', 'NOV-ASM-02', 'Predictive', 'Scheduled', '2026-10-09', NULL, 'Sagar N.', 'Harmonic drive backlash calibration on wrist axes J4 & J5.', 950, 3.5)
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, factory_id, machine_id, type, status, scheduled_date, completed_date, technician, description, cost_usd, downtime_hours)
VALUES ('MNT-B02', 'FAC-002', 'NOV-LTH-01', 'Preventive', 'Completed', '2026-09-28', '2026-09-28', 'Sagar N.', 'Turret index coupling alignment and hydraulic filter swap.', 620, 2.5)
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, factory_id, machine_id, type, status, scheduled_date, completed_date, technician, description, cost_usd, downtime_hours)
VALUES ('MNT-C01', 'FAC-003', 'VTX-PNT-01', 'Preventive', 'Completed', '2026-10-01', '2026-10-01', 'R. Balaji', 'Electrostatic atomizer bell cup cleaning and voltage curve audit.', 1100, 3)
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, factory_id, machine_id, type, status, scheduled_date, completed_date, technician, description, cost_usd, downtime_hours)
VALUES ('MNT-D01', 'FAC-004', 'PRM-RFL-01', 'Preventive', 'Completed', '2026-09-29', '2026-09-29', 'Naveen K.', 'Flux condensation collector cleanout and thermal profile audit.', 750, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, factory_id, machine_id, type, status, scheduled_date, completed_date, technician, description, cost_usd, downtime_hours)
VALUES ('MNT-E01', 'FAC-005', 'ORN-TRN-01', 'Predictive', 'Completed', '2026-09-25', '2026-09-25', 'N. Muthusamy', 'Hydrostatic table pocket pressure balancing and gib readjustment.', 1400, 5)
ON CONFLICT (id) DO NOTHING;

-- Seed SOPs
INSERT INTO sops (id, sop_id, factory_id, title, machine_type, category, version, last_updated, author, steps, safety_precautions, target_audience)
VALUES ('SOP-A01', 'SOP-CNC-501', 'FAC-001', '5-Axis CNC Milling Warm-up and Zero Referencing Protocol', '5-Axis CNC Milling', 'Operating Procedure', 'v3.2', '2026-08-15', 'Chief Process Engineer', '{"Verify pneumatic supply pressure is stabilized above 6.0 bar before powering control cabinet.","Execute spindle low-RPM ramp-up sequence (500 RPM -> 3000 RPM over 8 minutes) to distribute lubricant.","Engage automatic tool length measurement probe and confirm stylus runout is < 0.003mm.","Reference G54 datum using electronic touch-probe against hardened fixture gauge."}', '{"Safety enclosure interlock must never be bypassed during spindle test cycles.","Always wear Class 1 impact-resistant eye protection and anti-slip safety footwear."}', 'CNC Machinists & Machine Operators')
ON CONFLICT (id) DO NOTHING;
INSERT INTO sops (id, sop_id, factory_id, title, machine_type, category, version, last_updated, author, steps, safety_precautions, target_audience)
VALUES ('SOP-A02', 'SOP-PRS-204', 'FAC-001', 'Hydraulic Stamping Press 500T Die Setup & Pressure Relief Procedure', 'Hydraulic Stamping Press 500T', 'Safety Protocol', 'v2.1', '2026-07-20', 'Safety Director', '{"Lockout/Tagout (LOTO) main 415V electrical breaker and bleed residual hydraulic cylinder energy.","Inspect die bolsters and clamp bolts with calibrated torque wrench (450 Nm).","Align photoelectric light curtains and perform mandatory break-test before releasing interlocks.","Perform initial slow-stroke test with sacrificial aluminum blank to inspect draw depth."}', '{"Two-hand anti-tie-down control stations must be tested before every shift.","Die safety blocks must be physically placed under the ram during tooling adjustment."}', 'Press Operators & Tool-and-Die Technicians')
ON CONFLICT (id) DO NOTHING;
INSERT INTO sops (id, sop_id, factory_id, title, machine_type, category, version, last_updated, author, steps, safety_precautions, target_audience)
VALUES ('SOP-B01', 'SOP-LTH-301', 'FAC-002', 'Heavy CNC Lathe Chuck Pressure Verification and Hard Jaw Boring', 'Heavy Duty CNC Lathe', 'Operating Procedure', 'v2.0', '2026-09-01', 'Lead Tooling Specialist', '{"Verify gripping force using dynamic wireless chuck force gauge at 1500 RPM.","Clock soft jaws with dial indicator to ensure concentricity within 0.015mm.","Execute pre-programmed boring cycle with light 0.2mm depth-of-cut pass."}', '{"Never leave chuck wrench in chuck under any circumstance.","Ensure chip conveyor is running and interlocked before starting cycle."}', 'Lathe Operators')
ON CONFLICT (id) DO NOTHING;
INSERT INTO sops (id, sop_id, factory_id, title, machine_type, category, version, last_updated, author, steps, safety_precautions, target_audience)
VALUES ('SOP-C01', 'SOP-WLD-101', 'FAC-003', 'Robotic Spot Welding Tip Dressing & Force Calibration Protocol', 'Spot Welding Robot', 'Quality Inspection', 'v1.4', '2026-08-10', 'Body Shop Quality Lead', '{"Inspect electrode cap wear profile with optical gauge.","Run auto-dress cycle for 1.8 seconds.","Validate clamp force with calibrated load cell."}', '{"Ensure robot cell gate is e-stopped during cell entry."}', 'Robotics Technicians')
ON CONFLICT (id) DO NOTHING;
INSERT INTO sops (id, sop_id, factory_id, title, machine_type, category, version, last_updated, author, steps, safety_precautions, target_audience)
VALUES ('SOP-D01', 'SOP-SMT-401', 'FAC-004', 'SMT Feeder Setup and Solder Paste Height Inspection', 'High-Speed SMT Pick & Place', 'Operating Procedure', 'v4.1', '2026-09-15', 'SMT Process Lead', '{"Scan QR barcode on component reel and verify BOM line.","Apply solder paste with stainless stencil (120 micron).","Verify paste volume on SPI system before releasing PCB."}', '{"ESD wrist strap and anti-static smock mandatory."}', 'SMT Line Operators')
ON CONFLICT (id) DO NOTHING;
INSERT INTO sops (id, sop_id, factory_id, title, machine_type, category, version, last_updated, author, steps, safety_precautions, target_audience)
VALUES ('SOP-E01', 'SOP-FRG-501', 'FAC-005', '2000T Forging Press Die Preheat and Hydraulic Balancing', 'Hydraulic Open-Die Forging Press 2000T', 'Safety Protocol', 'v2.2', '2026-07-30', 'Heavy Forge Superintendent', '{"Preheat die blocks with radiant gas heaters to 220°C before striking.","Confirm hydraulic accumulator bank charge pressure at 280 bar.","Cycle ram in inching mode to verify slide gib clearance."}', '{"Full heat-reflective apron, Kevlar arm guards, and face shield required.","Never stand in front of anvil opening during upset stroke."}', 'Forge Operators')
ON CONFLICT (id) DO NOTHING;

-- Seed Data Quality Metrics
INSERT INTO data_quality_metrics (id, factory_id, sensor_name, machine_id, uptime_percentage, data_completeness_pct, latency_ms, anomalies_detected, status, last_sync)
VALUES ('DQ-A01', 'FAC-001', 'Spindle Temperature & Accelerometer Bus', 'APX-CNC-01', 99.8, 99.4, 18, 0, 'Healthy', '12 seconds ago')
ON CONFLICT (id) DO NOTHING;
INSERT INTO data_quality_metrics (id, factory_id, sensor_name, machine_id, uptime_percentage, data_completeness_pct, latency_ms, anomalies_detected, status, last_sync)
VALUES ('DQ-A02', 'FAC-001', 'Hydraulic Pressure Transducer', 'APX-PRS-03', 98.2, 97.1, 45, 2, 'Degraded', '45 seconds ago')
ON CONFLICT (id) DO NOTHING;
INSERT INTO data_quality_metrics (id, factory_id, sensor_name, machine_id, uptime_percentage, data_completeness_pct, latency_ms, anomalies_detected, status, last_sync)
VALUES ('DQ-B01', 'FAC-002', 'Vibration & Acoustic Emission Array', 'NOV-MIL-01', 99.1, 98.7, 22, 1, 'Healthy', '18 seconds ago')
ON CONFLICT (id) DO NOTHING;
INSERT INTO data_quality_metrics (id, factory_id, sensor_name, machine_id, uptime_percentage, data_completeness_pct, latency_ms, anomalies_detected, status, last_sync)
VALUES ('DQ-C01', 'FAC-003', 'Current Transformer Telemetry Bus', 'VTX-ROB-01', 99.9, 99.8, 12, 0, 'Healthy', '5 seconds ago')
ON CONFLICT (id) DO NOTHING;
INSERT INTO data_quality_metrics (id, factory_id, sensor_name, machine_id, uptime_percentage, data_completeness_pct, latency_ms, anomalies_detected, status, last_sync)
VALUES ('DQ-D01', 'FAC-004', 'Feeder Vacuum Pressure Sensor Bus', 'PRM-SMT-01', 97.5, 96.2, 35, 4, 'Degraded', '30 seconds ago')
ON CONFLICT (id) DO NOTHING;
INSERT INTO data_quality_metrics (id, factory_id, sensor_name, machine_id, uptime_percentage, data_completeness_pct, latency_ms, anomalies_detected, status, last_sync)
VALUES ('DQ-E01', 'FAC-005', 'Hydraulic Pressure & Thermal Transducer Bus', 'ORN-FRG-01', 98.9, 98.1, 28, 1, 'Healthy', '20 seconds ago')
ON CONFLICT (id) DO NOTHING;

-- Seed Production Records
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-1-Morning-1', 'FAC-001', 'APX-CNC-01', '2026-10-13T06:00:00Z', 'Morning', 160, 158, 1, 2.2, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-1-Morning-2', 'FAC-001', 'APX-CNC-02', '2026-10-13T06:00:00Z', 'Morning', 160, 158, 1, 2.2, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-1-Morning-3', 'FAC-001', 'APX-CNC-03', '2026-10-13T06:00:00Z', 'Morning', 160, 158, 1, 2.2, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-1-Morning-4', 'FAC-001', 'APX-CNC-04', '2026-10-13T06:00:00Z', 'Morning', 160, 158, 1, 2.2, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-1-Morning-5', 'FAC-001', 'APX-CNC-05', '2026-10-13T06:00:00Z', 'Morning', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-1-Morning-6', 'FAC-001', 'APX-CNC-06', '2026-10-13T06:00:00Z', 'Morning', 160, 158, 1, 2.2, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-1-Afternoon-1', 'FAC-001', 'APX-CNC-01', '2026-10-13T14:00:00Z', 'Afternoon', 160, 158, 1, 2.2, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-1-Afternoon-2', 'FAC-001', 'APX-CNC-02', '2026-10-13T14:00:00Z', 'Afternoon', 160, 158, 1, 2.2, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-1-Afternoon-3', 'FAC-001', 'APX-CNC-03', '2026-10-13T14:00:00Z', 'Afternoon', 160, 158, 1, 2.2, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-1-Afternoon-4', 'FAC-001', 'APX-CNC-04', '2026-10-13T14:00:00Z', 'Afternoon', 160, 158, 1, 2.2, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-1-Afternoon-5', 'FAC-001', 'APX-CNC-05', '2026-10-13T14:00:00Z', 'Afternoon', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-1-Afternoon-6', 'FAC-001', 'APX-CNC-06', '2026-10-13T14:00:00Z', 'Afternoon', 160, 158, 1, 2.2, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-1-Night-1', 'FAC-001', 'APX-CNC-01', '2026-10-13T22:00:00Z', 'Night', 160, 158, 1, 2.2, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-1-Night-2', 'FAC-001', 'APX-CNC-02', '2026-10-13T22:00:00Z', 'Night', 160, 158, 1, 2.2, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-1-Night-3', 'FAC-001', 'APX-CNC-03', '2026-10-13T22:00:00Z', 'Night', 160, 158, 1, 2.2, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-1-Night-4', 'FAC-001', 'APX-CNC-04', '2026-10-13T22:00:00Z', 'Night', 160, 158, 1, 2.2, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-1-Night-5', 'FAC-001', 'APX-CNC-05', '2026-10-13T22:00:00Z', 'Night', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-1-Night-6', 'FAC-001', 'APX-CNC-06', '2026-10-13T22:00:00Z', 'Night', 160, 158, 1, 2.2, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-2-Morning-1', 'FAC-001', 'APX-CNC-01', '2026-10-14T06:00:00Z', 'Morning', 160, 161, 0, 0.4, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-2-Morning-2', 'FAC-001', 'APX-CNC-02', '2026-10-14T06:00:00Z', 'Morning', 160, 161, 0, 0.4, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-2-Morning-3', 'FAC-001', 'APX-CNC-03', '2026-10-14T06:00:00Z', 'Morning', 160, 161, 0, 0.4, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-2-Morning-4', 'FAC-001', 'APX-CNC-04', '2026-10-14T06:00:00Z', 'Morning', 160, 161, 0, 0.4, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-2-Morning-5', 'FAC-001', 'APX-CNC-05', '2026-10-14T06:00:00Z', 'Morning', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-2-Morning-6', 'FAC-001', 'APX-CNC-06', '2026-10-14T06:00:00Z', 'Morning', 160, 161, 0, 0.4, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-2-Afternoon-1', 'FAC-001', 'APX-CNC-01', '2026-10-14T14:00:00Z', 'Afternoon', 160, 161, 0, 0.4, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-2-Afternoon-2', 'FAC-001', 'APX-CNC-02', '2026-10-14T14:00:00Z', 'Afternoon', 160, 161, 0, 0.4, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-2-Afternoon-3', 'FAC-001', 'APX-CNC-03', '2026-10-14T14:00:00Z', 'Afternoon', 160, 161, 0, 0.4, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-2-Afternoon-4', 'FAC-001', 'APX-CNC-04', '2026-10-14T14:00:00Z', 'Afternoon', 160, 161, 0, 0.4, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-2-Afternoon-5', 'FAC-001', 'APX-CNC-05', '2026-10-14T14:00:00Z', 'Afternoon', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-2-Afternoon-6', 'FAC-001', 'APX-CNC-06', '2026-10-14T14:00:00Z', 'Afternoon', 160, 161, 0, 0.4, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-2-Night-1', 'FAC-001', 'APX-CNC-01', '2026-10-14T22:00:00Z', 'Night', 160, 161, 0, 0.4, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-2-Night-2', 'FAC-001', 'APX-CNC-02', '2026-10-14T22:00:00Z', 'Night', 160, 161, 0, 0.4, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-2-Night-3', 'FAC-001', 'APX-CNC-03', '2026-10-14T22:00:00Z', 'Night', 160, 161, 0, 0.4, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-2-Night-4', 'FAC-001', 'APX-CNC-04', '2026-10-14T22:00:00Z', 'Night', 160, 161, 0, 0.4, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-2-Night-5', 'FAC-001', 'APX-CNC-05', '2026-10-14T22:00:00Z', 'Night', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-2-Night-6', 'FAC-001', 'APX-CNC-06', '2026-10-14T22:00:00Z', 'Night', 160, 161, 0, 0.4, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-3-Morning-1', 'FAC-001', 'APX-CNC-01', '2026-10-15T06:00:00Z', 'Morning', 160, 155, 1, 2.2, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-3-Morning-2', 'FAC-001', 'APX-CNC-02', '2026-10-15T06:00:00Z', 'Morning', 160, 155, 1, 2.2, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-3-Morning-3', 'FAC-001', 'APX-CNC-03', '2026-10-15T06:00:00Z', 'Morning', 160, 155, 1, 2.2, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-3-Morning-4', 'FAC-001', 'APX-CNC-04', '2026-10-15T06:00:00Z', 'Morning', 160, 155, 1, 2.2, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-3-Morning-5', 'FAC-001', 'APX-CNC-05', '2026-10-15T06:00:00Z', 'Morning', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-3-Morning-6', 'FAC-001', 'APX-CNC-06', '2026-10-15T06:00:00Z', 'Morning', 160, 155, 1, 2.2, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-3-Afternoon-1', 'FAC-001', 'APX-CNC-01', '2026-10-15T14:00:00Z', 'Afternoon', 160, 155, 1, 2.2, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-3-Afternoon-2', 'FAC-001', 'APX-CNC-02', '2026-10-15T14:00:00Z', 'Afternoon', 160, 155, 1, 2.2, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-3-Afternoon-3', 'FAC-001', 'APX-CNC-03', '2026-10-15T14:00:00Z', 'Afternoon', 160, 155, 1, 2.2, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-3-Afternoon-4', 'FAC-001', 'APX-CNC-04', '2026-10-15T14:00:00Z', 'Afternoon', 160, 155, 1, 2.2, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-3-Afternoon-5', 'FAC-001', 'APX-CNC-05', '2026-10-15T14:00:00Z', 'Afternoon', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-3-Afternoon-6', 'FAC-001', 'APX-CNC-06', '2026-10-15T14:00:00Z', 'Afternoon', 160, 155, 1, 2.2, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-3-Night-1', 'FAC-001', 'APX-CNC-01', '2026-10-15T22:00:00Z', 'Night', 160, 155, 1, 2.2, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-3-Night-2', 'FAC-001', 'APX-CNC-02', '2026-10-15T22:00:00Z', 'Night', 160, 155, 1, 2.2, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-3-Night-3', 'FAC-001', 'APX-CNC-03', '2026-10-15T22:00:00Z', 'Night', 160, 155, 1, 2.2, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-3-Night-4', 'FAC-001', 'APX-CNC-04', '2026-10-15T22:00:00Z', 'Night', 160, 155, 1, 2.2, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-3-Night-5', 'FAC-001', 'APX-CNC-05', '2026-10-15T22:00:00Z', 'Night', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-3-Night-6', 'FAC-001', 'APX-CNC-06', '2026-10-15T22:00:00Z', 'Night', 160, 155, 1, 2.2, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-4-Morning-1', 'FAC-001', 'APX-CNC-01', '2026-10-16T06:00:00Z', 'Morning', 160, 158, 0, 0.4, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-4-Morning-2', 'FAC-001', 'APX-CNC-02', '2026-10-16T06:00:00Z', 'Morning', 160, 158, 0, 0.4, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-4-Morning-3', 'FAC-001', 'APX-CNC-03', '2026-10-16T06:00:00Z', 'Morning', 160, 158, 0, 0.4, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-4-Morning-4', 'FAC-001', 'APX-CNC-04', '2026-10-16T06:00:00Z', 'Morning', 160, 158, 0, 0.4, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-4-Morning-5', 'FAC-001', 'APX-CNC-05', '2026-10-16T06:00:00Z', 'Morning', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-4-Morning-6', 'FAC-001', 'APX-CNC-06', '2026-10-16T06:00:00Z', 'Morning', 160, 158, 0, 0.4, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-4-Afternoon-1', 'FAC-001', 'APX-CNC-01', '2026-10-16T14:00:00Z', 'Afternoon', 160, 158, 0, 0.4, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-4-Afternoon-2', 'FAC-001', 'APX-CNC-02', '2026-10-16T14:00:00Z', 'Afternoon', 160, 158, 0, 0.4, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-4-Afternoon-3', 'FAC-001', 'APX-CNC-03', '2026-10-16T14:00:00Z', 'Afternoon', 160, 158, 0, 0.4, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-4-Afternoon-4', 'FAC-001', 'APX-CNC-04', '2026-10-16T14:00:00Z', 'Afternoon', 160, 158, 0, 0.4, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-4-Afternoon-5', 'FAC-001', 'APX-CNC-05', '2026-10-16T14:00:00Z', 'Afternoon', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-4-Afternoon-6', 'FAC-001', 'APX-CNC-06', '2026-10-16T14:00:00Z', 'Afternoon', 160, 158, 0, 0.4, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-4-Night-1', 'FAC-001', 'APX-CNC-01', '2026-10-16T22:00:00Z', 'Night', 160, 158, 0, 0.4, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-4-Night-2', 'FAC-001', 'APX-CNC-02', '2026-10-16T22:00:00Z', 'Night', 160, 158, 0, 0.4, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-4-Night-3', 'FAC-001', 'APX-CNC-03', '2026-10-16T22:00:00Z', 'Night', 160, 158, 0, 0.4, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-4-Night-4', 'FAC-001', 'APX-CNC-04', '2026-10-16T22:00:00Z', 'Night', 160, 158, 0, 0.4, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-4-Night-5', 'FAC-001', 'APX-CNC-05', '2026-10-16T22:00:00Z', 'Night', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-4-Night-6', 'FAC-001', 'APX-CNC-06', '2026-10-16T22:00:00Z', 'Night', 160, 158, 0, 0.4, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-5-Morning-1', 'FAC-001', 'APX-CNC-01', '2026-10-17T06:00:00Z', 'Morning', 160, 161, 1, 2.2, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-5-Morning-2', 'FAC-001', 'APX-CNC-02', '2026-10-17T06:00:00Z', 'Morning', 160, 161, 1, 2.2, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-5-Morning-3', 'FAC-001', 'APX-CNC-03', '2026-10-17T06:00:00Z', 'Morning', 160, 161, 1, 2.2, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-5-Morning-4', 'FAC-001', 'APX-CNC-04', '2026-10-17T06:00:00Z', 'Morning', 160, 161, 1, 2.2, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-5-Morning-5', 'FAC-001', 'APX-CNC-05', '2026-10-17T06:00:00Z', 'Morning', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-5-Morning-6', 'FAC-001', 'APX-CNC-06', '2026-10-17T06:00:00Z', 'Morning', 160, 161, 1, 2.2, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-5-Afternoon-1', 'FAC-001', 'APX-CNC-01', '2026-10-17T14:00:00Z', 'Afternoon', 160, 161, 1, 2.2, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-5-Afternoon-2', 'FAC-001', 'APX-CNC-02', '2026-10-17T14:00:00Z', 'Afternoon', 160, 161, 1, 2.2, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-5-Afternoon-3', 'FAC-001', 'APX-CNC-03', '2026-10-17T14:00:00Z', 'Afternoon', 160, 161, 1, 2.2, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-5-Afternoon-4', 'FAC-001', 'APX-CNC-04', '2026-10-17T14:00:00Z', 'Afternoon', 160, 161, 1, 2.2, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-5-Afternoon-5', 'FAC-001', 'APX-CNC-05', '2026-10-17T14:00:00Z', 'Afternoon', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-5-Afternoon-6', 'FAC-001', 'APX-CNC-06', '2026-10-17T14:00:00Z', 'Afternoon', 160, 161, 1, 2.2, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-5-Night-1', 'FAC-001', 'APX-CNC-01', '2026-10-17T22:00:00Z', 'Night', 160, 161, 1, 2.2, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-5-Night-2', 'FAC-001', 'APX-CNC-02', '2026-10-17T22:00:00Z', 'Night', 160, 161, 1, 2.2, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-5-Night-3', 'FAC-001', 'APX-CNC-03', '2026-10-17T22:00:00Z', 'Night', 160, 161, 1, 2.2, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-5-Night-4', 'FAC-001', 'APX-CNC-04', '2026-10-17T22:00:00Z', 'Night', 160, 161, 1, 2.2, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-5-Night-5', 'FAC-001', 'APX-CNC-05', '2026-10-17T22:00:00Z', 'Night', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-5-Night-6', 'FAC-001', 'APX-CNC-06', '2026-10-17T22:00:00Z', 'Night', 160, 161, 1, 2.2, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-6-Morning-1', 'FAC-001', 'APX-CNC-01', '2026-10-18T06:00:00Z', 'Morning', 160, 155, 0, 0.4, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-6-Morning-2', 'FAC-001', 'APX-CNC-02', '2026-10-18T06:00:00Z', 'Morning', 160, 155, 0, 0.4, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-6-Morning-3', 'FAC-001', 'APX-CNC-03', '2026-10-18T06:00:00Z', 'Morning', 160, 155, 0, 0.4, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-6-Morning-4', 'FAC-001', 'APX-CNC-04', '2026-10-18T06:00:00Z', 'Morning', 160, 155, 0, 0.4, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-6-Morning-5', 'FAC-001', 'APX-CNC-05', '2026-10-18T06:00:00Z', 'Morning', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-6-Morning-6', 'FAC-001', 'APX-CNC-06', '2026-10-18T06:00:00Z', 'Morning', 160, 155, 0, 0.4, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-6-Afternoon-1', 'FAC-001', 'APX-CNC-01', '2026-10-18T14:00:00Z', 'Afternoon', 160, 155, 0, 0.4, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-6-Afternoon-2', 'FAC-001', 'APX-CNC-02', '2026-10-18T14:00:00Z', 'Afternoon', 160, 155, 0, 0.4, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-6-Afternoon-3', 'FAC-001', 'APX-CNC-03', '2026-10-18T14:00:00Z', 'Afternoon', 160, 155, 0, 0.4, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-6-Afternoon-4', 'FAC-001', 'APX-CNC-04', '2026-10-18T14:00:00Z', 'Afternoon', 160, 155, 0, 0.4, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-6-Afternoon-5', 'FAC-001', 'APX-CNC-05', '2026-10-18T14:00:00Z', 'Afternoon', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-6-Afternoon-6', 'FAC-001', 'APX-CNC-06', '2026-10-18T14:00:00Z', 'Afternoon', 160, 155, 0, 0.4, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-6-Night-1', 'FAC-001', 'APX-CNC-01', '2026-10-18T22:00:00Z', 'Night', 160, 155, 0, 0.4, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-6-Night-2', 'FAC-001', 'APX-CNC-02', '2026-10-18T22:00:00Z', 'Night', 160, 155, 0, 0.4, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-6-Night-3', 'FAC-001', 'APX-CNC-03', '2026-10-18T22:00:00Z', 'Night', 160, 155, 0, 0.4, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-6-Night-4', 'FAC-001', 'APX-CNC-04', '2026-10-18T22:00:00Z', 'Night', 160, 155, 0, 0.4, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-6-Night-5', 'FAC-001', 'APX-CNC-05', '2026-10-18T22:00:00Z', 'Night', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-6-Night-6', 'FAC-001', 'APX-CNC-06', '2026-10-18T22:00:00Z', 'Night', 160, 155, 0, 0.4, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-7-Morning-1', 'FAC-001', 'APX-CNC-01', '2026-10-19T06:00:00Z', 'Morning', 160, 158, 1, 2.2, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-7-Morning-2', 'FAC-001', 'APX-CNC-02', '2026-10-19T06:00:00Z', 'Morning', 160, 158, 1, 2.2, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-7-Morning-3', 'FAC-001', 'APX-CNC-03', '2026-10-19T06:00:00Z', 'Morning', 160, 158, 1, 2.2, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-7-Morning-4', 'FAC-001', 'APX-CNC-04', '2026-10-19T06:00:00Z', 'Morning', 160, 158, 1, 2.2, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-7-Morning-5', 'FAC-001', 'APX-CNC-05', '2026-10-19T06:00:00Z', 'Morning', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-7-Morning-6', 'FAC-001', 'APX-CNC-06', '2026-10-19T06:00:00Z', 'Morning', 160, 158, 1, 2.2, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-7-Afternoon-1', 'FAC-001', 'APX-CNC-01', '2026-10-19T14:00:00Z', 'Afternoon', 160, 158, 1, 2.2, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-7-Afternoon-2', 'FAC-001', 'APX-CNC-02', '2026-10-19T14:00:00Z', 'Afternoon', 160, 158, 1, 2.2, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-7-Afternoon-3', 'FAC-001', 'APX-CNC-03', '2026-10-19T14:00:00Z', 'Afternoon', 160, 158, 1, 2.2, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-7-Afternoon-4', 'FAC-001', 'APX-CNC-04', '2026-10-19T14:00:00Z', 'Afternoon', 160, 158, 1, 2.2, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-7-Afternoon-5', 'FAC-001', 'APX-CNC-05', '2026-10-19T14:00:00Z', 'Afternoon', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-7-Afternoon-6', 'FAC-001', 'APX-CNC-06', '2026-10-19T14:00:00Z', 'Afternoon', 160, 158, 1, 2.2, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-7-Night-1', 'FAC-001', 'APX-CNC-01', '2026-10-19T22:00:00Z', 'Night', 160, 158, 1, 2.2, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-7-Night-2', 'FAC-001', 'APX-CNC-02', '2026-10-19T22:00:00Z', 'Night', 160, 158, 1, 2.2, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-7-Night-3', 'FAC-001', 'APX-CNC-03', '2026-10-19T22:00:00Z', 'Night', 160, 158, 1, 2.2, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-7-Night-4', 'FAC-001', 'APX-CNC-04', '2026-10-19T22:00:00Z', 'Night', 160, 158, 1, 2.2, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-7-Night-5', 'FAC-001', 'APX-CNC-05', '2026-10-19T22:00:00Z', 'Night', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-7-Night-6', 'FAC-001', 'APX-CNC-06', '2026-10-19T22:00:00Z', 'Night', 160, 158, 1, 2.2, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-8-Morning-1', 'FAC-001', 'APX-CNC-01', '2026-10-20T06:00:00Z', 'Morning', 160, 161, 0, 0.4, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-8-Morning-2', 'FAC-001', 'APX-CNC-02', '2026-10-20T06:00:00Z', 'Morning', 160, 161, 0, 0.4, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-8-Morning-3', 'FAC-001', 'APX-CNC-03', '2026-10-20T06:00:00Z', 'Morning', 160, 161, 0, 0.4, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-8-Morning-4', 'FAC-001', 'APX-CNC-04', '2026-10-20T06:00:00Z', 'Morning', 160, 161, 0, 0.4, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-8-Morning-5', 'FAC-001', 'APX-CNC-05', '2026-10-20T06:00:00Z', 'Morning', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-8-Morning-6', 'FAC-001', 'APX-CNC-06', '2026-10-20T06:00:00Z', 'Morning', 160, 161, 0, 0.4, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-8-Afternoon-1', 'FAC-001', 'APX-CNC-01', '2026-10-20T14:00:00Z', 'Afternoon', 160, 161, 0, 0.4, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-8-Afternoon-2', 'FAC-001', 'APX-CNC-02', '2026-10-20T14:00:00Z', 'Afternoon', 160, 161, 0, 0.4, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-8-Afternoon-3', 'FAC-001', 'APX-CNC-03', '2026-10-20T14:00:00Z', 'Afternoon', 160, 161, 0, 0.4, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-8-Afternoon-4', 'FAC-001', 'APX-CNC-04', '2026-10-20T14:00:00Z', 'Afternoon', 160, 161, 0, 0.4, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-8-Afternoon-5', 'FAC-001', 'APX-CNC-05', '2026-10-20T14:00:00Z', 'Afternoon', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-8-Afternoon-6', 'FAC-001', 'APX-CNC-06', '2026-10-20T14:00:00Z', 'Afternoon', 160, 161, 0, 0.4, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-8-Night-1', 'FAC-001', 'APX-CNC-01', '2026-10-20T22:00:00Z', 'Night', 160, 161, 0, 0.4, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-8-Night-2', 'FAC-001', 'APX-CNC-02', '2026-10-20T22:00:00Z', 'Night', 160, 161, 0, 0.4, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-8-Night-3', 'FAC-001', 'APX-CNC-03', '2026-10-20T22:00:00Z', 'Night', 160, 161, 0, 0.4, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-8-Night-4', 'FAC-001', 'APX-CNC-04', '2026-10-20T22:00:00Z', 'Night', 160, 161, 0, 0.4, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-8-Night-5', 'FAC-001', 'APX-CNC-05', '2026-10-20T22:00:00Z', 'Night', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-8-Night-6', 'FAC-001', 'APX-CNC-06', '2026-10-20T22:00:00Z', 'Night', 160, 161, 0, 0.4, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-9-Morning-1', 'FAC-001', 'APX-CNC-01', '2026-10-21T06:00:00Z', 'Morning', 160, 155, 1, 2.2, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-9-Morning-2', 'FAC-001', 'APX-CNC-02', '2026-10-21T06:00:00Z', 'Morning', 160, 155, 1, 2.2, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-9-Morning-3', 'FAC-001', 'APX-CNC-03', '2026-10-21T06:00:00Z', 'Morning', 160, 155, 1, 2.2, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-9-Morning-4', 'FAC-001', 'APX-CNC-04', '2026-10-21T06:00:00Z', 'Morning', 160, 155, 1, 2.2, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-9-Morning-5', 'FAC-001', 'APX-CNC-05', '2026-10-21T06:00:00Z', 'Morning', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-9-Morning-6', 'FAC-001', 'APX-CNC-06', '2026-10-21T06:00:00Z', 'Morning', 160, 155, 1, 2.2, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-9-Afternoon-1', 'FAC-001', 'APX-CNC-01', '2026-10-21T14:00:00Z', 'Afternoon', 160, 155, 1, 2.2, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-9-Afternoon-2', 'FAC-001', 'APX-CNC-02', '2026-10-21T14:00:00Z', 'Afternoon', 160, 155, 1, 2.2, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-9-Afternoon-3', 'FAC-001', 'APX-CNC-03', '2026-10-21T14:00:00Z', 'Afternoon', 160, 155, 1, 2.2, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-9-Afternoon-4', 'FAC-001', 'APX-CNC-04', '2026-10-21T14:00:00Z', 'Afternoon', 160, 155, 1, 2.2, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-9-Afternoon-5', 'FAC-001', 'APX-CNC-05', '2026-10-21T14:00:00Z', 'Afternoon', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-9-Afternoon-6', 'FAC-001', 'APX-CNC-06', '2026-10-21T14:00:00Z', 'Afternoon', 160, 155, 1, 2.2, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-9-Night-1', 'FAC-001', 'APX-CNC-01', '2026-10-21T22:00:00Z', 'Night', 160, 155, 1, 2.2, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-9-Night-2', 'FAC-001', 'APX-CNC-02', '2026-10-21T22:00:00Z', 'Night', 160, 155, 1, 2.2, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-9-Night-3', 'FAC-001', 'APX-CNC-03', '2026-10-21T22:00:00Z', 'Night', 160, 155, 1, 2.2, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-9-Night-4', 'FAC-001', 'APX-CNC-04', '2026-10-21T22:00:00Z', 'Night', 160, 155, 1, 2.2, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-9-Night-5', 'FAC-001', 'APX-CNC-05', '2026-10-21T22:00:00Z', 'Night', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-9-Night-6', 'FAC-001', 'APX-CNC-06', '2026-10-21T22:00:00Z', 'Night', 160, 155, 1, 2.2, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-10-Morning-1', 'FAC-001', 'APX-CNC-01', '2026-10-22T06:00:00Z', 'Morning', 160, 158, 0, 0.4, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-10-Morning-2', 'FAC-001', 'APX-CNC-02', '2026-10-22T06:00:00Z', 'Morning', 160, 158, 0, 0.4, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-10-Morning-3', 'FAC-001', 'APX-CNC-03', '2026-10-22T06:00:00Z', 'Morning', 160, 158, 0, 0.4, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-10-Morning-4', 'FAC-001', 'APX-CNC-04', '2026-10-22T06:00:00Z', 'Morning', 160, 158, 0, 0.4, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-10-Morning-5', 'FAC-001', 'APX-CNC-05', '2026-10-22T06:00:00Z', 'Morning', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-10-Morning-6', 'FAC-001', 'APX-CNC-06', '2026-10-22T06:00:00Z', 'Morning', 160, 158, 0, 0.4, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-10-Afternoon-1', 'FAC-001', 'APX-CNC-01', '2026-10-22T14:00:00Z', 'Afternoon', 160, 158, 0, 0.4, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-10-Afternoon-2', 'FAC-001', 'APX-CNC-02', '2026-10-22T14:00:00Z', 'Afternoon', 160, 158, 0, 0.4, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-10-Afternoon-3', 'FAC-001', 'APX-CNC-03', '2026-10-22T14:00:00Z', 'Afternoon', 160, 158, 0, 0.4, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-10-Afternoon-4', 'FAC-001', 'APX-CNC-04', '2026-10-22T14:00:00Z', 'Afternoon', 160, 158, 0, 0.4, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-10-Afternoon-5', 'FAC-001', 'APX-CNC-05', '2026-10-22T14:00:00Z', 'Afternoon', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-10-Afternoon-6', 'FAC-001', 'APX-CNC-06', '2026-10-22T14:00:00Z', 'Afternoon', 160, 158, 0, 0.4, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-10-Night-1', 'FAC-001', 'APX-CNC-01', '2026-10-22T22:00:00Z', 'Night', 160, 158, 0, 0.4, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-10-Night-2', 'FAC-001', 'APX-CNC-02', '2026-10-22T22:00:00Z', 'Night', 160, 158, 0, 0.4, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-10-Night-3', 'FAC-001', 'APX-CNC-03', '2026-10-22T22:00:00Z', 'Night', 160, 158, 0, 0.4, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-10-Night-4', 'FAC-001', 'APX-CNC-04', '2026-10-22T22:00:00Z', 'Night', 160, 158, 0, 0.4, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-10-Night-5', 'FAC-001', 'APX-CNC-05', '2026-10-22T22:00:00Z', 'Night', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-10-Night-6', 'FAC-001', 'APX-CNC-06', '2026-10-22T22:00:00Z', 'Night', 160, 158, 0, 0.4, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-11-Morning-1', 'FAC-001', 'APX-CNC-01', '2026-10-23T06:00:00Z', 'Morning', 160, 161, 1, 2.2, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-11-Morning-2', 'FAC-001', 'APX-CNC-02', '2026-10-23T06:00:00Z', 'Morning', 160, 161, 1, 2.2, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-11-Morning-3', 'FAC-001', 'APX-CNC-03', '2026-10-23T06:00:00Z', 'Morning', 160, 161, 1, 2.2, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-11-Morning-4', 'FAC-001', 'APX-CNC-04', '2026-10-23T06:00:00Z', 'Morning', 160, 161, 1, 2.2, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-11-Morning-5', 'FAC-001', 'APX-CNC-05', '2026-10-23T06:00:00Z', 'Morning', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-11-Morning-6', 'FAC-001', 'APX-CNC-06', '2026-10-23T06:00:00Z', 'Morning', 160, 161, 1, 2.2, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-11-Afternoon-1', 'FAC-001', 'APX-CNC-01', '2026-10-23T14:00:00Z', 'Afternoon', 160, 161, 1, 2.2, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-11-Afternoon-2', 'FAC-001', 'APX-CNC-02', '2026-10-23T14:00:00Z', 'Afternoon', 160, 161, 1, 2.2, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-11-Afternoon-3', 'FAC-001', 'APX-CNC-03', '2026-10-23T14:00:00Z', 'Afternoon', 160, 161, 1, 2.2, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-11-Afternoon-4', 'FAC-001', 'APX-CNC-04', '2026-10-23T14:00:00Z', 'Afternoon', 160, 161, 1, 2.2, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-11-Afternoon-5', 'FAC-001', 'APX-CNC-05', '2026-10-23T14:00:00Z', 'Afternoon', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-11-Afternoon-6', 'FAC-001', 'APX-CNC-06', '2026-10-23T14:00:00Z', 'Afternoon', 160, 161, 1, 2.2, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-11-Night-1', 'FAC-001', 'APX-CNC-01', '2026-10-23T22:00:00Z', 'Night', 160, 161, 1, 2.2, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-11-Night-2', 'FAC-001', 'APX-CNC-02', '2026-10-23T22:00:00Z', 'Night', 160, 161, 1, 2.2, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-11-Night-3', 'FAC-001', 'APX-CNC-03', '2026-10-23T22:00:00Z', 'Night', 160, 161, 1, 2.2, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-11-Night-4', 'FAC-001', 'APX-CNC-04', '2026-10-23T22:00:00Z', 'Night', 160, 161, 1, 2.2, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-11-Night-5', 'FAC-001', 'APX-CNC-05', '2026-10-23T22:00:00Z', 'Night', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-11-Night-6', 'FAC-001', 'APX-CNC-06', '2026-10-23T22:00:00Z', 'Night', 160, 161, 1, 2.2, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-12-Morning-1', 'FAC-001', 'APX-CNC-01', '2026-10-24T06:00:00Z', 'Morning', 160, 155, 0, 0.4, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-12-Morning-2', 'FAC-001', 'APX-CNC-02', '2026-10-24T06:00:00Z', 'Morning', 160, 155, 0, 0.4, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-12-Morning-3', 'FAC-001', 'APX-CNC-03', '2026-10-24T06:00:00Z', 'Morning', 160, 155, 0, 0.4, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-12-Morning-4', 'FAC-001', 'APX-CNC-04', '2026-10-24T06:00:00Z', 'Morning', 160, 155, 0, 0.4, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-12-Morning-5', 'FAC-001', 'APX-CNC-05', '2026-10-24T06:00:00Z', 'Morning', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-12-Morning-6', 'FAC-001', 'APX-CNC-06', '2026-10-24T06:00:00Z', 'Morning', 160, 155, 0, 0.4, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-12-Afternoon-1', 'FAC-001', 'APX-CNC-01', '2026-10-24T14:00:00Z', 'Afternoon', 160, 155, 0, 0.4, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-12-Afternoon-2', 'FAC-001', 'APX-CNC-02', '2026-10-24T14:00:00Z', 'Afternoon', 160, 155, 0, 0.4, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-12-Afternoon-3', 'FAC-001', 'APX-CNC-03', '2026-10-24T14:00:00Z', 'Afternoon', 160, 155, 0, 0.4, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-12-Afternoon-4', 'FAC-001', 'APX-CNC-04', '2026-10-24T14:00:00Z', 'Afternoon', 160, 155, 0, 0.4, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-12-Afternoon-5', 'FAC-001', 'APX-CNC-05', '2026-10-24T14:00:00Z', 'Afternoon', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-12-Afternoon-6', 'FAC-001', 'APX-CNC-06', '2026-10-24T14:00:00Z', 'Afternoon', 160, 155, 0, 0.4, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-12-Night-1', 'FAC-001', 'APX-CNC-01', '2026-10-24T22:00:00Z', 'Night', 160, 155, 0, 0.4, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-12-Night-2', 'FAC-001', 'APX-CNC-02', '2026-10-24T22:00:00Z', 'Night', 160, 155, 0, 0.4, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-12-Night-3', 'FAC-001', 'APX-CNC-03', '2026-10-24T22:00:00Z', 'Night', 160, 155, 0, 0.4, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-12-Night-4', 'FAC-001', 'APX-CNC-04', '2026-10-24T22:00:00Z', 'Night', 160, 155, 0, 0.4, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-12-Night-5', 'FAC-001', 'APX-CNC-05', '2026-10-24T22:00:00Z', 'Night', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-12-Night-6', 'FAC-001', 'APX-CNC-06', '2026-10-24T22:00:00Z', 'Night', 160, 155, 0, 0.4, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-13-Morning-1', 'FAC-001', 'APX-CNC-01', '2026-10-25T06:00:00Z', 'Morning', 160, 158, 1, 2.2, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-13-Morning-2', 'FAC-001', 'APX-CNC-02', '2026-10-25T06:00:00Z', 'Morning', 160, 158, 1, 2.2, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-13-Morning-3', 'FAC-001', 'APX-CNC-03', '2026-10-25T06:00:00Z', 'Morning', 160, 158, 1, 2.2, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-13-Morning-4', 'FAC-001', 'APX-CNC-04', '2026-10-25T06:00:00Z', 'Morning', 160, 158, 1, 2.2, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-13-Morning-5', 'FAC-001', 'APX-CNC-05', '2026-10-25T06:00:00Z', 'Morning', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-13-Morning-6', 'FAC-001', 'APX-CNC-06', '2026-10-25T06:00:00Z', 'Morning', 160, 158, 1, 2.2, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-13-Afternoon-1', 'FAC-001', 'APX-CNC-01', '2026-10-25T14:00:00Z', 'Afternoon', 160, 158, 1, 2.2, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-13-Afternoon-2', 'FAC-001', 'APX-CNC-02', '2026-10-25T14:00:00Z', 'Afternoon', 160, 158, 1, 2.2, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-13-Afternoon-3', 'FAC-001', 'APX-CNC-03', '2026-10-25T14:00:00Z', 'Afternoon', 160, 158, 1, 2.2, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-13-Afternoon-4', 'FAC-001', 'APX-CNC-04', '2026-10-25T14:00:00Z', 'Afternoon', 160, 158, 1, 2.2, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-13-Afternoon-5', 'FAC-001', 'APX-CNC-05', '2026-10-25T14:00:00Z', 'Afternoon', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-13-Afternoon-6', 'FAC-001', 'APX-CNC-06', '2026-10-25T14:00:00Z', 'Afternoon', 160, 158, 1, 2.2, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-13-Night-1', 'FAC-001', 'APX-CNC-01', '2026-10-25T22:00:00Z', 'Night', 160, 158, 1, 2.2, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-13-Night-2', 'FAC-001', 'APX-CNC-02', '2026-10-25T22:00:00Z', 'Night', 160, 158, 1, 2.2, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-13-Night-3', 'FAC-001', 'APX-CNC-03', '2026-10-25T22:00:00Z', 'Night', 160, 158, 1, 2.2, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-13-Night-4', 'FAC-001', 'APX-CNC-04', '2026-10-25T22:00:00Z', 'Night', 160, 158, 1, 2.2, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-13-Night-5', 'FAC-001', 'APX-CNC-05', '2026-10-25T22:00:00Z', 'Night', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-13-Night-6', 'FAC-001', 'APX-CNC-06', '2026-10-25T22:00:00Z', 'Night', 160, 158, 1, 2.2, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-14-Morning-1', 'FAC-001', 'APX-CNC-01', '2026-10-26T06:00:00Z', 'Morning', 160, 161, 0, 0.4, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-14-Morning-2', 'FAC-001', 'APX-CNC-02', '2026-10-26T06:00:00Z', 'Morning', 160, 161, 0, 0.4, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-14-Morning-3', 'FAC-001', 'APX-CNC-03', '2026-10-26T06:00:00Z', 'Morning', 160, 161, 0, 0.4, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-14-Morning-4', 'FAC-001', 'APX-CNC-04', '2026-10-26T06:00:00Z', 'Morning', 160, 161, 0, 0.4, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-14-Morning-5', 'FAC-001', 'APX-CNC-05', '2026-10-26T06:00:00Z', 'Morning', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-14-Morning-6', 'FAC-001', 'APX-CNC-06', '2026-10-26T06:00:00Z', 'Morning', 160, 161, 0, 0.4, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-14-Afternoon-1', 'FAC-001', 'APX-CNC-01', '2026-10-26T14:00:00Z', 'Afternoon', 160, 161, 0, 0.4, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-14-Afternoon-2', 'FAC-001', 'APX-CNC-02', '2026-10-26T14:00:00Z', 'Afternoon', 160, 161, 0, 0.4, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-14-Afternoon-3', 'FAC-001', 'APX-CNC-03', '2026-10-26T14:00:00Z', 'Afternoon', 160, 161, 0, 0.4, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-14-Afternoon-4', 'FAC-001', 'APX-CNC-04', '2026-10-26T14:00:00Z', 'Afternoon', 160, 161, 0, 0.4, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-14-Afternoon-5', 'FAC-001', 'APX-CNC-05', '2026-10-26T14:00:00Z', 'Afternoon', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-14-Afternoon-6', 'FAC-001', 'APX-CNC-06', '2026-10-26T14:00:00Z', 'Afternoon', 160, 161, 0, 0.4, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-14-Night-1', 'FAC-001', 'APX-CNC-01', '2026-10-26T22:00:00Z', 'Night', 160, 161, 0, 0.4, 43, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-14-Night-2', 'FAC-001', 'APX-CNC-02', '2026-10-26T22:00:00Z', 'Night', 160, 161, 0, 0.4, 44, 'Gita K.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-14-Night-3', 'FAC-001', 'APX-CNC-03', '2026-10-26T22:00:00Z', 'Night', 160, 161, 0, 0.4, 42, 'Deepak R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-14-Night-4', 'FAC-001', 'APX-CNC-04', '2026-10-26T22:00:00Z', 'Night', 160, 161, 0, 0.4, 43, 'Arun M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-14-Night-5', 'FAC-001', 'APX-CNC-05', '2026-10-26T22:00:00Z', 'Night', 160, 135, 4, 7.6, 44, 'Ramesh V.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-A-14-Night-6', 'FAC-001', 'APX-CNC-06', '2026-10-26T22:00:00Z', 'Night', 160, 161, 0, 0.4, 42, 'Sanjay P.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-1-Morning-1', 'FAC-002', 'NOV-MIL-01', '2026-10-13T06:00:00Z', 'Morning', 140, 136, 1, 2.8, 49, 'Prashant T.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-1-Morning-2', 'FAC-002', 'NOV-MIL-02', '2026-10-13T06:00:00Z', 'Morning', 140, 136, 1, 2.8, 50, 'Sneha R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-1-Morning-3', 'FAC-002', 'NOV-MIL-03', '2026-10-13T06:00:00Z', 'Morning', 140, 136, 1, 2.8, 51, 'Vinod B.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-1-Morning-4', 'FAC-002', 'NOV-MIL-04', '2026-10-13T06:00:00Z', 'Morning', 140, 118, 6, 13.8, 48, 'Sunil M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-1-Morning-5', 'FAC-002', 'NOV-MIL-05', '2026-10-13T06:00:00Z', 'Morning', 140, 136, 1, 2.8, 49, 'Prashant T.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-1-Morning-6', 'FAC-002', 'NOV-MIL-06', '2026-10-13T06:00:00Z', 'Morning', 140, 136, 1, 2.8, 50, 'Sneha R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-1-Afternoon-1', 'FAC-002', 'NOV-MIL-01', '2026-10-13T14:00:00Z', 'Afternoon', 140, 136, 1, 2.8, 49, 'Prashant T.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-1-Afternoon-2', 'FAC-002', 'NOV-MIL-02', '2026-10-13T14:00:00Z', 'Afternoon', 140, 136, 1, 2.8, 50, 'Sneha R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-1-Afternoon-3', 'FAC-002', 'NOV-MIL-03', '2026-10-13T14:00:00Z', 'Afternoon', 140, 136, 1, 2.8, 51, 'Vinod B.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-1-Afternoon-4', 'FAC-002', 'NOV-MIL-04', '2026-10-13T14:00:00Z', 'Afternoon', 140, 118, 6, 13.8, 48, 'Sunil M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-1-Afternoon-5', 'FAC-002', 'NOV-MIL-05', '2026-10-13T14:00:00Z', 'Afternoon', 140, 136, 1, 2.8, 49, 'Prashant T.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-1-Afternoon-6', 'FAC-002', 'NOV-MIL-06', '2026-10-13T14:00:00Z', 'Afternoon', 140, 136, 1, 2.8, 50, 'Sneha R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-1-Night-1', 'FAC-002', 'NOV-MIL-01', '2026-10-13T22:00:00Z', 'Night', 140, 136, 1, 2.8, 49, 'Prashant T.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-1-Night-2', 'FAC-002', 'NOV-MIL-02', '2026-10-13T22:00:00Z', 'Night', 140, 136, 1, 2.8, 50, 'Sneha R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-1-Night-3', 'FAC-002', 'NOV-MIL-03', '2026-10-13T22:00:00Z', 'Night', 140, 136, 1, 2.8, 51, 'Vinod B.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-1-Night-4', 'FAC-002', 'NOV-MIL-04', '2026-10-13T22:00:00Z', 'Night', 140, 118, 6, 13.8, 48, 'Sunil M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-1-Night-5', 'FAC-002', 'NOV-MIL-05', '2026-10-13T22:00:00Z', 'Night', 140, 136, 1, 2.8, 49, 'Prashant T.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-1-Night-6', 'FAC-002', 'NOV-MIL-06', '2026-10-13T22:00:00Z', 'Night', 140, 136, 1, 2.8, 50, 'Sneha R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-2-Morning-1', 'FAC-002', 'NOV-MIL-01', '2026-10-14T06:00:00Z', 'Morning', 140, 138, 2, 5, 49, 'Prashant T.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-2-Morning-2', 'FAC-002', 'NOV-MIL-02', '2026-10-14T06:00:00Z', 'Morning', 140, 138, 2, 5, 50, 'Sneha R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-2-Morning-3', 'FAC-002', 'NOV-MIL-03', '2026-10-14T06:00:00Z', 'Morning', 140, 138, 2, 5, 51, 'Vinod B.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-2-Morning-4', 'FAC-002', 'NOV-MIL-04', '2026-10-14T06:00:00Z', 'Morning', 140, 118, 6, 13.8, 48, 'Sunil M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-2-Morning-5', 'FAC-002', 'NOV-MIL-05', '2026-10-14T06:00:00Z', 'Morning', 140, 138, 2, 5, 49, 'Prashant T.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-2-Morning-6', 'FAC-002', 'NOV-MIL-06', '2026-10-14T06:00:00Z', 'Morning', 140, 138, 2, 5, 50, 'Sneha R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-2-Afternoon-1', 'FAC-002', 'NOV-MIL-01', '2026-10-14T14:00:00Z', 'Afternoon', 140, 138, 2, 5, 49, 'Prashant T.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-2-Afternoon-2', 'FAC-002', 'NOV-MIL-02', '2026-10-14T14:00:00Z', 'Afternoon', 140, 138, 2, 5, 50, 'Sneha R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-2-Afternoon-3', 'FAC-002', 'NOV-MIL-03', '2026-10-14T14:00:00Z', 'Afternoon', 140, 138, 2, 5, 51, 'Vinod B.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-2-Afternoon-4', 'FAC-002', 'NOV-MIL-04', '2026-10-14T14:00:00Z', 'Afternoon', 140, 118, 6, 13.8, 48, 'Sunil M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-2-Afternoon-5', 'FAC-002', 'NOV-MIL-05', '2026-10-14T14:00:00Z', 'Afternoon', 140, 138, 2, 5, 49, 'Prashant T.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-2-Afternoon-6', 'FAC-002', 'NOV-MIL-06', '2026-10-14T14:00:00Z', 'Afternoon', 140, 138, 2, 5, 50, 'Sneha R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-2-Night-1', 'FAC-002', 'NOV-MIL-01', '2026-10-14T22:00:00Z', 'Night', 140, 138, 2, 5, 49, 'Prashant T.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-2-Night-2', 'FAC-002', 'NOV-MIL-02', '2026-10-14T22:00:00Z', 'Night', 140, 138, 2, 5, 50, 'Sneha R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-2-Night-3', 'FAC-002', 'NOV-MIL-03', '2026-10-14T22:00:00Z', 'Night', 140, 138, 2, 5, 51, 'Vinod B.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-2-Night-4', 'FAC-002', 'NOV-MIL-04', '2026-10-14T22:00:00Z', 'Night', 140, 118, 6, 13.8, 48, 'Sunil M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-2-Night-5', 'FAC-002', 'NOV-MIL-05', '2026-10-14T22:00:00Z', 'Night', 140, 138, 2, 5, 49, 'Prashant T.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-2-Night-6', 'FAC-002', 'NOV-MIL-06', '2026-10-14T22:00:00Z', 'Night', 140, 138, 2, 5, 50, 'Sneha R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-3-Morning-1', 'FAC-002', 'NOV-MIL-01', '2026-10-15T06:00:00Z', 'Morning', 140, 140, 0, 0.6, 49, 'Prashant T.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-3-Morning-2', 'FAC-002', 'NOV-MIL-02', '2026-10-15T06:00:00Z', 'Morning', 140, 140, 0, 0.6, 50, 'Sneha R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-3-Morning-3', 'FAC-002', 'NOV-MIL-03', '2026-10-15T06:00:00Z', 'Morning', 140, 140, 0, 0.6, 51, 'Vinod B.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-3-Morning-4', 'FAC-002', 'NOV-MIL-04', '2026-10-15T06:00:00Z', 'Morning', 140, 118, 6, 13.8, 48, 'Sunil M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-3-Morning-5', 'FAC-002', 'NOV-MIL-05', '2026-10-15T06:00:00Z', 'Morning', 140, 140, 0, 0.6, 49, 'Prashant T.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-3-Morning-6', 'FAC-002', 'NOV-MIL-06', '2026-10-15T06:00:00Z', 'Morning', 140, 140, 0, 0.6, 50, 'Sneha R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-3-Afternoon-1', 'FAC-002', 'NOV-MIL-01', '2026-10-15T14:00:00Z', 'Afternoon', 140, 140, 0, 0.6, 49, 'Prashant T.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-3-Afternoon-2', 'FAC-002', 'NOV-MIL-02', '2026-10-15T14:00:00Z', 'Afternoon', 140, 140, 0, 0.6, 50, 'Sneha R.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-3-Afternoon-3', 'FAC-002', 'NOV-MIL-03', '2026-10-15T14:00:00Z', 'Afternoon', 140, 140, 0, 0.6, 51, 'Vinod B.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-3-Afternoon-4', 'FAC-002', 'NOV-MIL-04', '2026-10-15T14:00:00Z', 'Afternoon', 140, 118, 6, 13.8, 48, 'Sunil M.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-3-Afternoon-5', 'FAC-002', 'NOV-MIL-05', '2026-10-15T14:00:00Z', 'Afternoon', 140, 140, 0, 0.6, 49, 'Prashant T.')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, factory_id, machine_id, timestamp, shift, target_units, actual_units, defective_units, scrap_kg, cycle_time_sec, operator)
VALUES ('PRD-B-3-Afternoon-6', 'FAC-002', 'NOV-MIL-06', '2026-10-15T14:00:00Z', 'Afternoon', 140, 140, 0, 0.6, 50, 'Sneha R.')
ON CONFLICT (id) DO NOTHING;

-- End of FactoryOps Schema and Seed Script
