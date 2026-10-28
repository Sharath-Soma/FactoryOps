import React, { useState } from 'react';
import type { Machine } from '../types/index.ts';
import { X, ClipboardList, Send } from 'lucide-react';

interface CreateWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  machines: Machine[];
  onSubmit: (data: {
    machine_id: string;
    title: string;
    priority: string;
    assigned_to: string;
    due_date: string;
    estimated_hours: number;
    parts_required?: string;
  }) => Promise<void>;
}

export const CreateWorkOrderModal: React.FC<CreateWorkOrderModalProps> = ({
  isOpen,
  onClose,
  machines,
  onSubmit
}) => {
  const [machineId, setMachineId] = useState<string>(machines[0]?.machine_id || '');
  const [title, setTitle] = useState<string>('');
  const [priority, setPriority] = useState<string>('Medium');
  const [assignedTo, setAssignedTo] = useState<string>('Senior Field Tech');
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]
  );
  const [estimatedHours, setEstimatedHours] = useState<number>(3);
  const [partsRequired, setPartsRequired] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !machineId) {
      setError('Please provide a title and select a machine');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        machine_id: machineId,
        title,
        priority,
        assigned_to: assignedTo,
        due_date: dueDate,
        estimated_hours: estimatedHours,
        parts_required: partsRequired
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch work order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 text-slate-800 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Issue Maintenance Work Order</h2>
              <p className="text-xs text-slate-500">Dispatch corrective or preventive service task</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Target Machine *</label>
            <select
              value={machineId}
              onChange={e => setMachineId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-slate-900 focus:outline-hidden focus:border-emerald-600"
              required
            >
              {machines.map(m => (
                <option key={m.id} value={m.machine_id}>
                  {m.machine_id} - {m.name} ({m.line})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Work Order Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Replace Hydraulic Valve Pack & Calibrate Backlash"
              className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-slate-900 focus:outline-hidden focus:border-emerald-600 placeholder-slate-400"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-slate-900 focus:outline-hidden focus:border-emerald-600"
              >
                <option value="Low">Low - Routine</option>
                <option value="Medium">Medium - Next Shift</option>
                <option value="High">High - Urgent</option>
                <option value="Critical">Critical - Immediate</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Assigned Technician</label>
              <input
                type="text"
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-slate-900 focus:outline-hidden focus:border-emerald-600"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Target Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-slate-900 focus:outline-hidden focus:border-emerald-600"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Estimated Hours</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={estimatedHours}
                onChange={e => setEstimatedHours(parseFloat(e.target.value) || 1)}
                className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-slate-900 focus:outline-hidden focus:border-emerald-600"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Parts & Consumables</label>
            <input
              type="text"
              value={partsRequired}
              onChange={e => setPartsRequired(e.target.value)}
              placeholder="e.g. 1x O-Ring Kit #440, 20L Hydraulic Oil"
              className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-slate-900 focus:outline-hidden focus:border-emerald-600 placeholder-slate-400"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3.5 py-1.5 bg-[#0E79B2] hover:bg-[#0E79B2]/90 text-white rounded-md font-semibold flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Dispatching...' : 'Dispatch Order'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
