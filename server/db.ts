import crypto from 'crypto';
import type {
  Factory,
  User,
  Machine,
  ProductionRecord,
  MaintenanceRecord,
  Incident,
  WorkOrder,
  SOP,
  DataQualityMetric,
  FactoryKPIs,
  SuperAdminOverview
} from '../src/types/index.ts';

// Password hashing utility with PBKDF2
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const calculated = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(calculated), Buffer.from(hash));
}

// In-Memory Database with multi-factory data
interface StoredUser extends User {
  password_hash: string;
  salt: string;
}

class FactoryOpsDatabase {
  public factories: Factory[] = [];
  public users: StoredUser[] = [];
  public machines: Machine[] = [];
  public production: ProductionRecord[] = [];
  public maintenance: MaintenanceRecord[] = [];
  public incidents: Incident[] = [];
  public workOrders: WorkOrder[] = [];
  public sops: SOP[] = [];
  public dataQuality: DataQualityMetric[] = [];
  public sessions: Map<string, { userId: string; role: string; factoryId: string | null; expiresAt: number }> = new Map();

  constructor() {
    this.seedDatabase();
  }

  private seedDatabase() {
    // 1. Seed the 5 Demo Factories
    this.factories = [
      {
        id: 'FAC-001',
        factory_code: 'APX-01',
        name: 'Apex Precision Manufacturing',
        location: 'Hyderabad, Telangana',
        industry: 'Automotive Components',
        owner_name: 'Rajesh Kumar',
        status: 'Operational',
        capacity: '45,000 units/mo',
        established_year: 2014,
        created_at: '2023-01-15T08:00:00Z',
        last_activity: '10 mins ago'
      },
      {
        id: 'FAC-002',
        factory_code: 'NOV-02',
        name: 'Nova Industrial Systems',
        location: 'Pune, Maharashtra',
        industry: 'Engineering Components',
        owner_name: 'Vikram Malhotra',
        status: 'Operational',
        capacity: '38,000 units/mo',
        established_year: 2017,
        created_at: '2023-03-20T09:30:00Z',
        last_activity: '25 mins ago'
      },
      {
        id: 'FAC-003',
        factory_code: 'VTX-03',
        name: 'Vertex Auto Components',
        location: 'Chennai, Tamil Nadu',
        industry: 'Automotive',
        owner_name: 'Suresh Raman',
        status: 'Operational',
        capacity: '52,000 units/mo',
        established_year: 2011,
        created_at: '2023-05-10T10:15:00Z',
        last_activity: '5 mins ago'
      },
      {
        id: 'FAC-004',
        factory_code: 'PRM-04',
        name: 'PrimeTech Manufacturing',
        location: 'Bengaluru, Karnataka',
        industry: 'Electronics',
        owner_name: 'Ananya Sharma',
        status: 'Production Slowdown',
        capacity: '80,000 units/mo',
        established_year: 2019,
        created_at: '2023-08-01T11:00:00Z',
        last_activity: '1 hour ago'
      },
      {
        id: 'FAC-005',
        factory_code: 'ORN-05',
        name: 'Orion Industrial Works',
        location: 'Coimbatore, Tamil Nadu',
        industry: 'Heavy Engineering',
        owner_name: 'K. Swaminathan',
        status: 'Maintenance Alert',
        capacity: '25,000 units/mo',
        established_year: 2008,
        created_at: '2023-11-12T14:45:00Z',
        last_activity: '40 mins ago'
      }
    ];

    // 2. Seed Users with securely hashed passwords
    const seedUser = (
      id: string,
      name: string,
      email: string,
      plainPass: string,
      role: User['role'],
      factoryId: string | null
    ) => {
      const salt = generateSalt();
      const hash = hashPassword(plainPass, salt);
      const factory = factoryId ? this.factories.find(f => f.id === factoryId) : null;
      this.users.push({
        id,
        name,
        email,
        password_hash: hash,
        salt,
        role,
        factory_id: factoryId,
        factory_name: factory?.name,
        status: 'active',
        created_at: new Date().toISOString()
      });
    };

    // 1. Super Admin
    seedUser('USR-001', 'Super Admin Officer', 'superadmin@factoryops.com', 'SuperAdmin@123', 'SUPER_ADMIN', null);

    // 2. Admins (Primary Role) + Legacy Owner Aliases
    seedUser('USR-002', 'Rajesh Kumar (Plant Admin)', 'admin.apex@factoryops.com', 'Admin@123', 'ADMIN', 'FAC-001');
    seedUser('USR-002L', 'Rajesh Kumar', 'owner.apex@factoryops.com', 'Factory@123', 'ADMIN', 'FAC-001');
    seedUser('USR-003', 'Vikram Malhotra (Plant Admin)', 'admin.nova@factoryops.com', 'Admin@123', 'ADMIN', 'FAC-002');
    seedUser('USR-003L', 'Vikram Malhotra', 'owner.nova@factoryops.com', 'Factory@123', 'ADMIN', 'FAC-002');
    seedUser('USR-004', 'Suresh Raman (Plant Admin)', 'admin.vertex@factoryops.com', 'Admin@123', 'ADMIN', 'FAC-003');
    seedUser('USR-004L', 'Suresh Raman', 'owner.vertex@factoryops.com', 'Factory@123', 'ADMIN', 'FAC-003');
    seedUser('USR-005', 'Ananya Sharma', 'owner.primetech@factoryops.com', 'Factory@123', 'ADMIN', 'FAC-004');
    seedUser('USR-006', 'K. Swaminathan', 'owner.orion@factoryops.com', 'Factory@123', 'ADMIN', 'FAC-005');

    // 3. Manager / Supervisors (Primary Role)
    seedUser('USR-007', 'Amit Deshmukh (Manager/Supervisor)', 'manager.apex@factoryops.com', 'Manager@123', 'MANAGER_SUPERVISOR', 'FAC-001');
    seedUser('USR-008', 'Neha Joshi (Manager/Supervisor)', 'manager.nova@factoryops.com', 'Manager@123', 'MANAGER_SUPERVISOR', 'FAC-002');
    seedUser('USR-009', 'Karthik Raja (Manager/Supervisor)', 'manager.vertex@factoryops.com', 'Manager@123', 'MANAGER_SUPERVISOR', 'FAC-003');
    seedUser('USR-010', 'Rahul Hegde', 'manager.primetech@factoryops.com', 'Manager@123', 'MANAGER_SUPERVISOR', 'FAC-004');
    seedUser('USR-011', 'Manoj Pillai', 'manager.orion@factoryops.com', 'Manager@123', 'MANAGER_SUPERVISOR', 'FAC-005');

    // 4. Technicians (Primary Role)
    seedUser('USR-012', 'Ramesh Varma (Senior Technician)', 'tech.apex@factoryops.com', 'Tech@123', 'TECHNICIAN', 'FAC-001');
    seedUser('USR-013', 'Anil Sharma (Technician)', 'tech.nova@factoryops.com', 'Tech@123', 'TECHNICIAN', 'FAC-002');
    seedUser('USR-014', 'Praveen Nair (Technician)', 'tech.vertex@factoryops.com', 'Tech@123', 'TECHNICIAN', 'FAC-003');

    // 5. Production Planners (Primary Role)
    seedUser('USR-015', 'Priya Sundaram (Production Planner)', 'planner.apex@factoryops.com', 'Planner@123', 'PRODUCTION_PLANNER', 'FAC-001');
    seedUser('USR-016', 'Siddharth Rao (Production Planner)', 'planner.nova@factoryops.com', 'Planner@123', 'PRODUCTION_PLANNER', 'FAC-002');
    seedUser('USR-017', 'Deepa Krishnan (Production Planner)', 'planner.vertex@factoryops.com', 'Planner@123', 'PRODUCTION_PLANNER', 'FAC-003');

    // 3. Seed Factory Operational Data (Machines, Production, Maintenance, Incidents, Work Orders, SOPs)
    this.seedFactoryA(); // Apex (FAC-001) - 15 machines, Auto components
    this.seedFactoryB(); // Nova (FAC-002) - 18 machines, Engineering
    this.seedFactoryC(); // Vertex (FAC-003) - 16 machines, Auto
    this.seedFactoryD(); // PrimeTech (FAC-004) - 20 machines, Electronics
    this.seedFactoryE(); // Orion (FAC-005) - 12 machines, Heavy Eng
  }

