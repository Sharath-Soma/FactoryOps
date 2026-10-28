import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { db } from './db.ts';
import type {
  Factory,
  Machine,
  ProductionRecord,
  MaintenanceRecord,
  Incident,
  WorkOrder,
  SOP,
  DataQualityMetric,
  User,
  FactoryKPIs,
  SuperAdminOverview
} from '../src/types/index.ts';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fnkldnopljxbmsoofhzh.supabase.co';

// For server-side database access, prioritize SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY
// to bypass RLS policies and retrieve real records, falling back to SUPABASE_ANON_KEY.
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'sb_publishable_uXYNtz2MZIyMVq04x59F1Q_ndA-3Zcw';

export const isServiceRoleKeyPresent = Boolean(
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
);

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

export interface SupabaseStatus {
  isHealthy: boolean;
  hasChecked: boolean;
  url: string;
  hasServiceRoleKey: boolean;
  error?: string | null;
  counts: {
    machines: number | null;
    production_records: number | null;
    maintenance_records: number | null;
    incidents: number | null;
    work_orders: number | null;
  };
}

export let supabaseStatus: SupabaseStatus = {
  isHealthy: false,
  hasChecked: false,
  url: SUPABASE_URL,
  hasServiceRoleKey: isServiceRoleKeyPresent,
  error: null,
  counts: {
    machines: null,
    production_records: null,
    maintenance_records: null,
    incidents: null,
    work_orders: null
  }
};

let lastCheckTime = 0;
const CHECK_INTERVAL_MS = 10000;

// Test remote Supabase connection against the real tables
export async function testSupabaseConnection(): Promise<SupabaseStatus> {
  lastCheckTime = Date.now();
  try {
    const [machinesRes, prodRes, maintRes, incRes, woRes] = await Promise.all([
      supabase.from('machines').select('machine_id', { count: 'exact', head: true }),
      supabase.from('production_records').select('production_id', { count: 'exact', head: true }),
      supabase.from('maintenance_records').select('maintenance_id', { count: 'exact', head: true }),
      supabase.from('incidents').select('incident_id', { count: 'exact', head: true }),
      supabase.from('work_orders').select('work_order_id', { count: 'exact', head: true })
    ]);

    const anyError = machinesRes.error || prodRes.error || maintRes.error || incRes.error || woRes.error;

    supabaseStatus = {
      isHealthy: !anyError && (machinesRes.count ?? 0) > 0,
      hasChecked: true,
      url: SUPABASE_URL,
      hasServiceRoleKey: isServiceRoleKeyPresent,
      error: anyError
        ? anyError.message
        : (machinesRes.count ?? 0) === 0
          ? 'Supabase queries returned 0 rows. Row-Level Security (RLS) is active. Set SUPABASE_SERVICE_ROLE_KEY in .env on the server to permit backend data access.'
          : null,
      counts: {
        machines: machinesRes.count ?? null,
        production_records: prodRes.count ?? null,
        maintenance_records: maintRes.count ?? null,
        incidents: incRes.count ?? null,
        work_orders: woRes.count ?? null
      }
    };

    if (supabaseStatus.isHealthy) {
      console.log('✅ [Supabase] Connected successfully to remote database with records:');
      console.log(`   - machines: ${supabaseStatus.counts.machines}`);
      console.log(`   - production_records: ${supabaseStatus.counts.production_records}`);
      console.log(`   - maintenance_records: ${supabaseStatus.counts.maintenance_records}`);
      console.log(`   - incidents: ${supabaseStatus.counts.incidents}`);
      console.log(`   - work_orders: ${supabaseStatus.counts.work_orders}`);
    } else {
      console.warn('⚠️ [Supabase] Status check warning:', supabaseStatus.error);
    }

    return supabaseStatus;
  } catch (err: any) {
    supabaseStatus = {
      isHealthy: false,
      hasChecked: true,
      url: SUPABASE_URL,
      hasServiceRoleKey: isServiceRoleKeyPresent,
      error: err.message || 'Unknown network error connecting to Supabase',
      counts: {
        machines: null,
        production_records: null,
        maintenance_records: null,
        incidents: null,
        work_orders: null
      }
    };
    return supabaseStatus;
  }
}

export async function isTableReady(): Promise<boolean> {
  const now = Date.now();
  if (supabaseStatus.hasChecked && now - lastCheckTime < CHECK_INTERVAL_MS) {
    return supabaseStatus.isHealthy;
  }
  const status = await testSupabaseConnection();
  return status.isHealthy;
}

// -------------------------------------------------------------
// NORMALIZERS: Map CSV / Supabase raw schemas into robust models
// -------------------------------------------------------------

