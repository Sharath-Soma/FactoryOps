import type {
  User,
  Factory,
  Machine,
  ProductionRecord,
  MaintenanceRecord,
  Incident,
  WorkOrder,
  SOP,
  DataQualityMetric,
  FactoryKPIs,
  SuperAdminOverview
} from '../types/index.ts';

const TOKEN_KEY = 'factoryops_auth_token';

class ApiService {
  private inspectingFactoryId: string | null = null;

  public setInspectingFactoryId(factoryId: string | null) {
    this.inspectingFactoryId = factoryId;
  }

  public getInspectingFactoryId(): string | null {
    return this.inspectingFactoryId;
  }

  public getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  public setToken(token: string | null) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Attach active inspecting factory header if set (for Super Admin)
    if (this.inspectingFactoryId) {
      headers['x-factory-id'] = this.inspectingFactoryId;
    }

    // If query string needs factory_id appended
    let url = endpoint;
    if (this.inspectingFactoryId && !endpoint.includes('factory_id=')) {
      const sep = url.includes('?') ? '&' : '?';
      url = `${url}${sep}factory_id=${encodeURIComponent(this.inspectingFactoryId)}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    const text = await response.text();
    let data: any;

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      // If response is HTML or non-JSON
      if (text.trim().startsWith('<')) {
        throw new Error(
          `API endpoint '${endpoint}' returned HTML instead of JSON (${response.status} ${response.statusText}). ` +
          `Backend server route may be unavailable.`
        );
      }
      throw new Error(`Failed to parse response as JSON (${response.status}): ${text.slice(0, 100)}`);
    }

    // For non-login routes, a 401 indicates session expiration
    if (response.status === 401) {
      if (!endpoint.includes('/api/auth/login')) {
        this.setToken(null);
        window.dispatchEvent(new CustomEvent('factoryops:unauthorized'));
        throw new Error(data?.error || 'Session expired or unauthorized');
      } else {
        throw new Error(data?.error || 'Invalid email/username or password');
      }
    }

    if (!response.ok) {
      throw new Error(data?.error || `Request failed with status ${response.status}`);
    }

    return data as T;
  }

  // --- Auth ---
  public auth = {
    login: async (credentials: { email?: string; username?: string; password: string }) => {
      const res = await this.request<{ success?: boolean; token: string; user: User; factory: Factory | null }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      if (res.token) {
        this.setToken(res.token);
      }
      return res;
    },
    logout: async () => {
      try {
        await this.request('/api/auth/logout', { method: 'POST' });
      } catch {
        // Ignore logout errors
      } finally {
        this.setToken(null);
        this.setInspectingFactoryId(null);
      }
    },
    me: async () => {
      return this.request<{ user: User; factory: Factory | null }>('/api/auth/me');
    }
  };

  // --- Super Admin ---
  public superAdmin = {
    getOverview: async (): Promise<SuperAdminOverview> => {
      return this.request<SuperAdminOverview>('/api/super-admin/overview');
    }
  };

  // --- Factories ---
  public factories = {
    getAll: async (): Promise<Factory[]> => {
      return this.request<Factory[]>('/api/factories');
    },
    getById: async (id: string): Promise<Factory & { kpis: FactoryKPIs }> => {
      return this.request<Factory & { kpis: FactoryKPIs }>(`/api/factories/${id}`);
    },
    getStats: async (id: string): Promise<FactoryKPIs> => {
      return this.request<FactoryKPIs>(`/api/factories/${id}/stats`);
    }
  };

  // --- Machines ---
  public machines = {
    getAll: async (factoryId?: string): Promise<Machine[]> => {
      const q = factoryId ? `?factory_id=${encodeURIComponent(factoryId)}` : '';
      return this.request<Machine[]>(`/api/machines${q}`);
    },
    getById: async (id: string): Promise<Machine> => {
      return this.request<Machine>(`/api/machines/${id}`);
    },
    create: async (machineData: Partial<Machine>): Promise<Machine> => {
      return this.request<Machine>('/api/machines', {
        method: 'POST',
        body: JSON.stringify(machineData)
      });
    },
    update: async (id: string, updates: Partial<Machine>): Promise<Machine> => {
      return this.request<Machine>(`/api/machines/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    },
    updateStatus: async (id: string, status: string): Promise<Machine> => {
      return this.request<Machine>(`/api/machines/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
    },
    delete: async (id: string): Promise<{ success: boolean; machine_id: string }> => {
      return this.request<{ success: boolean; machine_id: string }>(`/api/machines/${id}`, {
        method: 'DELETE'
      });
    }
  };

  // --- Production ---
  public production = {
    getAll: async (factoryId?: string): Promise<ProductionRecord[]> => {
      const q = factoryId ? `?factory_id=${encodeURIComponent(factoryId)}` : '';
      return this.request<ProductionRecord[]>(`/api/production${q}`);
    }
  };

  // --- Maintenance ---
  public maintenance = {
    getAll: async (factoryId?: string): Promise<MaintenanceRecord[]> => {
      const q = factoryId ? `?factory_id=${encodeURIComponent(factoryId)}` : '';
      return this.request<MaintenanceRecord[]>(`/api/maintenance${q}`);
    }
  };

  // --- Incidents ---
  public incidents = {
    getAll: async (factoryId?: string): Promise<Incident[]> => {
      const q = factoryId ? `?factory_id=${encodeURIComponent(factoryId)}` : '';
      return this.request<Incident[]>(`/api/incidents${q}`);
    },
    create: async (data: { machine_id: string; title: string; description: string; severity: string }): Promise<Incident> => {
      return this.request<Incident>('/api/incidents', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
  };

  // --- Work Orders ---
  public workOrders = {
    getAll: async (factoryId?: string): Promise<WorkOrder[]> => {
      const q = factoryId ? `?factory_id=${encodeURIComponent(factoryId)}` : '';
      return this.request<WorkOrder[]>(`/api/work-orders${q}`);
    },
    create: async (data: {
      machine_id: string;
      title: string;
      priority: string;
      assigned_to: string;
      due_date: string;
      estimated_hours: number;
      parts_required?: string;
    }): Promise<WorkOrder> => {
      return this.request<WorkOrder>('/api/work-orders', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    update: async (id: string, updates: Partial<WorkOrder>): Promise<WorkOrder> => {
      return this.request<WorkOrder>(`/api/work-orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
    }
  };

  // --- SOPs ---
  public sops = {
    getAll: async (factoryId?: string): Promise<SOP[]> => {
      const q = factoryId ? `?factory_id=${encodeURIComponent(factoryId)}` : '';
      return this.request<SOP[]>(`/api/sops${q}`);
    }
  };

  // --- Data Quality ---
  public dataQuality = {
    getAll: async (factoryId?: string): Promise<DataQualityMetric[]> => {
      const q = factoryId ? `?factory_id=${encodeURIComponent(factoryId)}` : '';
      return this.request<DataQualityMetric[]>(`/api/data-quality${q}`);
    }
  };

  // --- Users ---
  public users = {
    getAll: async (): Promise<User[]> => {
      return this.request<User[]>('/api/users');
    }
  };

  // --- AI Operations Copilot ---
  public ai = {
    chat: async (message: string, history?: { role: string; text: string }[]): Promise<{ reply: string; timestamp: string }> => {
      return this.request<{ reply: string; timestamp: string }>('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message, history })
      });
    }
  };
}

export const api = new ApiService();