  // --- SEED FACTORY A: Apex Precision Manufacturing (FAC-001) ---
  private seedFactoryA() {
    const factoryId = 'FAC-001';
    const lines = ['Engine Block Line A', 'Transmission Line B', 'Chassis Line C'];
    const operators = ['Ramesh V.', 'Sanjay P.', 'Gita K.', 'Deepak R.', 'Arun M.'];

    // 15 Machines
    const machineTypes = [
      { prefix: 'APX-CNC', type: '5-Axis CNC Milling', count: 6, line: lines[0] },
      { prefix: 'APX-PRS', type: 'Hydraulic Stamping Press 500T', count: 4, line: lines[1] },
      { prefix: 'APX-ROB', type: '6-Axis Robotic Welder', count: 3, line: lines[2] },
      { prefix: 'APX-CMM', type: 'Coordinate Measuring Machine', count: 1, line: lines[0] },
      { prefix: 'APX-WLD', type: 'Laser Welding Cell', count: 1, line: lines[2] },
    ];

    let mIdx = 1;
    for (const group of machineTypes) {
      for (let i = 1; i <= group.count; i++) {
        const machineId = `${group.prefix}-${String(i).padStart(2, '0')}`;
        // Status distribution: 12 running, 2 warning, 1 maintenance
        let status: Machine['status'] = 'running';
        let health = 92 - (mIdx % 5);
        let temp = 62 + (mIdx * 1.5) % 15;
        let vib = 1.8 + (mIdx * 0.2) % 1.5;
        let oee = 88.5 + ((mIdx * 3) % 8) - 2;

        if (mIdx === 7) {
          status = 'warning';
          health = 74;
          temp = 81.5;
          vib = 3.8;
          oee = 79.2;
        } else if (mIdx === 12) {
          status = 'warning';
          health = 71;
          temp = 83.0;
          vib = 4.1;
          oee = 76.5;
        } else if (mIdx === 15) {
          status = 'maintenance';
          health = 58;
          temp = 42.0;
          vib = 0.5;
          oee = 0;
        }

        this.machines.push({
          id: `M-A${mIdx}`,
          factory_id: factoryId,
          machine_id: machineId,
          name: `${group.type} #${i}`,
          type: group.type,
          line: group.line,
          status,
          health_score: health,
          temperature_c: Math.round(temp * 10) / 10,
          vibration_mms: Math.round(vib * 10) / 10,
          pressure_bar: Math.round((5.8 + (mIdx % 3) * 0.4) * 10) / 10,
          speed_rpm: 1450 + (mIdx % 4) * 50,
          oee: Math.round(oee * 10) / 10,
          operator: operators[(mIdx - 1) % operators.length],
          install_date: '2021-04-12',
          last_service_date: '2026-09-18'
        });
        mIdx++;
      }
    }

    // Production Records for Apex
    const shifts: ('Morning' | 'Afternoon' | 'Night')[] = ['Morning', 'Afternoon', 'Night'];
    for (let day = 1; day <= 14; day++) {
      const dateStr = new Date(Date.now() - (14 - day) * 86400000).toISOString().split('T')[0];
      for (const shift of shifts) {
        for (let m = 1; m <= 6; m++) {
          const mId = `APX-CNC-0${m}`;
          const target = 160;
          const actual = m === 5 ? 135 : 155 + (day % 3) * 3;
          const defective = m === 5 ? 4 : (day % 2);
          this.production.push({
            id: `PRD-A-${day}-${shift}-${m}`,
            factory_id: factoryId,
            machine_id: mId,
            timestamp: `${dateStr}T${shift === 'Morning' ? '06:00:00' : shift === 'Afternoon' ? '14:00:00' : '22:00:00'}Z`,
            shift,
            target_units: target,
            actual_units: actual,
            defective_units: defective,
            scrap_kg: Math.round((defective * 1.8 + 0.4) * 10) / 10,
            cycle_time_sec: 42 + (m % 3),
            operator: operators[m % operators.length]
          });
        }
      }
    }

    // Incidents for Apex
    this.incidents.push(
      {
        id: 'INC-A01',
        incident_id: 'INC-2026-0104',
        factory_id: factoryId,
        machine_id: 'APX-PRS-03',
        title: 'Hydraulic Seal Micro-leakage & Pressure Drop',
        description: 'Intermittent pressure drops noticed on valve block manifold. Pressure fluctuated between 4.2 and 5.9 bar.',
        severity: 'Medium',
        status: 'Investigating',
        reported_by: 'Sanjay P.',
        reported_at: '2026-10-05T14:22:00Z',
        root_cause: 'Seal wear at primary piston fitting under high thermal cycle.'
      },
      {
        id: 'INC-A02',
        incident_id: 'INC-2026-0098',
        factory_id: factoryId,
        machine_id: 'APX-CNC-04',
        title: 'Spindle Bearing Thermal Warning (>82°C)',
        description: 'Vibration frequency anomaly detected on axis Z with thermal buildup exceeding standard threshold.',
        severity: 'High',
        status: 'Open',
        reported_by: 'Ramesh V.',
        reported_at: '2026-10-06T01:10:00Z'
      },
      {
        id: 'INC-A03',
        incident_id: 'INC-2026-0087',
        factory_id: factoryId,
        machine_id: 'APX-ROB-02',
        title: 'Welding Torch Tip Cladding Oxidation',
        description: 'Automated torch cleaner nozzle blockage caused partial cladding splatter.',
        severity: 'Low',
        status: 'Resolved',
        reported_by: 'Deepak R.',
        reported_at: '2026-10-04T09:15:00Z',
        resolved_at: '2026-10-04T16:30:00Z',
        root_cause: 'Gas shield flow restrictor clogged.',
        resolution_notes: 'Cleaned nozzle, calibrated gas mix, passed QA verification.'
      }
    );

    // Maintenance for Apex
    this.maintenance.push(
      {
        id: 'MNT-A01',
        factory_id: factoryId,
        machine_id: 'APX-WLD-01',
        type: 'Preventive',
        status: 'In Progress',
        scheduled_date: '2026-10-06',
        technician: 'Kishore B. (Senior Tech)',
        description: 'Bi-annual optics calibration, chiller flush, and laser power meter alignment.',
        cost_usd: 1250,
        downtime_hours: 4.5
      },
      {
        id: 'MNT-A02',
        factory_id: factoryId,
        machine_id: 'APX-CNC-02',
        type: 'Predictive',
        status: 'Scheduled',
        scheduled_date: '2026-10-08',
        technician: 'Anil S.',
        description: 'Spindle vibration harmonic analysis and grease replenishing.',
        cost_usd: 480,
        downtime_hours: 2.0
      },
      {
        id: 'MNT-A03',
        factory_id: factoryId,
        machine_id: 'APX-PRS-01',
        type: 'Preventive',
        status: 'Completed',
        scheduled_date: '2026-09-30',
        completed_date: '2026-09-30',
        technician: 'Kishore B.',
        description: 'Filter replacement, hydraulic fluid flush, pressure transducer zeroing.',
        cost_usd: 820,
        downtime_hours: 3.0
      }
    );

    // Work Orders for Apex
    this.workOrders.push(
      {
        id: 'WO-A01',
        work_order_id: 'WO-2026-0412',
        factory_id: factoryId,
        machine_id: 'APX-CNC-04',
        title: 'Spindle Bearing Re-alignment and Lubricant Purge',
        priority: 'High',
        status: 'In Progress',
        assigned_to: 'Ramesh Varma (Senior Technician)',
        due_date: '2026-10-18',
        created_at: '2026-10-06T02:00:00Z',
        estimated_hours: 4,
        parts_required: 'SKF Ceramic Hybrid Bearing Set, Mobil Vactra #2'
      },
      {
        id: 'WO-A02',
        work_order_id: 'WO-2026-0395',
        factory_id: factoryId,
        machine_id: 'APX-PRS-03',
        title: 'Manifold High-Pressure O-Ring Seal Replacement',
        priority: 'Critical',
        status: 'In Progress',
        assigned_to: 'Ramesh Varma (Senior Technician)',
        due_date: '2026-10-11', // Overdue (earlier than today Oct 14)
        created_at: '2026-10-05T15:30:00Z',
        estimated_hours: 3,
        parts_required: 'Viton 90 Durometer High-Temp Seal Kit'
      },
      {
        id: 'WO-A03',
        work_order_id: 'WO-2026-0380',
        factory_id: factoryId,
        machine_id: 'APX-CMM-01',
        title: 'Granite Table Levelling & Laser Interferometer Verification',
        priority: 'Low',
        status: 'Completed',
        assigned_to: 'Ramesh Varma (Senior Technician)',
        due_date: '2026-10-02',
        created_at: '2026-09-29T10:00:00Z',
        completed_at: '2026-10-01T17:00:00Z',
        estimated_hours: 6,
        actual_hours: 5.5
      },
      {
        id: 'WO-A04',
        work_order_id: 'WO-2026-0428',
        factory_id: factoryId,
        machine_id: 'APX-ROB-02',
        title: 'Robotic Arm Axis 4 Servo Harmonic Drive Greasing',
        priority: 'Medium',
        status: 'Pending',
        assigned_to: 'Ramesh Varma (Senior Technician)',
        due_date: '2026-10-16',
        created_at: '2026-10-12T08:00:00Z',
        estimated_hours: 2,
        parts_required: 'Harmonic grease cartridge, Seal ring'
      },
      {
        id: 'WO-A05',
        work_order_id: 'WO-2026-0435',
        factory_id: factoryId,
        machine_id: 'APX-WLD-01',
        title: 'Fiber Laser Optic Chiller De-ionizing Filter Exchange',
        priority: 'High',
        status: 'Pending',
        assigned_to: 'Anil S.',
        due_date: '2026-10-15',
        created_at: '2026-10-13T11:20:00Z',
        estimated_hours: 2.5,
        parts_required: '0.2 Micron Chiller Cartridge'
      }
    );

    // SOPs for Apex
    this.sops.push(
      {
        id: 'SOP-A01',
        sop_id: 'SOP-CNC-501',
        factory_id: factoryId,
        title: '5-Axis CNC Milling Warm-up and Zero Referencing Protocol',
        machine_type: '5-Axis CNC Milling',
        category: 'Operating Procedure',
        version: 'v3.2',
        last_updated: '2026-08-15',
        author: 'Chief Process Engineer',
        steps: [
          'Verify pneumatic supply pressure is stabilized above 6.0 bar before powering control cabinet.',
          'Execute spindle low-RPM ramp-up sequence (500 RPM -> 3000 RPM over 8 minutes) to distribute lubricant.',
          'Engage automatic tool length measurement probe and confirm stylus runout is < 0.003mm.',
          'Reference G54 datum using electronic touch-probe against hardened fixture gauge.'
        ],
        safety_precautions: [
          'Safety enclosure interlock must never be bypassed during spindle test cycles.',
          'Always wear Class 1 impact-resistant eye protection and anti-slip safety footwear.'
        ],
        target_audience: 'CNC Machinists & Machine Operators'
      },
      {
        id: 'SOP-A02',
        sop_id: 'SOP-PRS-204',
        factory_id: factoryId,
        title: 'Hydraulic Stamping Press 500T Die Setup & Pressure Relief Procedure',
        machine_type: 'Hydraulic Stamping Press 500T',
        category: 'Safety Protocol',
        version: 'v2.1',
        last_updated: '2026-07-20',
        author: 'Safety Director',
        steps: [
          'Lockout/Tagout (LOTO) main 415V electrical breaker and bleed residual hydraulic cylinder energy.',
          'Inspect die bolsters and clamp bolts with calibrated torque wrench (450 Nm).',
          'Align photoelectric light curtains and perform mandatory break-test before releasing interlocks.',
          'Perform initial slow-stroke test with sacrificial aluminum blank to inspect draw depth.'
        ],
        safety_precautions: [
          'Two-hand anti-tie-down control stations must be tested before every shift.',
          'Die safety blocks must be physically placed under the ram during tooling adjustment.'
        ],
        target_audience: 'Press Operators & Tool-and-Die Technicians'
      }
    );

    // Data Quality for Apex
    this.dataQuality.push(
      {
        id: 'DQ-A01',
        factory_id: factoryId,
        sensor_name: 'Spindle Temperature & Accelerometer Bus',
        machine_id: 'APX-CNC-01',
        uptime_percentage: 99.8,
        data_completeness_pct: 99.4,
        latency_ms: 18,
        anomalies_detected: 0,
        status: 'Healthy',
        last_sync: '12 seconds ago'
      },
      {
        id: 'DQ-A02',
        factory_id: factoryId,
        sensor_name: 'Hydraulic Pressure Transducer',
        machine_id: 'APX-PRS-03',
        uptime_percentage: 98.2,
        data_completeness_pct: 97.1,
        latency_ms: 45,
        anomalies_detected: 2,
        status: 'Degraded',
        last_sync: '45 seconds ago'
      }
    );
  }

