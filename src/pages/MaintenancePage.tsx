import React, { useState } from 'react';
import { useData } from '../contexts/DataContext.tsx';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { CreateWorkOrderModal } from '../components/CreateWorkOrderModal.tsx';
import { Wrench, Plus } from 'lucide-react';
import { formatDuration, formatCurrency } from '../utils/formatters.ts';

export const MaintenancePage: React.FC = () => {
  const { maintenance, machines, createWorkOrder } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const totalCost = maintenance.reduce((sum, m) => sum + m.cost_usd, 0);
  const totalDowntime = maintenance.reduce((sum, m) => sum + m.downtime_hours, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Wrench className="w-5 h-5 text-emerald-600" />
            <span>Plant Maintenance Schedules & Tasks</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Preventive, predictive and corrective maintenance records
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Work Order</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Scheduled Actions</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{maintenance.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Cumulative Downtime</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">{formatDuration(totalDowntime, 'hrs')}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Total Maintenance Cost</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(totalCost)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Predictive Ratio</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">68%</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 font-bold text-sm text-slate-900">
          Maintenance Records & Tasks
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <th className="py-3 px-4">Machine ID</th>
                <th className="py-3 px-4">Maintenance Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Scheduled Date</th>
                <th className="py-3 px-4">Technician</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Downtime</th>
                <th className="py-3 px-4">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {maintenance.map(m => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-medium text-emerald-800">{m.machine_id}</td>
                  <td className="py-3 px-4 font-medium">{m.type}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={m.status} size="sm" />
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500">{m.scheduled_date}</td>
                  <td className="py-3 px-4">{m.technician}</td>
                  <td className="py-3 px-4 max-w-xs text-slate-600">{m.description}</td>
                  <td className="py-3 px-4 font-medium text-amber-700">{formatDuration(m.downtime_hours, 'h')}</td>
                  <td className="py-3 px-4 text-emerald-700 font-semibold">{formatCurrency(m.cost_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CreateWorkOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        machines={machines}
        onSubmit={async data => {
          await createWorkOrder(data);
        }}
      />
    </div>
  );
};