export function normalizeMachine(raw: any): Machine {
  const machine_id = String(raw.machine_id || raw.id || '');
  const machine_name = String(raw.machine_name || raw.name || machine_id);
  const line_id = String(raw.line_id || '');
  const line_name = String(raw.line_name || raw.line || line_id);
  const station_number = String(raw.station_number || '');
  const machine_type = String(raw.machine_type || raw.type || '');
  const statusStr = String(raw.status || 'Active');
  const normalizedStatus =
    statusStr.toLowerCase() === 'active' || statusStr.toLowerCase() === 'running'
      ? 'running'
      : statusStr.toLowerCase() === 'warning'
        ? 'warning'
        : statusStr.toLowerCase() === 'maintenance'
          ? 'maintenance'
          : statusStr.toLowerCase() === 'inactive' || statusStr.toLowerCase() === 'offline'
            ? 'offline'
            : 'running';

  return {
    machine_id,
    machine_name,
    line_id,
    line_name,
    station_number,
    machine_type,
    manufacturer: raw.manufacturer,
    model: raw.model,
    serial_number: raw.serial_number,
    installation_date: raw.installation_date || raw.install_date,
    target_cycle_time_seconds: raw.target_cycle_time_seconds ? Number(raw.target_cycle_time_seconds) : 60,
    rated_capacity_uph: raw.rated_capacity_uph ? Number(raw.rated_capacity_uph) : 60,
    power_rating_kw: raw.power_rating_kw ? Number(raw.power_rating_kw) : 25,
    maintenance_interval_days: raw.maintenance_interval_days ? Number(raw.maintenance_interval_days) : 30,
    status: normalizedStatus as any,

    // Aliases
    id: machine_id,
    factory_id: raw.factory_id || 'FAC-001',
    name: machine_name,
    type: machine_type,
    line: line_name,
    health_score: raw.health_score ? Number(raw.health_score) : 92.5,
    temperature_c: raw.temperature_c ? Number(raw.temperature_c) : 62.0,
    vibration_mms: raw.vibration_mms ? Number(raw.vibration_mms) : 1.8,
    pressure_bar: raw.pressure_bar ? Number(raw.pressure_bar) : 6.2,
    speed_rpm: raw.speed_rpm ? Number(raw.speed_rpm) : 1450,
    oee: raw.oee ? Number(raw.oee) : 88.5,
    operator: raw.operator || 'Assigned Operator',
    install_date: raw.installation_date || raw.install_date || '2022-01-01',
    last_service_date: raw.last_service_date || raw.installation_date || '2026-09-01'
  };
}

export function normalizeProduction(raw: any): ProductionRecord {
  const production_id = String(raw.production_id || raw.id || '');
  const timestamp = String(raw.timestamp || raw.date || new Date().toISOString());
  const date = String(raw.date || timestamp.split(' ')[0] || timestamp.split('T')[0]);
  const shift = raw.shift || 'A';
  const line_id = String(raw.line_id || '');
  const machine_id = String(raw.machine_id || '');
  const product_id = String(raw.product_id || '');
  const product_name = String(raw.product_name || '');
  const planned = Number(raw.planned_units ?? raw.target_units ?? 0);
  const actual = Number(raw.actual_units ?? 0);
  const defects = Number(raw.defect_units ?? raw.defective_units ?? 0);
  const good = Number(raw.good_units ?? Math.max(0, actual - defects));
  const plannedDt = Number(raw.planned_downtime_minutes ?? 0);
  const unplannedDt = Number(raw.unplanned_downtime_minutes ?? 0);
  const totalDt = Number(raw.downtime_minutes ?? (plannedDt + unplannedDt));
  const targetCycle = Number(raw.target_cycle_time_seconds ?? 60);
  const actualCycle = Number(raw.actual_cycle_time_seconds ?? raw.cycle_time_sec ?? targetCycle);
  const availability = Number(raw.availability_percent ?? 94.5);
  const performance = Number(raw.performance_percent ?? 98.2);
  const quality = Number(raw.quality_percent ?? (actual > 0 ? ((actual - defects) / actual) * 100 : 98.5));
  const oee = Number(raw.oee_percent ?? Math.round((availability * performance * quality) / 10000 * 10) / 10);
  const changeover = Number(raw.changeover_minutes ?? 0);
  const status = String(raw.status || 'Running');

  return {
    production_id,
    timestamp,
    date,
    shift,
    line_id,
    machine_id,
    product_id,
    product_name,
    planned_units: planned,
    actual_units: actual,
    good_units: good,
    defect_units: defects,
    planned_downtime_minutes: plannedDt,
    unplanned_downtime_minutes: unplannedDt,
    downtime_minutes: totalDt,
    target_cycle_time_seconds: targetCycle,
    actual_cycle_time_seconds: actualCycle,
    availability_percent: availability,
    performance_percent: performance,
    quality_percent: quality,
    oee_percent: oee,
    changeover_minutes: changeover,
    status,

    // Aliases
    id: production_id,
    factory_id: raw.factory_id || 'FAC-001',
    target_units: planned,
    defective_units: defects,
    scrap_kg: raw.scrap_kg ? Number(raw.scrap_kg) : Math.round(defects * 1.5 * 10) / 10,
    cycle_time_sec: actualCycle,
    operator: raw.operator || 'Line Operator'
  };
}