  // --- SEED FACTORY B: Nova Industrial Systems (FAC-002) ---
  private seedFactoryB() {
    const factoryId = 'FAC-002';
    const lines = ['Turbine Blades Line 1', 'Heavy Gearboxes Line 2', 'Precision Shafts Line 3'];
    const operators = ['Sunil M.', 'Prashant T.', 'Sneha R.', 'Vinod B.'];

    // 18 Machines
    const machineTypes = [
      { prefix: 'NOV-MIL', type: 'Vertical Machining Center', count: 6, line: lines[0] },
      { prefix: 'NOV-LTH', type: 'Heavy Duty CNC Lathe', count: 6, line: lines[1] },
      { prefix: 'NOV-GRD', type: 'Cylindrical Surface Grinder', count: 4, line: lines[2] },
      { prefix: 'NOV-ASM', type: 'Robotic Gearbox Assembly Station', count: 2, line: lines[1] }
    ];

    let mIdx = 1;
    for (const group of machineTypes) {
      for (let i = 1; i <= group.count; i++) {
        const machineId = `${group.prefix}-${String(i).padStart(2, '0')}`;
        let status: Machine['status'] = 'running';
        let health = 88 - (mIdx % 6);
        let temp = 65 + (mIdx * 1.8) % 18;
        let vib = 2.1 + (mIdx * 0.25) % 1.8;
        let oee = 84.0 + ((mIdx * 2.5) % 7) - 2;

        if (mIdx === 4) {
          status = 'warning';
          health = 73;
          temp = 79.4;
          vib = 3.9;
          oee = 78.1;
        } else if (mIdx === 9) {
          status = 'warning';
          health = 75;
          temp = 81.2;
          vib = 4.2;
          oee = 75.8;
        } else if (mIdx === 14) {
          status = 'warning';
          health = 70;
          temp = 83.5;
          vib = 4.4;
          oee = 74.2;
        } else if (mIdx === 18) {
          status = 'maintenance';
          health = 54;
          temp = 38.0;
          vib = 0.2;
          oee = 0;
        }

        this.machines.push({
          id: `M-B${mIdx}`,
          factory_id: factoryId,
          machine_id: machineId,
          name: `${group.type} #${i}`,
          type: group.type,
          line: group.line,
          status,
          health_score: health,
          temperature_c: Math.round(temp * 10) / 10,
          vibration_mms: Math.round(vib * 10) / 10,
          pressure_bar: Math.round((6.1 + (mIdx % 3) * 0.3) * 10) / 10,
          speed_rpm: 1200 + (mIdx % 5) * 80,
          oee: Math.round(oee * 10) / 10,
          operator: operators[(mIdx - 1) % operators.length],
          install_date: '2020-08-19',
          last_service_date: '2026-09-12'
        });
        mIdx++;
      }
    }

    // Production for Nova
    for (let day = 1; day <= 14; day++) {
      const dateStr = new Date(Date.now() - (14 - day) * 86400000).toISOString().split('T')[0];
      for (const shift of ['Morning', 'Afternoon', 'Night'] as const) {
        for (let m = 1; m <= 6; m++) {
          const mId = `NOV-MIL-0${m}`;
          const target = 140;
          const actual = m === 4 ? 118 : 134 + (day % 4) * 2;
          const defective = m === 4 ? 6 : (day % 3);
          this.production.push({
            id: `PRD-B-${day}-${shift}-${m}`,
            factory_id: factoryId,
            machine_id: mId,
            timestamp: `${dateStr}T${shift === 'Morning' ? '06:00:00' : shift === 'Afternoon' ? '14:00:00' : '22:00:00'}Z`,
            shift,
            target_units: target,
            actual_units: actual,
            defective_units: defective,
            scrap_kg: Math.round((defective * 2.2 + 0.6) * 10) / 10,
            cycle_time_sec: 48 + (m % 4),
            operator: operators[m % operators.length]
          });
        }
      }
    }

    // Incidents for Nova
    this.incidents.push(
      {
        id: 'INC-B01',
        incident_id: 'INC-2026-0210',
        factory_id: factoryId,
        machine_id: 'NOV-LTH-03',
        title: 'Chucking Hydraulic Pressure Deviation',
        description: 'Automatic bar feeder reported clamping pressure drop below 35 bar minimum threshold.',
        severity: 'High',
        status: 'Open',
        reported_by: 'Sunil M.',
        reported_at: '2026-10-06T03:15:00Z'
      },
      {
        id: 'INC-B02',
        incident_id: 'INC-2026-0205',
        factory_id: factoryId,
        machine_id: 'NOV-GRD-02',
        title: 'Coolant Flow Rate Sensor Stoppage',
        description: 'Flow meter indicated zero flow while pump motor remained energized. Preventative interlock tripped.',
        severity: 'Medium',
        status: 'Investigating',
        reported_by: 'Prashant T.',
        reported_at: '2026-10-05T18:40:00Z',
        root_cause: 'Particulate sludge clogging fine mesh suction strainer.'
      }
    );

    // Maintenance for Nova
    this.maintenance.push(
      {
        id: 'MNT-B01',
        factory_id: factoryId,
        machine_id: 'NOV-ASM-02',
        type: 'Predictive',
        status: 'Scheduled',
        scheduled_date: '2026-10-09',
        technician: 'Sagar N.',
        description: 'Harmonic drive backlash calibration on wrist axes J4 & J5.',
        cost_usd: 950,
        downtime_hours: 3.5
      },
      {
        id: 'MNT-B02',
        factory_id: factoryId,
        machine_id: 'NOV-LTH-01',
        type: 'Preventive',
        status: 'Completed',
        scheduled_date: '2026-09-28',
        completed_date: '2026-09-28',
        technician: 'Sagar N.',
        description: 'Turret index coupling alignment and hydraulic filter swap.',
        cost_usd: 620,
        downtime_hours: 2.5
      }
    );

    // Work Orders for Nova
    this.workOrders.push(
      {
        id: 'WO-B01',
        work_order_id: 'WO-2026-0501',
        factory_id: factoryId,
        machine_id: 'NOV-LTH-03',
        title: 'Chuck Cylinder Rotary Joint Seal Inspection',
        priority: 'High',
        status: 'Pending',
        assigned_to: 'Sagar N.',
        due_date: '2026-10-07',
        created_at: '2026-10-06T03:30:00Z',
        estimated_hours: 3.5,
        parts_required: 'Kitagawa Hydraulic Cylinder Rotary Joint Kit'
      },
      {
        id: 'WO-B02',
        work_order_id: 'WO-2026-0488',
        factory_id: factoryId,
        machine_id: 'NOV-GRD-02',
        title: 'Coolant Sump Ultrasonic Cleaning & Micron Filter Renewal',
        priority: 'Medium',
        status: 'In Progress',
        assigned_to: 'Maintenance Crew B',
        due_date: '2026-10-06',
        created_at: '2026-10-05T19:00:00Z',
        estimated_hours: 2.0,
        parts_required: '10 Micron Bag Filters x 4, Castrol Hysol Coolant 50L'
      }
    );

    // SOPs for Nova
    this.sops.push(
      {
        id: 'SOP-B01',
        sop_id: 'SOP-LTH-301',
        factory_id: factoryId,
        title: 'Heavy CNC Lathe Chuck Pressure Verification and Hard Jaw Boring',
        machine_type: 'Heavy Duty CNC Lathe',
        category: 'Operating Procedure',
        version: 'v2.0',
        last_updated: '2026-09-01',
        author: 'Lead Tooling Specialist',
        steps: [
          'Verify gripping force using dynamic wireless chuck force gauge at 1500 RPM.',
          'Clock soft jaws with dial indicator to ensure concentricity within 0.015mm.',
          'Execute pre-programmed boring cycle with light 0.2mm depth-of-cut pass.'
        ],
        safety_precautions: [
          'Never leave chuck wrench in chuck under any circumstance.',
          'Ensure chip conveyor is running and interlocked before starting cycle.'
        ],
        target_audience: 'Lathe Operators'
      }
    );

    // Data Quality for Nova
    this.dataQuality.push({
      id: 'DQ-B01',
      factory_id: factoryId,
      sensor_name: 'Vibration & Acoustic Emission Array',
      machine_id: 'NOV-MIL-01',
      uptime_percentage: 99.1,
      data_completeness_pct: 98.7,
      latency_ms: 22,
      anomalies_detected: 1,
      status: 'Healthy',
      last_sync: '18 seconds ago'
    });
  }

