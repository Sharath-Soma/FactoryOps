import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  Machine,
  ProductionRecord,
  MaintenanceRecord,
  Incident,
  WorkOrder,
  SOP,
  DataQualityMetric,
  FactoryKPIs
} from '../types/index.ts';
import { api } from '../services/api.ts';
import { useAuth } from './AuthContext.tsx';

interface DataContextType {
  machines: Machine[];
  production: ProductionRecord[];
  maintenance: MaintenanceRecord[];
  incidents: Incident[];
  workOrders: WorkOrder[];
  sops: SOP[];
  dataQuality: DataQualityMetric[];
  kpis: FactoryKPIs | null;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  createIncident: (data: { machine_id: string; title: string; description: string; severity: string }) => Promise<Incident>;
  createWorkOrder: (data: {
    machine_id: string;
    title: string;
    priority: string;
    assigned_to: string;
    due_date: string;
    estimated_hours: number;
    parts_required?: string;
  }) => Promise<WorkOrder>;
  updateWorkOrder: (id: string, updates: Partial<WorkOrder>) => Promise<WorkOrder>;
  createMachine: (data: Partial<Machine>) => Promise<Machine>;
  updateMachine: (id: string, updates: Partial<Machine>) => Promise<Machine>;
  updateMachineStatus: (id: string, status: string) => Promise<Machine>;
  deleteMachine: (id: string) => Promise<boolean>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, activeFactory, isAuthenticated } = useAuth();

  const [machines, setMachines] = useState<Machine[]>([]);
  const [production, setProduction] = useState<ProductionRecord[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [sops, setSops] = useState<SOP[]>([]);
  const [dataQuality, setDataQuality] = useState<DataQualityMetric[]>([]);
  const [kpis, setKpis] = useState<FactoryKPIs | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    if (!isAuthenticated) {
      setMachines([]);
      setProduction([]);
      setMaintenance([]);
      setIncidents([]);
      setWorkOrders([]);
      setSops([]);
      setDataQuality([]);
      setKpis(null);
      return;
    }

    // If Super Admin is on global dashboard (not inspecting a factory)
    if (user?.role === 'SUPER_ADMIN' && !activeFactory) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const factoryId = activeFactory?.id;

    try {
      const [
        machinesData,
        productionData,
        maintenanceData,
        incidentsData,
        workOrdersData,
        sopsData,
        dataQualityData,
        kpiData
      ] = await Promise.all([
        api.machines.getAll(factoryId),
        api.production.getAll(factoryId),
        api.maintenance.getAll(factoryId),
        api.incidents.getAll(factoryId),
        api.workOrders.getAll(factoryId),
        api.sops.getAll(factoryId),
        api.dataQuality.getAll(factoryId),
        factoryId ? api.factories.getStats(factoryId) : Promise.resolve(null)
      ]);

      setMachines(machinesData);
      setProduction(productionData);
      setMaintenance(maintenanceData);
      setIncidents(incidentsData);
      setWorkOrders(workOrdersData);
      setSops(sopsData);
      setDataQuality(dataQualityData);
      setKpis(kpiData);
    } catch (err: any) {
      console.error('Error fetching factory data:', err);
      setError(err.message || 'Failed to load factory operational records');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.role, activeFactory]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const createIncident = async (data: { machine_id: string; title: string; description: string; severity: string }) => {
    const newInc = await api.incidents.create(data);
    setIncidents(prev => [newInc, ...prev]);
    if (activeFactory) {
      const updatedKpis = await api.factories.getStats(activeFactory.id);
      setKpis(updatedKpis);
    }
    return newInc;
  };

  const createWorkOrder = async (data: {
    machine_id: string;
    title: string;
    priority: string;
    assigned_to: string;
    due_date: string;
    estimated_hours: number;
    parts_required?: string;
  }) => {
    const newWo = await api.workOrders.create(data);
    setWorkOrders(prev => [newWo, ...prev]);
    if (activeFactory) {
      const updatedKpis = await api.factories.getStats(activeFactory.id);
      setKpis(updatedKpis);
    }
    return newWo;
  };

  const updateWorkOrder = async (id: string, updates: Partial<WorkOrder>) => {
    const updated = await api.workOrders.update(id, updates);
    setWorkOrders(prev => prev.map(wo => (wo.id === id || wo.work_order_id === id ? updated : wo)));
    return updated;
  };

  const createMachine = async (data: Partial<Machine>) => {
    const newMachine = await api.machines.create(data);
    setMachines(prev => [newMachine, ...prev]);
    return newMachine;
  };

  const updateMachine = async (id: string, updates: Partial<Machine>) => {
    const updated = await api.machines.update(id, updates);
    setMachines(prev => prev.map(m => (m.id === id || m.machine_id === id ? updated : m)));
    return updated;
  };

  const updateMachineStatus = async (id: string, status: string) => {
    const updated = await api.machines.updateStatus(id, status);
    setMachines(prev => prev.map(m => (m.id === id || m.machine_id === id ? updated : m)));
    return updated;
  };

  const deleteMachine = async (id: string) => {
    const res = await api.machines.delete(id);
    if (res.success) {
      setMachines(prev => prev.filter(m => m.id !== id && m.machine_id !== id));
      return true;
    }
    return false;
  };

  return (
    <DataContext.Provider
      value={{
        machines,
        production,
        maintenance,
        incidents,
        workOrders,
        sops,
        dataQuality,
        kpis,
        isLoading,
        error,
        refreshData,
        createIncident,
        createWorkOrder,
        updateWorkOrder,
        createMachine,
        updateMachine,
        updateMachineStatus,
        deleteMachine
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
