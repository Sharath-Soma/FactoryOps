import React, { useState } from 'react';
import { useData } from '../contexts/DataContext.tsx';
import { SeverityBadge } from '../components/SeverityBadge.tsx';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { CreateIncidentModal } from '../components/CreateIncidentModal.tsx';
import { AlertTriangle, Plus } from 'lucide-react';

export const IncidentsPage: React.FC = () => {
  const { incidents, machines, createIncident } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('all');

  const filteredIncidents = incidents.filter(i => {
    if (filterSeverity !== 'all' && i.severity.toLowerCase() !== filterSeverity.toLowerCase()) {
      return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span>Operational Incident Log & Root Cause Triage</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time equipment stoppages, quality deviations, and operator reports
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Report Incident</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">Filter Severity:</span>
        {['all', 'critical', 'high', 'medium', 'low'].map(sev => (
          <button
            key={sev}
            onClick={() => setFilterSeverity(sev)}
            className={`px-2.5 py-1 rounded text-xs capitalize font-medium transition-colors ${
              filterSeverity === sev
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {sev}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 font-bold text-sm text-slate-900">
          Incident Reports ({filteredIncidents.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <th className="py-3 px-4">Incident ID</th>
                <th className="py-3 px-4">Machine ID</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Reported By</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Root Cause Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredIncidents.map(inc => (
                <tr key={inc.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-medium text-emerald-800">{inc.incident_id}</td>
                  <td className="py-3 px-4 font-mono text-slate-800">{inc.machine_id}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{inc.title}</td>
                  <td className="py-3 px-4">
                    <SeverityBadge severity={inc.severity} />
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={inc.status} size="sm" />
                  </td>
                  <td className="py-3 px-4">{inc.reported_by}</td>
                  <td className="py-3 px-4 font-mono text-slate-500">
                    {new Date(inc.reported_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 max-w-xs text-slate-600">{inc.root_cause || 'Under investigation'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CreateIncidentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        machines={machines}
        onSubmit={async data => {
          await createIncident(data);
        }}
      />
    </div>
  );
};