  // --- SEED FACTORY C: Vertex Auto Components (FAC-003) ---
  private seedFactoryC() {
    const factoryId = 'FAC-003';
    const lines = ['Body Shop Line', 'Paint Shop Line', 'Final Assembly Line'];
    const operators = ['Murugan C.', 'Jayanthi S.', 'Venkatesh P.'];

    // 16 Machines
    const machineTypes = [
      { prefix: 'VTX-STP', type: 'Progressive Stamping Press', count: 5, line: lines[0] },
      { prefix: 'VTX-ROB', type: 'Spot Welding Robot', count: 5, line: lines[0] },
      { prefix: 'VTX-PNT', type: 'Automated Electrostatic Paint Booth', count: 3, line: lines[1] },
      { prefix: 'VTX-QC', type: 'Automated Optical Inspection Cell', count: 3, line: lines[2] }
    ];

    let mIdx = 1;
    for (const group of machineTypes) {
      for (let i = 1; i <= group.count; i++) {
        const machineId = `${group.prefix}-${String(i).padStart(2, '0')}`;
        let status: Machine['status'] = 'running';
        let health = 94 - (mIdx % 5);
        let oee = 90.0 + ((mIdx * 1.5) % 5);

        if (mIdx === 6) {
          status = 'warning';
          health = 77;
          oee = 83.2;
        } else if (mIdx === 16) {
          status = 'maintenance';
          health = 60;
          oee = 0;
        }

        this.machines.push({
          id: `M-C${mIdx}`,
          factory_id: factoryId,
          machine_id: machineId,
          name: `${group.type} #${i}`,
          type: group.type,
          line: group.line,
          status,
          health_score: health,
          temperature_c: Math.round((55 + (mIdx % 10)) * 10) / 10,
          vibration_mms: Math.round((1.4 + (mIdx % 5) * 0.2) * 10) / 10,
          pressure_bar: 5.5,
          speed_rpm: 1500,
          oee: Math.round(oee * 10) / 10,
          operator: operators[(mIdx - 1) % operators.length],
          install_date: '2022-02-14',
          last_service_date: '2026-09-24'
        });
        mIdx++;
      }
    }

    // Incidents for Vertex
    this.incidents.push({
      id: 'INC-C01',
      incident_id: 'INC-2026-0301',
      factory_id: factoryId,
      machine_id: 'VTX-ROB-03',
      title: 'Spot Welder Current Density Fluctuation',
      description: 'Secondary current dropped by 8% during outer door panel tack sequence.',
      severity: 'Medium',
      status: 'Open',
      reported_by: 'Murugan C.',
      reported_at: '2026-10-06T00:45:00Z'
    });

    // Work Orders for Vertex
    this.workOrders.push({
      id: 'WO-C01',
      work_order_id: 'WO-2026-0610',
      factory_id: factoryId,
      machine_id: 'VTX-ROB-03',
      title: 'Electrode Tip Dresser Maintenance and Transformer Check',
      priority: 'Medium',
      status: 'Pending',
      assigned_to: 'R. Balaji',
      due_date: '2026-10-08',
      created_at: '2026-10-06T01:00:00Z',
      estimated_hours: 2.5
    });

    // Maintenance for Vertex
    this.maintenance.push({
      id: 'MNT-C01',
      factory_id: factoryId,
      machine_id: 'VTX-PNT-01',
      type: 'Preventive',
      status: 'Completed',
      scheduled_date: '2026-10-01',
      completed_date: '2026-10-01',
      technician: 'R. Balaji',
      description: 'Electrostatic atomizer bell cup cleaning and voltage curve audit.',
      cost_usd: 1100,
      downtime_hours: 3.0
    });

    // SOPs for Vertex
    this.sops.push({
      id: 'SOP-C01',
      sop_id: 'SOP-WLD-101',
      factory_id: factoryId,
      title: 'Robotic Spot Welding Tip Dressing & Force Calibration Protocol',
      machine_type: 'Spot Welding Robot',
      category: 'Quality Inspection',
      version: 'v1.4',
      last_updated: '2026-08-10',
      author: 'Body Shop Quality Lead',
      steps: [
        'Inspect electrode cap wear profile with optical gauge.',
        'Run auto-dress cycle for 1.8 seconds.',
        'Validate clamp force with calibrated load cell.'
      ],
      safety_precautions: ['Ensure robot cell gate is e-stopped during cell entry.'],
      target_audience: 'Robotics Technicians'
    });

    // Data Quality for Vertex
    this.dataQuality.push({
      id: 'DQ-C01',
      factory_id: factoryId,
      sensor_name: 'Current Transformer Telemetry Bus',
      machine_id: 'VTX-ROB-01',
      uptime_percentage: 99.9,
      data_completeness_pct: 99.8,
      latency_ms: 12,
      anomalies_detected: 0,
      status: 'Healthy',
      last_sync: '5 seconds ago'
    });
  }

