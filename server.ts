import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, verifyPassword } from './server/db.ts';
import { supabaseAdapter, testSupabaseConnection } from './server/supabase.ts';
import type { User, UserRole, Incident, WorkOrder, Machine } from './src/types/index.ts';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// CORS Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-factory-id');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json());

// Extend express Request interface
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    factory_id: string | null;
  };
}

// Authentication middleware
function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization token' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const session = db.sessions.get(token);

  if (!session || session.expiresAt < Date.now()) {
    if (session) db.sessions.delete(token);
    res.status(401).json({ error: 'Unauthorized: Session expired or invalid. Please log in again.' });
    return;
  }

  const user = db.users.find(u => u.id === session.userId);
  if (!user || user.status !== 'active') {
    res.status(401).json({ error: 'Unauthorized: User account not found or deactivated' });
    return;
  }

  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    factory_id: user.factory_id
  };

  next();
}

// Role authorization middleware
function authorizeRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: Role '${req.user.role}' is not authorized to access this resource`
      });
      return;
    }
    next();
  };
}

// Helper to determine and enforce factory isolation
function getResolvedFactoryId(req: AuthenticatedRequest, requestedFactoryId?: string): string | null {
  if (!req.user) return null;

  // Super Admin can inspect any factory
  if (req.user.role === 'SUPER_ADMIN') {
    return requestedFactoryId || (req.query.factory_id as string) || (req.headers['x-factory-id'] as string) || null;
  }

  // Factory Owner or Manager is strictly locked to their factory
  const userFactoryId = req.user.factory_id;
  if (!userFactoryId) return null;

  // If a specific factory was requested, verify it matches the user's factory
  const targetId = requestedFactoryId || (req.query.factory_id as string) || (req.headers['x-factory-id'] as string);
  if (targetId && targetId !== userFactoryId) {
    return '__FORBIDDEN__';
  }

  return userFactoryId;
}

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// Login endpoint
app.post(['/api/auth/login', '/api/auth/login/'], (req: Request, res: Response): void => {
  const { email, username, password } = req.body || {};
  const identifier = (email || username || '').trim().toLowerCase();

  if (!identifier || !password) {
    res.status(400).json({ success: false, error: 'Username/Email and Password are required' });
    return;
  }

  const user = db.users.find(u => {
    const uEmail = u.email.toLowerCase();
    const uName = u.name.toLowerCase();
    const uUsername = uEmail.split('@')[0];
    return (
      uEmail === identifier ||
      uName === identifier ||
      uUsername === identifier ||
      u.id.toLowerCase() === identifier
    );
  });

  if (!user) {
    res.status(401).json({ success: false, error: 'Invalid email/username or password' });
    return;
  }

  const isValid = verifyPassword(password, user.password_hash, user.salt);
  if (!isValid) {
    res.status(401).json({ success: false, error: 'Invalid email/username or password' });
    return;
  }

  // Create session token valid for 24 hours
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

  db.sessions.set(token, {
    userId: user.id,
    role: user.role,
    factoryId: user.factory_id,
    expiresAt
  });

  const factory = user.factory_id ? db.factories.find(f => f.id === user.factory_id) : null;

  // Return user without hash or salt
  const safeUser: User = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    factory_id: user.factory_id,
    factory_name: factory?.name,
    status: user.status,
    created_at: user.created_at
  };

  res.json({
    success: true,
    token,
    user: safeUser,
    factory
  });
});

// Logout endpoint
app.post(['/api/auth/logout', '/api/auth/logout/'], (req: AuthenticatedRequest, res: Response): void => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    db.sessions.delete(token);
  }
  res.json({ success: true, message: 'Successfully logged out' });
});

// Current User Me endpoint
app.get(['/api/auth/me', '/api/auth/me/'], authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const user = db.users.find(u => u.id === req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const factory = user.factory_id ? db.factories.find(f => f.id === user.factory_id) : null;
  const safeUser: User = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    factory_id: user.factory_id,
    factory_name: factory?.name,
    status: user.status,
    created_at: user.created_at
  };

  res.json({
    success: true,
    user: safeUser,
    factory
  });
});

// ==========================================
// SUPER ADMIN ROUTES
// ==========================================

// Super Admin Overview of all 5 factories
app.get('/api/super-admin/overview', authenticate, authorizeRole('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const overview = await supabaseAdapter.getSuperAdminOverview();
  res.json(overview);
});

// ==========================================
// FACTORIES ROUTES
// ==========================================

// List factories
app.get('/api/factories', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user!.role === 'SUPER_ADMIN') {
    // Super Admin gets all factories with their calculated KPIs
    const overview = await supabaseAdapter.getSuperAdminOverview();
    res.json(overview.factories);
    return;
  }

  // Factory Owner or Manager gets ONLY their own factory
  const factories = await supabaseAdapter.getFactories();
  const userFactory = factories.find(f => f.id === req.user!.factory_id);
  if (!userFactory) {
    res.status(404).json({ error: 'Assigned factory not found' });
    return;
  }

  const kpis = await supabaseAdapter.calculateFactoryKPIs(userFactory.id);
  res.json([{
    ...userFactory,
    machine_count: kpis.total_machines,
    running_count: kpis.running_machines,
    oee: kpis.oee,
    active_incidents: kpis.active_incidents,
    open_work_orders: kpis.open_work_orders,
    kpis
  }]);
});

// Get specific factory
app.get('/api/factories/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const factoryId = req.params.id;

  // Strict isolation check
  if (req.user!.role !== 'SUPER_ADMIN' && req.user!.factory_id !== factoryId) {
    res.status(403).json({
      error: `Forbidden: You do not have permission to access factory ${factoryId}`
    });
    return;
  }

  const factory = await supabaseAdapter.getFactoryById(factoryId);
  if (!factory) {
    res.status(404).json({ error: 'Factory not found' });
    return;
  }

  const kpis = await supabaseAdapter.calculateFactoryKPIs(factory.id);
  res.json({
    ...factory,
    machine_count: kpis.total_machines,
    running_count: kpis.running_machines,
    oee: kpis.oee,
    active_incidents: kpis.active_incidents,
    open_work_orders: kpis.open_work_orders,
    kpis
  });
});

// Get factory dynamic KPIs
app.get('/api/factories/:id/stats', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const factoryId = req.params.id;

  // Strict isolation check
  if (req.user!.role !== 'SUPER_ADMIN' && req.user!.factory_id !== factoryId) {
    res.status(403).json({
      error: `Forbidden: Access to factory ${factoryId} data is denied`
    });
    return;
  }

  const kpis = await supabaseAdapter.calculateFactoryKPIs(factoryId);
  res.json(kpis);
});

// ==========================================
// Supabase Status Health Check Endpoint
app.get('/api/supabase/status', async (_req: Request, res: Response): Promise<void> => {
  const status = await testSupabaseConnection();
  res.json(status);
});

// ==========================================
// OPERATIONAL ROUTES (MACHINES, PRODUCTION, ETC.)
// ==========================================

// Machines
app.get('/api/machines', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const lineId = req.query.line_id as string;
  try {
    const machines = await supabaseAdapter.getMachines(lineId);
    res.json(machines);
  } catch (err: any) {
    console.error('[API /api/machines] Error:', err.message);
    res.status(503).json({
      error: err.message,
      code: err.code || 'DATABASE_UNAVAILABLE',
      table: 'machines',
      isSupabaseUnavailable: true
    });
  }
});

app.get('/api/machines/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const machine = await supabaseAdapter.getMachineById(req.params.id);
    if (!machine) {
      res.status(404).json({ error: `Machine ${req.params.id} not found` });
      return;
    }
    res.json(machine);
  } catch (err: any) {
    console.error(`[API /api/machines/${req.params.id}] Error:`, err.message);
    res.status(503).json({
      error: err.message,
      code: err.code || 'DATABASE_UNAVAILABLE',
      table: 'machines',
      isSupabaseUnavailable: true
    });
  }
});

// Create Machine
app.post('/api/machines', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const machineData = req.body;
    if (!machineData.machine_name && !machineData.name) {
      res.status(400).json({ error: 'Machine name is required' });
      return;
    }
    const created = await supabaseAdapter.createMachine(machineData);
    res.status(201).json(created);
  } catch (err: any) {
    console.error('[API POST /api/machines] Error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to create machine' });
  }
});

// Update Machine
app.put('/api/machines/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const updated = await supabaseAdapter.updateMachine(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: `Machine ${req.params.id} not found or could not be updated` });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    console.error(`[API PUT /api/machines/${req.params.id}] Error:`, err.message);
    res.status(500).json({ error: err.message || 'Failed to update machine' });
  }
});

// Quick update machine status
app.patch('/api/machines/:id/status', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    if (!status) {
      res.status(400).json({ error: 'Status is required' });
      return;
    }
    const updated = await supabaseAdapter.updateMachine(req.params.id, { status });
    if (!updated) {
      res.status(404).json({ error: `Machine ${req.params.id} not found` });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    console.error(`[API PATCH /api/machines/${req.params.id}/status] Error:`, err.message);
    res.status(500).json({ error: err.message || 'Failed to update machine status' });
  }
});

// Delete Machine
app.delete('/api/machines/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const success = await supabaseAdapter.deleteMachine(req.params.id);
    res.json({ success, machine_id: req.params.id });
  } catch (err: any) {
    console.error(`[API DELETE /api/machines/${req.params.id}] Error:`, err.message);
    res.status(500).json({ error: err.message || 'Failed to delete machine' });
  }
});

// Production records
app.get('/api/production', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const lineId = req.query.line_id as string;
  try {
    const records = await supabaseAdapter.getProduction(lineId);
    res.json(records);
  } catch (err: any) {
    console.error('[API /api/production] Error:', err.message);
    res.status(503).json({
      error: err.message,
      code: err.code || 'DATABASE_UNAVAILABLE',
      table: 'production_records',
      isSupabaseUnavailable: true
    });
  }
});

// Maintenance records
app.get('/api/maintenance', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const lineId = req.query.line_id as string;
  try {
    const records = await supabaseAdapter.getMaintenance(lineId);
    res.json(records);
  } catch (err: any) {
    console.error('[API /api/maintenance] Error:', err.message);
    res.status(503).json({
      error: err.message,
      code: err.code || 'DATABASE_UNAVAILABLE',
      table: 'maintenance_records',
      isSupabaseUnavailable: true
    });
  }
});

// Incidents
app.get('/api/incidents', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const lineId = req.query.line_id as string;
  try {
    const incidents = await supabaseAdapter.getIncidents(lineId);
    res.json(incidents);
  } catch (err: any) {
    console.error('[API /api/incidents] Error:', err.message);
    res.status(503).json({
      error: err.message,
      code: err.code || 'DATABASE_UNAVAILABLE',
      table: 'incidents',
      isSupabaseUnavailable: true
    });
  }
});

app.post('/api/incidents', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { machine_id, title, description, severity } = req.body;
  try {
    const newIncident: Incident = {
      id: `INC-${Date.now()}`,
      incident_id: `INC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      factory_id: 'FAC-001',
      machine_id: machine_id || 'M001',
      title: title || 'Operational Anomaly',
      description: description || '',
      severity: severity || 'Medium',
      status: 'Open',
      reported_by: req.user!.name,
      reported_at: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      shift: 'A',
      line_id: '',
      line_name: '',
      machine_name: '',
      incident_type: 'Operational Anomaly',
      failure_category: 'Mechanical',
      problem_description: title || 'Operational Anomaly',
      downtime_minutes: 0,
      defect_units: 0
    };

    const created = await supabaseAdapter.createIncident(newIncident);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Work Orders
