import React from 'react';
import { useData } from '../contexts/DataContext.tsx';
import { useFilters } from '../contexts/FilterContext.tsx';
import { GlobalFilterBar } from '../components/GlobalFilterBar.tsx';
import { TrendingUp, Layers } from 'lucide-react';
import {
  formatWholeNumber,
  formatPercent,
  formatScrap,
  formatNumber
} from '../utils/formatters.ts';

export const ProductionPage: React.FC = () => {
  const { production, kpis } = useData();
  const { selectedShift, searchQuery } = useFilters();

  const filteredProduction = production.filter(p => {
    if (selectedShift !== 'all' && p.shift !== selectedShift) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.machine_id.toLowerCase().includes(q) || p.operator.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <span>Production Runs & Shift Output</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Shift-by-shift output, scrap generation, and cycle time performance
          </p>
        </div>
      </div>

      <GlobalFilterBar />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Total Actual Output</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {formatWholeNumber(kpis?.total_production_units || production.reduce((acc, p) => acc + (p.actual_units || 0), 0))} units
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Production Target</span>
          <div className="text-2xl font-bold text-slate-600 mt-1">
            {formatWholeNumber(kpis?.target_production_units || production.reduce((acc, p) => acc + (p.planned_units || 0), 0))} units
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Defects Flagged</span>
          <div className="text-2xl font-bold text-rose-600 mt-1">
            {formatWholeNumber(kpis?.defective_units || production.reduce((acc, p) => acc + (p.defect_units || 0), 0))} ({formatPercent(kpis?.defect_rate_pct || 1.8)})
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Avg Cycle Time</span>
          <div className="text-2xl font-bold text-emerald-800 mt-1">44.8 sec</div>
        </div>
      </div>

      {/* Production Log Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 font-bold text-sm text-slate-900">
          Production Log Records ({filteredProduction.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Machine ID</th>
                <th className="py-3 px-4">Shift</th>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4">Actual</th>
                <th className="py-3 px-4">Defects</th>
                <th className="py-3 px-4">Scrap (kg)</th>
                <th className="py-3 px-4">Cycle Time</th>
                <th className="py-3 px-4">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredProduction.slice(0, 30).map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-mono text-slate-500">
                    {new Date(p.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 font-mono font-medium text-emerald-800">{p.machine_id}</td>
                  <td className="py-2.5 px-4">{p.shift}</td>
                  <td className="py-2.5 px-4">{formatWholeNumber(p.target_units)}</td>
                  <td className="py-2.5 px-4 font-bold text-slate-900">{formatWholeNumber(p.actual_units)}</td>
                  <td className="py-2.5 px-4 text-rose-600 font-semibold">{formatWholeNumber(p.defective_units)}</td>
                  <td className="py-2.5 px-4">{formatScrap(p.scrap_kg)}</td>
                  <td className="py-2.5 px-4">{formatNumber(p.cycle_time_sec, 1)}s</td>
                  <td className="py-2.5 px-4 text-slate-600">{p.operator}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