  // --- SEED FACTORY D: PrimeTech Manufacturing (FAC-004) ---
  private seedFactoryD() {
    const factoryId = 'FAC-004';
    const lines = ['SMT High-Speed Line 1', 'SMT High-Speed Line 2', 'Testing & Packaging Line'];
    const operators = ['Pooja N.', 'Chethan K.', 'Divya S.'];

    // 20 Machines
    const machineTypes = [
      { prefix: 'PRM-SMT', type: 'High-Speed SMT Pick & Place', count: 8, line: lines[0] },
      { prefix: 'PRM-AOI', type: '3D Automated Optical Inspection', count: 4, line: lines[1] },
      { prefix: 'PRM-RFL', type: 'Nitrogen Reflow Oven 12-Zone', count: 4, line: lines[1] },
      { prefix: 'PRM-TST', type: 'In-Circuit ICT / Functional Tester', count: 4, line: lines[2] }
    ];

    let mIdx = 1;
    for (const group of machineTypes) {
      for (let i = 1; i <= group.count; i++) {
        const machineId = `${group.prefix}-${String(i).padStart(2, '0')}`;
        let status: Machine['status'] = 'running';
        let health = 85 - (mIdx % 7);
        let oee = 78.0 + ((mIdx * 1.8) % 6);

        if (mIdx === 2 || mIdx === 7 || mIdx === 11 || mIdx === 15) {
          status = 'warning';
          health = 71;
          oee = 72.5;
        } else if (mIdx === 20) {
          status = 'maintenance';
          health = 52;
          oee = 0;
        }

        this.machines.push({
          id: `M-D${mIdx}`,
          factory_id: factoryId,
          machine_id: machineId,
          name: `${group.type} #${i}`,
          type: group.type,
          line: group.line,
          status,
          health_score: health,
          temperature_c: Math.round((48 + (mIdx % 8)) * 10) / 10,
          vibration_mms: 0.8,
          pressure_bar: 6.0,
          speed_rpm: 2800,
          oee: Math.round(oee * 10) / 10,
          operator: operators[(mIdx - 1) % operators.length],
          install_date: '2023-01-10',
          last_service_date: '2026-09-10'
        });
        mIdx++;
      }
    }

    // Incidents for PrimeTech
    this.incidents.push({
      id: 'INC-D01',
      incident_id: 'INC-2026-0415',
      factory_id: factoryId,
      machine_id: 'PRM-SMT-02',
      title: 'Feeder Reel Feeder Jamming Error 402',
      description: 'Component mispick rate exceeded 0.05% on 0201 capacitor reels.',
      severity: 'Medium',
      status: 'Open',
      reported_by: 'Pooja N.',
      reported_at: '2026-10-06T02:30:00Z'
    });

    // Work Orders for PrimeTech
    this.workOrders.push({
      id: 'WO-D01',
      work_order_id: 'WO-2026-0720',
      factory_id: factoryId,
      machine_id: 'PRM-SMT-02',
      title: 'Vacuum Nozzle Ultrasonic Cleaning & Feeder Calibration',
      priority: 'High',
      status: 'In Progress',
      assigned_to: 'Naveen K.',
      due_date: '2026-10-06',
      created_at: '2026-10-06T02:45:00Z',
      estimated_hours: 1.5
    });

    // Maintenance for PrimeTech
    this.maintenance.push({
      id: 'MNT-D01',
      factory_id: factoryId,
      machine_id: 'PRM-RFL-01',
      type: 'Preventive',
      status: 'Completed',
      scheduled_date: '2026-09-29',
      completed_date: '2026-09-29',
      technician: 'Naveen K.',
      description: 'Flux condensation collector cleanout and thermal profile audit.',
      cost_usd: 750,
      downtime_hours: 2.0
    });

    // SOPs for PrimeTech
    this.sops.push({
      id: 'SOP-D01',
      sop_id: 'SOP-SMT-401',
      factory_id: factoryId,
      title: 'SMT Feeder Setup and Solder Paste Height Inspection',
      machine_type: 'High-Speed SMT Pick & Place',
      category: 'Operating Procedure',
      version: 'v4.1',
      last_updated: '2026-09-15',
      author: 'SMT Process Lead',
      steps: [
        'Scan QR barcode on component reel and verify BOM line.',
        'Apply solder paste with stainless stencil (120 micron).',
        'Verify paste volume on SPI system before releasing PCB.'
      ],
      safety_precautions: ['ESD wrist strap and anti-static smock mandatory.'],
      target_audience: 'SMT Line Operators'
    });

    // Data Quality for PrimeTech
    this.dataQuality.push({
      id: 'DQ-D01',
      factory_id: factoryId,
      sensor_name: 'Feeder Vacuum Pressure Sensor Bus',
      machine_id: 'PRM-SMT-01',
      uptime_percentage: 97.5,
      data_completeness_pct: 96.2,
      latency_ms: 35,
      anomalies_detected: 4,
      status: 'Degraded',
      last_sync: '30 seconds ago'
    });
  }