app.get('/api/work-orders', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const lineId = req.query.line_id as string;
  try {
    const workOrders = await supabaseAdapter.getWorkOrders(lineId);
    res.json(workOrders);
  } catch (err: any) {
    console.error('[API /api/work-orders] Error:', err.message);
    res.status(503).json({
      error: err.message,
      code: err.code || 'DATABASE_UNAVAILABLE',
      table: 'work_orders',
      isSupabaseUnavailable: true
    });
  }
});

app.post('/api/work-orders', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { machine_id, title, priority, assigned_to, due_date, estimated_hours, parts_required } = req.body;
  try {
    const newWorkOrder: WorkOrder = {
      id: `WO-${Date.now()}`,
      work_order_id: `WO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      factory_id: 'FAC-001',
      machine_id: machine_id || 'M001',
      title: title || 'Maintenance Task',
      priority: priority || 'Medium',
      status: 'Pending',
      assigned_to: assigned_to || req.user!.name || 'Assigned Technician',
      due_date: due_date || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      estimated_hours: Number(estimated_hours) || 2,
      parts_required: parts_required || '',
      line_id: '',
      line_name: '',
      machine_name: '',
      duration_minutes: 120,
      downtime_minutes: 0,
      labor_hours: 2,
      labor_cost: 1200,
      parts_cost: 0,
      total_cost: 1200,
      work_order_type: 'Corrective'
    };

    const created = await supabaseAdapter.createWorkOrder(newWorkOrder);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/work-orders/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, assigned_to, actual_hours } = req.body;
    const updates: Partial<WorkOrder> = {};
    if (status) updates.status = status;
    if (assigned_to) updates.assigned_to = assigned_to;
    if (actual_hours !== undefined) updates.actual_hours = Number(actual_hours);
    if (status === 'Completed') {
      updates.completed_at = new Date().toISOString();
    }

    const updated = await supabaseAdapter.updateWorkOrder(req.params.id, updates);
    res.json(updated || { id: req.params.id, ...updates });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// SOPs
app.get('/api/sops', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const resolvedFactoryId = getResolvedFactoryId(req);

  if (resolvedFactoryId === '__FORBIDDEN__') {
    res.status(403).json({ error: 'Forbidden: Cannot access SOPs for another factory' });
    return;
  }

  const factoryId = resolvedFactoryId || 'FAC-001';
  const sops = await supabaseAdapter.getSOPs(factoryId);
  res.json(sops);
});

// Data Quality
app.get('/api/data-quality', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const resolvedFactoryId = getResolvedFactoryId(req);

  if (resolvedFactoryId === '__FORBIDDEN__') {
    res.status(403).json({ error: 'Forbidden: Cannot access data quality for another factory' });
    return;
  }

  const factoryId = resolvedFactoryId || 'FAC-001';
  const dq = await supabaseAdapter.getDataQuality(factoryId);
  res.json(dq);
});

// Users Management
app.get('/api/users', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const factoryId = req.user!.role === 'SUPER_ADMIN' ? null : req.user!.factory_id;
  const users = await supabaseAdapter.getUsers(factoryId);
  res.json(users);
});

// ==========================================
// AI CHATBOT & OPERATIONS COPILOT (GEMINI API)
// ==========================================
app.post('/api/ai/chat', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { message, history } = req.body;

  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  try {
    // 1. Gather live operational plant telemetry from real database
    const [machines, incidents, workOrders, sops] = await Promise.all([
      supabaseAdapter.getMachines().catch(() => []),
      supabaseAdapter.getIncidents().catch(() => []),
      supabaseAdapter.getWorkOrders().catch(() => []),
      supabaseAdapter.getSOPs().catch(() => [])
    ]);

    const runningCount = machines.filter(m => {
      const s = String(m.status || '').toLowerCase();
      return s === 'running' || s === 'active';
    }).length;
    const warningCount = machines.filter(m => {
      const s = String(m.status || '').toLowerCase();
      return s === 'warning';
    }).length;
    const maintCount = machines.filter(m => {
      const s = String(m.status || '').toLowerCase();
      return s === 'maintenance';
    }).length;
    const offlineCount = machines.filter(m => {
      const s = String(m.status || '').toLowerCase();
      return s === 'offline' || s === 'inactive';
    }).length;

    const criticalIncidents = incidents.filter(i => i.severity === 'Critical');
    const openIncidents = incidents.filter(i => i.status !== 'Closed');
    const openWorkOrders = workOrders.filter(w => w.status !== 'Completed');

    // Context summary for grounding the AI
    const plantContext = `
FactoryOps Live Operational Snapshot:
- Plant: Austin Gigafactory Precision Engineering (APX-01)
- User: ${req.user?.name || 'Operator'} (${req.user?.role || 'Staff'})
- Total Connected Fleet: ${machines.length} machines
  - Running/Active: ${runningCount}
  - Warning/Degraded: ${warningCount}
  - In Maintenance: ${maintCount}
  - Offline: ${offlineCount}
- Connected Machines: ${machines.slice(0, 12).map(m => `${m.machine_id} (${m.name}, Line: ${m.line}, Status: ${m.status}, Health: ${m.health_score}%, OEE: ${m.oee}%)`).join('; ')}
- Incidents: ${incidents.length} total logged (${openIncidents.length} open, ${criticalIncidents.length} critical). Recent critical/high: ${incidents.filter(i => i.severity === 'Critical' || i.severity === 'High').slice(0, 4).map(i => `${i.incident_id} on ${i.machine_id}: ${i.title} (${i.severity})`).join('; ')}
- Work Orders: ${workOrders.length} total (${openWorkOrders.length} active/pending). Recent: ${openWorkOrders.slice(0, 4).map(w => `${w.work_order_id} [${w.priority}]: ${w.title} assigned to ${w.assigned_to}`).join('; ')}
- Standard Operating Procedures (SOPs): ${sops.slice(0, 5).map(s => `${s.id}: ${s.title} (${s.category})`).join('; ')}
- Overall Plant Performance: ~90.24% OEE, ~209.35K downtime minutes across 6,480 shift runs, ~56K defects recorded.
`;

    // 2. Check if GEMINI_API_KEY is available
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI();
        const systemInstruction = `You are the FactoryOps AI Operations & Maintenance Copilot, an industrial artificial intelligence assistant embedded into the FactoryOps platform.
You assist plant managers, reliability engineers, shift supervisors, technicians, and production planners with:
1. Equipment telemetry analysis, predictive maintenance alerts, and vibration/temperature threshold interpretation.
2. Troubleshooting machine stoppages, root cause triage (5 Whys, Ishikawa), and downtime reduction.
3. Scheduling work orders, prioritizing critical repairs, and assigning maintenance staff (e.g. Vikram Singh).
4. Standard Operating Procedures (SOPs) step-by-step guidance.
5. Production targets, OEE optimization (Availability, Performance, Quality), and scrap reduction.

Rules:
- Be concise, direct, and actionable. Use bullet points or numbered steps where appropriate.
- When referencing specific machines (e.g., M013, M021, M003), use their exact IDs and names from the live context.
- Format all numeric values cleanly (e.g., round downtime to 1 decimal place, percentages to 1 or 2 decimals). Never output excessive floating point numbers like 241.39999998.
- Maintain an authoritative, professional industrial engineering tone.

${plantContext}`;

        // Convert conversation history if present
        const contents: any[] = [];
        if (Array.isArray(history)) {
          history.slice(-8).forEach(h => {
            if (h.role && h.text) {
              contents.push({
                role: h.role === 'assistant' || h.role === 'model' ? 'model' : 'user',
                parts: [{ text: h.text }]
              });
            }
          });
        }
        contents.push({
          role: 'user',
          parts: [{ text: message }]
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction,
            temperature: 0.3
          }
        });

        const replyText = response.text || 'Operational analysis complete. No additional issues detected.';
        res.json({ reply: replyText, timestamp: new Date().toISOString() });
        return;
      } catch (genError: any) {
        console.warn('[Gemini API] Failed, falling back to grounded domain response:', genError.message);
      }
    }

    // Fallback response generator using grounded factory data if API key is not configured or temporary error occurs
    let fallbackReply = '';
    const lower = message.toLowerCase();
    if (lower.includes('machine') || lower.includes('status') || lower.includes('running') || lower.includes('fleet')) {
      fallbackReply = `Currently, the Austin Gigafactory has **${machines.length} connected machines**:\n` +
        `- **${runningCount} Running** in nominal operating window\n` +
        `- **${warningCount} Warning** (elevated temperature or vibration telemetry)\n` +
        `- **${maintCount} Maintenance** undergoing scheduled servicing\n` +
        `- **${offlineCount} Offline**\n\n` +
        `Top attention needed: **${machines.filter(m => m.status === 'warning' || m.status === 'maintenance').map(m => m.machine_id).slice(0, 3).join(', ') || 'All units nominal'}**.`;
    } else if (lower.includes('downtime') || lower.includes('shortfall') || lower.includes('hours') || lower.includes('minutes')) {
      fallbackReply = `**Production Downtime & Output Summary:**\n` +
        `- Cumulative downtime logged across all shifts: **209.4 hours** (209.35K minutes across 6,480 shift runs).\n` +
        `- Overall Plant OEE: **90.2%** (Target: 85.0%).\n` +
        `- Shift shortfall is primarily concentrated in machining and grinding cells due to tool re-alignment. Recommended action: verify coolant flow and preventive spindle lubrication.`;
    } else if (lower.includes('incident') || lower.includes('critical') || lower.includes('fault') || lower.includes('failure')) {
      fallbackReply = `**Incident Triage Snapshot:**\n` +
        `- Total recorded incidents: **${incidents.length}** (${openIncidents.length} currently open).\n` +
        `- Critical / High incidents: **${criticalIncidents.length} critical**, **${incidents.filter(i => i.severity === 'High').length} high**.\n` +
        `- Recent issue: **INC-0098** on Precision Cylindrical Grinder (Mechanical guideway check).\n` +
        `Review SOP-004 (Emergency Machine Shutdown & Triage) before resuming full feed rate.`;
    } else if (lower.includes('work order') || lower.includes('task') || lower.includes('repair')) {
      fallbackReply = `**Maintenance Work Orders:**\n` +
        `- Total active work orders: **${openWorkOrders.length}** open tasks.\n` +
        `- Pending parts: **1** order awaiting spare replacement.\n` +
        `- In progress: **5** active repairs assigned to floor technicians.\n` +
        `- Primary technician on duty: **Vikram Singh** (29 tasks completed/logged).`;
    } else {
      fallbackReply = `**FactoryOps AI Operations Assistant:**\n` +
        `Live plant status is nominal with **${runningCount} of ${machines.length} cells active** and plant OEE tracking at **90.2%**.\n\n` +
        `How can I assist your shift operations? You can ask me to:\n` +
        `1. Triage active machine alarms or vibration anomalies.\n` +
        `2. Recommend maintenance work order priorities.\n` +
        `3. Review SOP standard operating procedures.\n` +
        `4. Analyze shift production shortfalls and downtime causes.`;
    }

    res.json({ reply: fallbackReply, timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error('[API /api/ai/chat] Error:', err);
    res.status(500).json({ error: err.message || 'AI Copilot service encountered an error' });
  }
});

// API 404 Fallback - Ensures unhandled API routes return JSON and NEVER fall through to HTML/Vite
app.all('/api/*', (req: Request, res: Response): void => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
});

// Global API Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction): void => {
  if (req.path.startsWith('/api')) {
    console.error('[API Error]', err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
    return;
  }
  next(err);
});

// ==========================================
// VITE DEV SERVER / STATIC ASSETS
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`[FactoryOps] Enterprise Server running at http://0.0.0.0:${PORT}`);
    await testSupabaseConnection();
  });
}

startServer();