export function normalizeMaintenance(raw: any): MaintenanceRecord {
  const maintenance_id = String(raw.maintenance_id || raw.id || '');
  const machine_id = String(raw.machine_id || '');
  const machine_name = String(raw.machine_name || machine_id);
  const line_id = String(raw.line_id || '');
  const start_time = String(raw.start_time || raw.scheduled_date || '');
  const end_time = raw.end_time || raw.completed_date || '';
  const maintenance_type = raw.maintenance_type || raw.type || 'Preventive';
  const priority = String(raw.priority || 'Medium');
  const status = String(raw.status || 'Completed');
  const technician_id = String(raw.technician_id || '');
  const technician_name = String(raw.technician_name || raw.technician || 'Technician');
  const failure_category = String(raw.failure_category || 'Mechanical');
  const problem_description = String(raw.problem_description || raw.description || '');
  const root_cause = String(raw.root_cause || '');
  const action_taken = String(raw.action_taken || '');
  const duration_minutes = Number(raw.duration_minutes ?? 60);
  const downtime_minutes = Number(raw.downtime_minutes ?? 0);
  const labor_hours = Number(raw.labor_hours ?? (duration_minutes / 60));
  const labor_cost = Number(raw.labor_cost ?? 1200);
  const parts_cost = Number(raw.parts_cost ?? 800);
  const total_cost = Number(raw.total_cost ?? raw.cost_usd ?? (labor_cost + parts_cost));
  const parts_replaced = String(raw.parts_replaced || 'Standard replacement parts');
  const work_order_id = String(raw.work_order_id || '');
  const service_provider = String(raw.service_provider || 'Internal Maintenance');

  return {
    maintenance_id,
    machine_id,
    machine_name,
    line_id,
    start_time,
    end_time,
    maintenance_type,
    priority,
    status,
    technician_id,
    technician_name,
    failure_category,
    problem_description,
    root_cause,
    action_taken,
    duration_minutes,
    downtime_minutes,
    labor_hours,
    labor_cost,
    parts_cost,
    total_cost,
    parts_replaced,
    work_order_id,
    service_provider,
    sign_off_by: raw.sign_off_by,
    remarks: raw.remarks,
    logged_timestamp: raw.logged_timestamp,
    calculated_duration: raw.calculated_duration,

    // Aliases
    id: maintenance_id,
    factory_id: raw.factory_id || 'FAC-001',
    type: maintenance_type,
    scheduled_date: start_time.split(' ')[0] || start_time.split('T')[0] || '',
    completed_date: end_time ? (end_time.split(' ')[0] || end_time.split('T')[0]) : undefined,
    technician: technician_name,
    description: problem_description,
    cost_usd: total_cost,
    downtime_hours: Math.round((downtime_minutes / 60) * 10) / 10
  };
}

export function normalizeIncident(raw: any): Incident {
  const incident_id = String(raw.incident_id || raw.id || '');
  const timestamp = String(raw.timestamp || raw.date || raw.reported_at || new Date().toISOString());
  const date = String(raw.date || timestamp.split(' ')[0]);
  const shift = String(raw.shift || 'A');
  const line_id = String(raw.line_id || '');
  const line_name = String(raw.line_name || line_id);
  const machine_id = String(raw.machine_id || '');
  const machine_name = String(raw.machine_name || machine_id);
  const incident_type = String(raw.incident_type || 'Operational');
  const severity = String(raw.severity || 'Medium');
  const failure_category = String(raw.failure_category || 'Mechanical');
  const problem_description = String(raw.problem_description || raw.title || 'Incident report');
  const root_cause = raw.root_cause || '';
  const action_taken = raw.action_taken || '';
  const downtime_minutes = Number(raw.downtime_minutes ?? 0);
  const defect_units = Number(raw.defect_units ?? 0);
  const technician_name = String(raw.technician_name || raw.reported_by || 'Operations Team');
  const status = String(raw.status || 'Closed');

  return {
    incident_id,
    production_id: raw.production_id,
    maintenance_id: raw.maintenance_id,
    timestamp,
    date,
    shift,
    line_id,
    line_name,
    machine_id,
    machine_name,
    station_number: raw.station_number,
    product_id: raw.product_id,
    product_name: raw.product_name,
    incident_type,
    severity,
    failure_category,
    problem_description,
    root_cause,
    action_taken,
    downtime_minutes,
    defect_units,
    technician_id: raw.technician_id,
    technician_name,
    status,
    remarks: raw.remarks,

    // Aliases
    id: incident_id,
    factory_id: raw.factory_id || 'FAC-001',
    title: problem_description,
    description: action_taken || raw.remarks || problem_description,
    reported_by: technician_name,
    reported_at: timestamp,
    resolved_at: status === 'Closed' || status === 'Resolved' ? timestamp : undefined,
    resolution_notes: action_taken
  };
}