  // --- SEED FACTORY E: Orion Industrial Works (FAC-005) ---
  private seedFactoryE() {
    const factoryId = 'FAC-005';
    const lines = ['Heavy Forging Line', 'Precision Machining Line'];
    const operators = ['Kuppuswamy R.', 'Dhandapani M.', 'Palanisamy V.'];

    // 12 Machines
    const machineTypes = [
      { prefix: 'ORN-FRG', type: 'Hydraulic Open-Die Forging Press 2000T', count: 4, line: lines[0] },
      { prefix: 'ORN-TRN', type: 'Heavy Vertical Boring Mill', count: 4, line: lines[1] },
      { prefix: 'ORN-PLN', type: 'Double-Housing Planer Mill', count: 2, line: lines[1] },
      { prefix: 'ORN-QC', type: 'Ultrasonic Flaw Detector & CMM', count: 2, line: lines[1] }
    ];

    let mIdx = 1;
    for (const group of machineTypes) {
      for (let i = 1; i <= group.count; i++) {
        const machineId = `${group.prefix}-${String(i).padStart(2, '0')}`;
        let status: Machine['status'] = 'running';
        let health = 86 - (mIdx % 5);
        let oee = 86.0 + ((mIdx * 2) % 4);

        if (mIdx === 3) {
          status = 'warning';
          health = 74;
          oee = 79.5;
        } else if (mIdx === 12) {
          status = 'maintenance';
          health = 55;
          oee = 0;
        }

        this.machines.push({
          id: `M-E${mIdx}`,
          factory_id: factoryId,
          machine_id: machineId,
          name: `${group.type} #${i}`,
          type: group.type,
          line: group.line,
          status,
          health_score: health,
          temperature_c: Math.round((70 + (mIdx % 12)) * 10) / 10,
          vibration_mms: 3.2,
          pressure_bar: 8.5,
          speed_rpm: 650,
          oee: Math.round(oee * 10) / 10,
          operator: operators[(mIdx - 1) % operators.length],
          install_date: '2016-11-20',
          last_service_date: '2026-09-05'
        });
        mIdx++;
      }
    }

    // Incidents for Orion
    this.incidents.push({
      id: 'INC-E01',
      incident_id: 'INC-2026-0509',
      factory_id: factoryId,
      machine_id: 'ORN-FRG-02',
      title: 'Forging Ram Guide Rail Thermal Expansion Alert',
      description: 'Lube oil temperature elevated to 68°C; thermal sensor triggered yellow caution.',
      severity: 'High',
      status: 'Open',
      reported_by: 'Kuppuswamy R.',
      reported_at: '2026-10-06T03:00:00Z'
    });

    // Work Orders for Orion
    this.workOrders.push({
      id: 'WO-E01',
      work_order_id: 'WO-2026-0811',
      factory_id: factoryId,
      machine_id: 'ORN-FRG-02',
      title: 'Oil Heat Exchanger Descaling & Flow Check',
      priority: 'High',
      status: 'Pending',
      assigned_to: 'N. Muthusamy',
      due_date: '2026-10-07',
      created_at: '2026-10-06T03:10:00Z',
      estimated_hours: 4.0
    });

    // Maintenance for Orion
    this.maintenance.push({
      id: 'MNT-E01',
      factory_id: factoryId,
      machine_id: 'ORN-TRN-01',
      type: 'Predictive',
      status: 'Completed',
      scheduled_date: '2026-09-25',
      completed_date: '2026-09-25',
      technician: 'N. Muthusamy',
      description: 'Hydrostatic table pocket pressure balancing and gib readjustment.',
      cost_usd: 1400,
      downtime_hours: 5.0
    });

    // SOPs for Orion
    this.sops.push({
      id: 'SOP-E01',
      sop_id: 'SOP-FRG-501',
      factory_id: factoryId,
      title: '2000T Forging Press Die Preheat and Hydraulic Balancing',
      machine_type: 'Hydraulic Open-Die Forging Press 2000T',
      category: 'Safety Protocol',
      version: 'v2.2',
      last_updated: '2026-07-30',
      author: 'Heavy Forge Superintendent',
      steps: [
        'Preheat die blocks with radiant gas heaters to 220°C before striking.',
        'Confirm hydraulic accumulator bank charge pressure at 280 bar.',
        'Cycle ram in inching mode to verify slide gib clearance.'
      ],
      safety_precautions: [
        'Full heat-reflective apron, Kevlar arm guards, and face shield required.',
        'Never stand in front of anvil opening during upset stroke.'
      ],
      target_audience: 'Forge Operators'
    });

    // Data Quality for Orion
    this.dataQuality.push({
      id: 'DQ-E01',
      factory_id: factoryId,
      sensor_name: 'Hydraulic Pressure & Thermal Transducer Bus',
      machine_id: 'ORN-FRG-01',
      uptime_percentage: 98.9,
      data_completeness_pct: 98.1,
      latency_ms: 28,
      anomalies_detected: 1,
      status: 'Healthy',
      last_sync: '20 seconds ago'
    });
  }

