import React, { useState } from 'react';
import { useData } from '../contexts/DataContext.tsx';
import { PriorityBadge } from '../components/PriorityBadge.tsx';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { CreateWorkOrderModal } from '../components/CreateWorkOrderModal.tsx';
import { formatDuration } from '../utils/formatters.ts';
import { ClipboardList, Plus } from 'lucide-react';

export const WorkOrdersPage: React.FC = () => {
  const { workOrders, machines, createWorkOrder, updateWorkOrder } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleStatusChange = async (id: string, newStatus: any) => {
    await updateWorkOrder(id, { status: newStatus });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-600" />
            <span>Maintenance Work Orders & Dispatching</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Active technician assignments, parts requisitions, and completion sign-offs
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

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 font-bold text-sm text-slate-900">
          Work Orders ({workOrders.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <th className="py-3 px-4">WO ID</th>
                <th className="py-3 px-4">Machine ID</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned Technician</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Est. Hours</th>
                <th className="py-3 px-4 text-right">Update Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {workOrders.map(wo => (
                <tr key={wo.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-medium text-emerald-800">{wo.work_order_id}</td>
                  <td className="py-3 px-4 font-mono text-slate-800">{wo.machine_id}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{wo.title}</td>
                  <td className="py-3 px-4">
                    <PriorityBadge priority={wo.priority} />
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={wo.status} size="sm" />
                  </td>
                  <td className="py-3 px-4">{wo.assigned_to}</td>
                  <td className="py-3 px-4 font-mono text-slate-500">{wo.due_date}</td>
                  <td className="py-3 px-4">{formatDuration(wo.estimated_hours, 'h')}</td>
                  <td className="py-3 px-4 text-right">
                    <select
                      value={wo.status}
                      onChange={e => handleStatusChange(wo.id, e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-md px-2 py-1 focus:outline-hidden focus:border-emerald-600"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </td>
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