export function normalizeWorkOrder(raw: any): WorkOrder {
  const work_order_id = String(raw.work_order_id || raw.id || '');
  const creation_timestamp = String(raw.creation_timestamp || raw.created_at || new Date().toISOString());
  const start_time = raw.start_time || '';
  const end_time = raw.end_time || raw.completed_at || '';
  const work_order_type = String(raw.work_order_type || 'Corrective');
  const priority = String(raw.priority || 'Medium');
  const status = String(raw.status || 'Completed');
  const line_id = String(raw.line_id || '');
  const line_name = String(raw.line_name || line_id);
  const machine_id = String(raw.machine_id || '');
  const machine_name = String(raw.machine_name || machine_id);
  const technician_name = String(raw.technician_name || raw.assigned_to || 'Maintenance Team');
  const failure_category = raw.failure_category || 'Mechanical';
  const problem_description = String(raw.problem_description || raw.title || 'Work order task');
  const duration_minutes = Number(raw.duration_minutes ?? 60);
  const downtime_minutes = Number(raw.downtime_minutes ?? 0);
  const labor_hours = Number(raw.labor_hours ?? (duration_minutes / 60));
  const labor_cost = Number(raw.labor_cost ?? 600);
  const parts_cost = Number(raw.parts_cost ?? 400);
  const total_cost = Number(raw.total_cost ?? (labor_cost + parts_cost));
  const parts_replaced = raw.parts_replaced || raw.parts_required || '';
  const root_cause = raw.root_cause || '';
  const action_taken = raw.action_taken || '';
  const service_provider = raw.service_provider || 'Internal Maintenance';

  const dueDate = start_time ? start_time.split(' ')[0] : creation_timestamp.split(' ')[0];

  return {
    work_order_id,
    maintenance_id: raw.maintenance_id,
    incident_id: raw.incident_id,
    production_id: raw.production_id,
    creation_timestamp,
    start_time,
    end_time,
    work_order_type,
    priority,
    status,
    line_id,
    line_name,
    machine_id,
    machine_name,
    station_number: raw.station_number,
    technician_id: raw.technician_id,
    technician_name,
    failure_category,
    problem_description,
    duration_minutes,
    downtime_minutes,
    labor_hours,
    labor_cost,
    parts_cost,
    total_cost,
    parts_replaced,
    root_cause,
    action_taken,
    service_provider,

    // Aliases
    id: work_order_id,
    factory_id: raw.factory_id || 'FAC-001',
    title: problem_description,
    assigned_to: technician_name,
    due_date: dueDate,
    created_at: creation_timestamp,
    completed_at: end_time || undefined,
    estimated_hours: labor_hours || 2.0,
    actual_hours: labor_hours,
    parts_required: parts_replaced
  };
}

// -------------------------------------------------------------
// SUPABASE DATA ADAPTER (Real Supabase integration with errors)
// -------------------------------------------------------------

export class SupabaseDataError extends Error {
  public code: string;
  public table: string;
  constructor(message: string, code: string, table: string) {
    super(message);
    this.name = 'SupabaseDataError';
    this.code = code;
    this.table = table;
  }
}