  // --- KPI Calculation Engine (Dynamic from Data) ---
  public calculateFactoryKPIs(factoryId: string): FactoryKPIs {
    const factory = this.factories.find(f => f.id === factoryId);
    const machines = this.machines.filter(m => m.factory_id === factoryId);
    const incidents = this.incidents.filter(i => i.factory_id === factoryId);
    const workOrders = this.workOrders.filter(w => w.factory_id === factoryId);
    const maintenance = this.maintenance.filter(m => m.factory_id === factoryId);
    const production = this.production.filter(p => p.factory_id === factoryId);

    const totalMachines = machines.length;
    const runningMachines = machines.filter(m => m.status === 'running').length;
    const warningMachines = machines.filter(m => m.status === 'warning').length;
    const maintenanceMachines = machines.filter(m => m.status === 'maintenance').length;
    const offlineMachines = machines.filter(m => m.status === 'offline').length;

    // Calculate dynamic OEE: average of running & warning machines
    const activeMachinesWithOee = machines.filter(m => m.status !== 'offline' && m.status !== 'maintenance');
    const avgOee = activeMachinesWithOee.length > 0
      ? activeMachinesWithOee.reduce((sum, m) => sum + m.oee, 0) / activeMachinesWithOee.length
      : 85.0;

    const avgHealth = machines.length > 0
      ? machines.reduce((sum, m) => sum + m.health_score, 0) / machines.length
      : 80.0;

    // Production calculation
    const totalProd = production.reduce((sum, p) => sum + p.actual_units, 0);
    const targetProd = production.reduce((sum, p) => sum + p.target_units, 0);
    const defectiveProd = production.reduce((sum, p) => sum + p.defective_units, 0);
    const defectRate = totalProd > 0 ? (defectiveProd / totalProd) * 100 : 1.2;

    const downtimeHours = maintenance.reduce((sum, m) => sum + m.downtime_hours, 0);
    const activeIncidents = incidents.filter(i => i.status === 'Open' || i.status === 'Investigating').length;
    const criticalIncidents = incidents.filter(i => (i.status === 'Open' || i.status === 'Investigating') && (i.severity === 'Critical' || i.severity === 'High')).length;
    const openWorkOrders = workOrders.filter(w => w.status === 'Pending' || w.status === 'In Progress').length;
    const pendingMaintenance = maintenance.filter(m => m.status === 'Scheduled' || m.status === 'In Progress').length;

    // Standard OEE components
    const availability = Math.min(98.5, Math.max(75, 100 - (maintenanceMachines * 4.5) - (warningMachines * 1.5)));
    const quality = Math.min(99.8, Math.max(90, 100 - defectRate));
    const performance = Math.min(99.0, Math.max(80, (avgOee / (availability * quality / 10000))));

    return {
      factory_id: factoryId,
      factory_name: factory?.name || 'Unknown Factory',
      total_machines: totalMachines,
      running_machines: runningMachines,
      warning_machines: warningMachines,
      maintenance_machines: maintenanceMachines,
      offline_machines: offlineMachines,
      oee: Math.round(avgOee * 10) / 10,
      availability: Math.round(availability * 10) / 10,
      performance: Math.round(performance * 10) / 10,
      quality: Math.round(quality * 10) / 10,
      total_production_units: totalProd > 0 ? totalProd : 28400,
      target_production_units: targetProd > 0 ? targetProd : 30000,
      defective_units: defectiveProd > 0 ? defectiveProd : 290,
      defect_rate_pct: Math.round(defectRate * 100) / 100,
      downtime_hours: Math.round(downtimeHours * 10) / 10,
      active_incidents: activeIncidents,
      critical_incidents: criticalIncidents,
      open_work_orders: openWorkOrders,
      pending_maintenance: pendingMaintenance,
      avg_health_score: Math.round(avgHealth * 10) / 10
    };
  }

  // --- Super Admin Overview ---
  public getSuperAdminOverview(): SuperAdminOverview {
    const factoriesWithKpis = this.factories.map(f => {
      const kpis = this.calculateFactoryKPIs(f.id);
      return {
        ...f,
        machine_count: kpis.total_machines,
        running_count: kpis.running_machines,
        oee: kpis.oee,
        active_incidents: kpis.active_incidents,
        open_work_orders: kpis.open_work_orders,
        kpis
      };
    });

    const totalMachines = factoriesWithKpis.reduce((acc, f) => acc + f.kpis.total_machines, 0);
    const totalProduction = factoriesWithKpis.reduce((acc, f) => acc + f.kpis.total_production_units, 0);
    const activeIncidents = factoriesWithKpis.reduce((acc, f) => acc + f.kpis.active_incidents, 0);
    const openWorkOrders = factoriesWithKpis.reduce((acc, f) => acc + f.kpis.open_work_orders, 0);
    const overallOee = factoriesWithKpis.reduce((acc, f) => acc + f.kpis.oee, 0) / factoriesWithKpis.length;
    const overallHealth = factoriesWithKpis.reduce((acc, f) => acc + f.kpis.avg_health_score, 0) / factoriesWithKpis.length;

    return {
      total_factories: this.factories.length,
      active_factories: this.factories.filter(f => f.status === 'Operational').length,
      total_users: this.users.length,
      total_machines: totalMachines,
      total_production: totalProduction,
      active_incidents: activeIncidents,
      open_work_orders: openWorkOrders,
      overall_oee: Math.round(overallOee * 10) / 10,
      overall_health: Math.round(overallHealth * 10) / 10,
      factories: factoriesWithKpis
    };
  }

  // --- Data Access with Strict Factory Isolation ---
  public getMachinesForFactory(factoryId: string): Machine[] {
    return this.machines.filter(m => m.factory_id === factoryId);
  }

  public getProductionForFactory(factoryId: string): ProductionRecord[] {
    return this.production.filter(p => p.factory_id === factoryId);
  }

  public getMaintenanceForFactory(factoryId: string): MaintenanceRecord[] {
    return this.maintenance.filter(m => m.factory_id === factoryId);
  }

  public getIncidentsForFactory(factoryId: string): Incident[] {
    return this.incidents.filter(i => i.factory_id === factoryId);
  }

  public getWorkOrdersForFactory(factoryId: string): WorkOrder[] {
    return this.workOrders.filter(w => w.factory_id === factoryId);
  }

  public getSOPsForFactory(factoryId: string): SOP[] {
    return this.sops.filter(s => s.factory_id === factoryId);
  }

  public getDataQualityForFactory(factoryId: string): DataQualityMetric[] {
    return this.dataQuality.filter(d => d.factory_id === factoryId);
  }
}

export const db = new FactoryOpsDatabase();