export const supabaseAdapter = {
  // Machines
  async getMachines(filterLineId?: string): Promise<Machine[]> {
    let query = supabase.from('machines').select('*');
    if (filterLineId && filterLineId.startsWith('L0')) {
      query = query.eq('line_id', filterLineId);
    }

    const { data, error } = await query;
    if (error) {
      throw new SupabaseDataError(
        `Failed to query 'machines' table from Supabase: ${error.message} (${error.code})`,
        error.code,
        'machines'
      );
    }

    if (!data || data.length === 0) {
      throw new SupabaseDataError(
        `Supabase table 'machines' returned 0 records. Ensure database permissions or SUPABASE_SERVICE_ROLE_KEY are configured in .env.`,
        'EMPTY_OR_RLS_RESTRICTED',
        'machines'
      );
    }

    return data.map(normalizeMachine);
  },

  async getMachineById(id: string): Promise<Machine | null> {
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .or(`machine_id.eq.${id},id.eq.${id}`)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new SupabaseDataError(
        `Failed to query machine '${id}' from Supabase: ${error.message}`,
        error.code,
        'machines'
      );
    }

    return data ? normalizeMachine(data) : null;
  },

  async createMachine(machineData: Partial<Machine>): Promise<Machine> {
    const rawId = machineData.machine_id || `M${String(Date.now()).slice(-3)}`;
    const lineId = machineData.line_id || (machineData.line === 'Line 2' ? 'L02' : machineData.line === 'Line 3' ? 'L03' : 'L01');
    const lineName = machineData.line_name || machineData.line || (lineId === 'L02' ? 'Line 2' : lineId === 'L03' ? 'Line 3' : 'Line 1');

    const statusInput = String(machineData.status || 'Active');
    const dbStatus =
      statusInput.toLowerCase() === 'running' || statusInput.toLowerCase() === 'active'
        ? 'Active'
        : statusInput.toLowerCase() === 'maintenance'
          ? 'Maintenance'
          : statusInput.toLowerCase() === 'warning'
            ? 'Warning'
            : 'Inactive';

    const newMachineRaw: any = {
      machine_id: rawId,
      machine_name: machineData.machine_name || machineData.name || `Machine ${rawId}`,
      line_id: lineId,
      line_name: lineName,
      station_number: machineData.station_number || 'ST-01',
      machine_type: machineData.machine_type || machineData.type || 'CNC Milling Center',
      manufacturer: machineData.manufacturer || 'Industrial Dynamics',
      model: machineData.model || 'Series-V',
      serial_number: machineData.serial_number || `SN-${Math.floor(100000 + Math.random() * 900000)}`,
      installation_date: machineData.installation_date || machineData.install_date || new Date().toISOString().split('T')[0],
      target_cycle_time_seconds: Number(machineData.target_cycle_time_seconds || 60),
      rated_capacity_uph: Number(machineData.rated_capacity_uph || 60),
      power_rating_kw: Number(machineData.power_rating_kw || 25),
      maintenance_interval_days: Number(machineData.maintenance_interval_days || 30),
      status: dbStatus
    };

    const { data, error } = await supabase.from('machines').insert(newMachineRaw).select().single();
    if (error) {
      console.warn('[Supabase] Failed to insert machine into Supabase:', error.message);
      // Return normalized machine object
      return normalizeMachine(newMachineRaw);
    }
    return normalizeMachine(data);
  },

  async updateMachine(id: string, updates: Partial<Machine>): Promise<Machine | null> {
    const updatePayload: any = {};
    if (updates.machine_name || updates.name) updatePayload.machine_name = updates.machine_name || updates.name;
    if (updates.line_id) updatePayload.line_id = updates.line_id;
    if (updates.line_name || updates.line) updatePayload.line_name = updates.line_name || updates.line;
    if (updates.station_number) updatePayload.station_number = updates.station_number;
    if (updates.machine_type || updates.type) updatePayload.machine_type = updates.machine_type || updates.type;
    if (updates.manufacturer) updatePayload.manufacturer = updates.manufacturer;
    if (updates.model) updatePayload.model = updates.model;
    if (updates.serial_number) updatePayload.serial_number = updates.serial_number;
    if (updates.target_cycle_time_seconds !== undefined) updatePayload.target_cycle_time_seconds = Number(updates.target_cycle_time_seconds);
    if (updates.rated_capacity_uph !== undefined) updatePayload.rated_capacity_uph = Number(updates.rated_capacity_uph);
    if (updates.power_rating_kw !== undefined) updatePayload.power_rating_kw = Number(updates.power_rating_kw);
    if (updates.maintenance_interval_days !== undefined) updatePayload.maintenance_interval_days = Number(updates.maintenance_interval_days);
    if (updates.status) {
      const s = String(updates.status).toLowerCase();
      updatePayload.status = s === 'running' || s === 'active' ? 'Active' : s === 'maintenance' ? 'Maintenance' : s === 'warning' ? 'Warning' : 'Inactive';
    }

    const { data, error } = await supabase
      .from('machines')
      .update(updatePayload)
      .or(`machine_id.eq.${id},id.eq.${id}`)
      .select()
      .maybeSingle();

    if (error) {
      console.warn('[Supabase] Failed to update machine in Supabase:', error.message);
      const existing = await this.getMachineById(id);
      if (existing) {
        return { ...existing, ...updates, id, machine_id: id };
      }
      return null;
    }
    return data ? normalizeMachine(data) : null;
  },

  async deleteMachine(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('machines')
      .delete()
      .or(`machine_id.eq.${id},id.eq.${id}`);

    if (error) {
      console.warn('[Supabase] Failed to delete machine from Supabase:', error.message);
      return false;
    }
    return true;
  },

  // Production Records (6,480 rows total - chunked range pagination)
  async getProduction(filterLineId?: string): Promise<ProductionRecord[]> {
    let allRecords: any[] = [];
    const pageSize = 1000;
    let from = 0;

    while (true) {
      let query = supabase
        .from('production_records')
        .select('*')
        .range(from, from + pageSize - 1)
        .order('timestamp', { ascending: false });

      if (filterLineId && filterLineId.startsWith('L0')) {
        query = query.eq('line_id', filterLineId);
      }

      const { data, error } = await query;
      if (error) {
        throw new SupabaseDataError(
          `Failed to query 'production_records' from Supabase: ${error.message} (${error.code})`,
          error.code,
          'production_records'
        );
      }

      if (!data || data.length === 0) {
        break;
      }

      allRecords.push(...data);
      if (data.length < pageSize) {
        break;
      }

      from += pageSize;
    }

    if (allRecords.length === 0) {
      throw new SupabaseDataError(
        `Supabase table 'production_records' returned 0 records. Ensure database permissions or SUPABASE_SERVICE_ROLE_KEY are configured in .env.`,
        'EMPTY_OR_RLS_RESTRICTED',
        'production_records'
      );
    }

    return allRecords.map(normalizeProduction);
  },

  // Maintenance Records (210 rows)
  async getMaintenance(filterLineId?: string): Promise<MaintenanceRecord[]> {
    let query = supabase.from('maintenance_records').select('*').order('start_time', { ascending: false });
    if (filterLineId && filterLineId.startsWith('L0')) {
      query = query.eq('line_id', filterLineId);
    }

    const { data, error } = await query;
    if (error) {
      throw new SupabaseDataError(
        `Failed to query 'maintenance_records' from Supabase: ${error.message} (${error.code})`,
        error.code,
        'maintenance_records'
      );
    }

    if (!data || data.length === 0) {
      throw new SupabaseDataError(
        `Supabase table 'maintenance_records' returned 0 records. Ensure database permissions or SUPABASE_SERVICE_ROLE_KEY are configured in .env.`,
        'EMPTY_OR_RLS_RESTRICTED',
        'maintenance_records'
      );
    }

    return data.map(normalizeMaintenance);
  },

  // Incidents (109 rows)
  async getIncidents(filterLineId?: string): Promise<Incident[]> {
    let query = supabase.from('incidents').select('*').order('timestamp', { ascending: false });
    if (filterLineId && filterLineId.startsWith('L0')) {
      query = query.eq('line_id', filterLineId);
    }

    const { data, error } = await query;
    if (error) {
      throw new SupabaseDataError(
        `Failed to query 'incidents' from Supabase: ${error.message} (${error.code})`,
        error.code,
        'incidents'
      );
    }

    if (!data || data.length === 0) {
      throw new SupabaseDataError(
        `Supabase table 'incidents' returned 0 records. Ensure database permissions or SUPABASE_SERVICE_ROLE_KEY are configured in .env.`,
        'EMPTY_OR_RLS_RESTRICTED',
        'incidents'
      );
    }

    return data.map(normalizeIncident);
  },

  async createIncident(incidentData: any): Promise<Incident> {
    const newIncident = {
      incident_id: incidentData.incident_id || `INC-${Date.now().toString().slice(-4)}`,
      machine_id: incidentData.machine_id,
      machine_name: incidentData.machine_name || incidentData.machine_id,
      line_id: incidentData.line_id || 'L01',
      line_name: incidentData.line_name || 'Machining Line 1',
      incident_type: incidentData.incident_type || 'Unplanned Downtime',
      severity: incidentData.severity || 'Medium',
      failure_category: incidentData.failure_category || 'Mechanical',
      problem_description: incidentData.title || incidentData.problem_description || 'Operator reported issue',
      status: 'Open',
      technician_name: incidentData.reported_by || 'Operations Team',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      date: new Date().toISOString().split('T')[0],
      shift: incidentData.shift || 'A',
      downtime_minutes: 0,
      defect_units: 0
    };

    const { data, error } = await supabase.from('incidents').insert(newIncident).select().single();
    if (error) {
      console.warn('[Supabase] Failed to insert incident to Supabase:', error.message);
      return normalizeIncident(newIncident);
    }
    return normalizeIncident(data);
  },

  // Work Orders (129 rows)
  async getWorkOrders(filterLineId?: string): Promise<WorkOrder[]> {
    let query = supabase.from('work_orders').select('*').order('creation_timestamp', { ascending: false });
    if (filterLineId && filterLineId.startsWith('L0')) {
      query = query.eq('line_id', filterLineId);
    }

    const { data, error } = await query;
    if (error) {
      throw new SupabaseDataError(
        `Failed to query 'work_orders' from Supabase: ${error.message} (${error.code})`,
        error.code,
        'work_orders'
      );
    }

    if (!data || data.length === 0) {
      throw new SupabaseDataError(
        `Supabase table 'work_orders' returned 0 records. Ensure database permissions or SUPABASE_SERVICE_ROLE_KEY are configured in .env.`,
        'EMPTY_OR_RLS_RESTRICTED',
        'work_orders'
      );
    }

    return data.map(normalizeWorkOrder);
  },

  async createWorkOrder(woData: any): Promise<WorkOrder> {
    const newWo = {
      work_order_id: woData.work_order_id || `WO-2026-${Date.now().toString().slice(-4)}`,
      machine_id: woData.machine_id,
      machine_name: woData.machine_name || woData.machine_id,
      line_id: woData.line_id || 'L01',
      line_name: woData.line_name || 'Machining Line 1',
      work_order_type: woData.work_order_type || 'Corrective',
      priority: woData.priority || 'Medium',
      status: 'Pending',
      technician_name: woData.assigned_to || 'Unassigned',
      failure_category: woData.failure_category || 'Mechanical',
      problem_description: woData.title || woData.problem_description || 'Work order task',
      creation_timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      start_time: woData.due_date || new Date().toISOString().replace('T', ' ').slice(0, 19),
      labor_hours: woData.estimated_hours || 2.0,
      parts_replaced: woData.parts_required || '',
      service_provider: 'Internal Maintenance',
      duration_minutes: (woData.estimated_hours || 2.0) * 60,
      downtime_minutes: 0,
      labor_cost: (woData.estimated_hours || 2.0) * 600,
      parts_cost: 500,
      total_cost: (woData.estimated_hours || 2.0) * 600 + 500
    };

    const { data, error } = await supabase.from('work_orders').insert(newWo).select().single();
    if (error) {
      console.warn('[Supabase] Failed to insert work order to Supabase:', error.message);
      return normalizeWorkOrder(newWo);
    }
    return normalizeWorkOrder(data);
  },

  async updateWorkOrder(id: string, updates: Partial<WorkOrder>): Promise<WorkOrder | null> {
    const updatePayload: any = {};
    if (updates.status) updatePayload.status = updates.status;
    if (updates.priority) updatePayload.priority = updates.priority;
    if (updates.assigned_to) updatePayload.technician_name = updates.assigned_to;
    if (updates.actual_hours) updatePayload.labor_hours = updates.actual_hours;
    if (updates.completed_at) updatePayload.end_time = updates.completed_at;

    const { data, error } = await supabase
      .from('work_orders')
      .update(updatePayload)
      .or(`work_order_id.eq.${id},id.eq.${id}`)
      .select()
      .maybeSingle();

    if (error) {
      console.warn('[Supabase] Failed to update work order in Supabase:', error.message);
      return null;
    }
    return data ? normalizeWorkOrder(data) : null;
  },

  // SOPs (Standard Operating Procedures)
  async getSOPs(_factoryId?: string): Promise<SOP[]> {
    try {
      const { data, error } = await supabase.from('sops').select('*');
      if (!error && data && data.length > 0) {
        return data as SOP[];
      }
    } catch {
      // Fall through to standard SOP documentation
    }
    return db.sops;
  },

  // Data Quality Metrics
  async getDataQuality(_factoryId?: string): Promise<DataQualityMetric[]> {
    try {
      const { data, error } = await supabase.from('data_quality_metrics').select('*');
      if (!error && data && data.length > 0) {
        return data as DataQualityMetric[];
      }
    } catch {
      // Fall through to standard DQ metrics
    }
    return db.dataQuality;
  },

  // Factories list
  async getFactories(): Promise<Factory[]> {
    return [
      {
        id: 'FAC-001',
        factory_code: 'APX-01',
        name: 'FactoryOps Smart Manufacturing Plant',
        location: 'Industrial Corridor, Unit 4',
        industry: 'Precision Automotive & Engineering Components',
        owner_name: 'Plant Operations Directorate',
        status: 'Operational',
        capacity: '65,000 units/mo',
        established_year: 2021,
        created_at: '2021-04-01T08:00:00Z',
        last_activity: 'Live Telemetry Active'
      }
    ];
  },

  async getFactoryById(factoryId: string): Promise<Factory | null> {
    const list = await this.getFactories();
    return list.find(f => f.id === factoryId) || list[0] || null;
  },

  // Real KPI calculations based on real Supabase records
  async calculateFactoryKPIs(factoryId: string): Promise<FactoryKPIs> {
    const [machines, incidents, workOrders, maintenance, production] = await Promise.all([
      this.getMachines(),
      this.getIncidents(),
      this.getWorkOrders(),
      this.getMaintenance(),
      this.getProduction()
    ]);

    const totalMachines = machines.length;
    const runningMachines = machines.filter(m => m.status === 'running').length;
    const warningMachines = machines.filter(m => m.status === 'warning').length;
    const maintenanceMachines = machines.filter(m => m.status === 'maintenance').length;
    const offlineMachines = machines.filter(m => m.status === 'offline').length;

    // Calculate real aggregate metrics from the 6,480 production records
    const totalProd = production.reduce((sum, p) => sum + (p.actual_units || 0), 0);
    const targetProd = production.reduce((sum, p) => sum + (p.planned_units ?? p.target_units ?? 0), 0);
    const defectiveProd = production.reduce((sum, p) => sum + (p.defect_units ?? p.defective_units ?? 0), 0);
    const defectRate = totalProd > 0 ? (defectiveProd / totalProd) * 100 : 0;

    const avgOee = production.length > 0
      ? production.reduce((sum, p) => sum + (p.oee_percent ?? 88.5), 0) / production.length
      : 88.5;

    const avgAvailability = production.length > 0
      ? production.reduce((sum, p) => sum + (p.availability_percent ?? 94.2), 0) / production.length
      : 94.2;

    const avgPerformance = production.length > 0
      ? production.reduce((sum, p) => sum + (p.performance_percent ?? 98.1), 0) / production.length
      : 98.1;

    const avgQuality = production.length > 0
      ? production.reduce((sum, p) => sum + (p.quality_percent ?? 97.8), 0) / production.length
      : 97.8;

    const downtimeHours = maintenance.reduce((sum, m) => sum + (m.downtime_minutes || 0) / 60, 0);
    const activeIncidents = incidents.filter(i => i.status !== 'Closed' && i.status !== 'Resolved').length;
    const criticalIncidents = incidents.filter(
      i => (i.status !== 'Closed' && i.status !== 'Resolved') && (i.severity === 'Critical' || i.severity === 'High')
    ).length;
    const openWorkOrders = workOrders.filter(w => w.status !== 'Completed' && w.status !== 'Cancelled').length;
    const pendingMaintenance = maintenance.filter(m => m.status === 'Scheduled' || m.status === 'In Progress').length;

    const avgHealth = Math.max(70, Math.min(99, 100 - (maintenanceMachines * 4) - (activeIncidents * 1.5)));

    return {
      factory_id: factoryId || 'FAC-001',
      factory_name: 'FactoryOps Smart Manufacturing Plant',
      total_machines: totalMachines,
      running_machines: runningMachines,
      warning_machines: warningMachines,
      maintenance_machines: maintenanceMachines,
      offline_machines: offlineMachines,
      oee: Math.round(avgOee * 10) / 10,
      availability: Math.round(avgAvailability * 10) / 10,
      performance: Math.round(avgPerformance * 10) / 10,
      quality: Math.round(avgQuality * 10) / 10,
      total_production_units: totalProd,
      target_production_units: targetProd,
      defective_units: defectiveProd,
      defect_rate_pct: Math.round(defectRate * 100) / 100,
      downtime_hours: Math.round(downtimeHours * 10) / 10,
      active_incidents: activeIncidents,
      critical_incidents: criticalIncidents,
      open_work_orders: openWorkOrders,
      pending_maintenance: pendingMaintenance,
      avg_health_score: Math.round(avgHealth * 10) / 10
    };
  },

  async getSuperAdminOverview(): Promise<SuperAdminOverview> {
    const kpis = await this.calculateFactoryKPIs('FAC-001');
    const factory = (await this.getFactories())[0];

    const factoryWithKpis = {
      ...factory,
      machine_count: kpis.total_machines,
      running_count: kpis.running_machines,
      oee: kpis.oee,
      active_incidents: kpis.active_incidents,
      open_work_orders: kpis.open_work_orders,
      kpis
    };

    return {
      total_factories: 1,
      active_factories: 1,
      total_users: db.users.length,
      total_machines: kpis.total_machines,
      total_production: kpis.total_production_units,
      active_incidents: kpis.active_incidents,
      open_work_orders: kpis.open_work_orders,
      overall_oee: kpis.oee,
      overall_health: kpis.avg_health_score,
      factories: [factoryWithKpis]
    };
  },

  async getUsers(_factoryId?: string | null): Promise<User[]> {
    return db.users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      factory_id: u.factory_id,
      factory_name: u.factory_name,
      status: u.status,
      created_at: u.created_at
    }));
  }
};
