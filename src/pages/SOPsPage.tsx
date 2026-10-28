import React, { useState } from 'react';
import { useData } from '../contexts/DataContext.tsx';
import type { SOP } from '../types/index.ts';
import { BookOpen, ShieldAlert, Search } from 'lucide-react';

export const SOPsPage: React.FC = () => {
  const { sops } = useData();
  const [selectedSop, setSelectedSop] = useState<SOP | null>(sops[0] || null);
  const [search, setSearch] = useState('');

  const filteredSops = sops.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.machine_type.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-600" />
          <span>Standard Operating Procedures (SOP) Knowledge Base</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Authorized work instructions, safety lockout protocols, and machine calibration steps
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: SOP list */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search procedures..."
              className="w-full bg-white border border-slate-200 rounded-md pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-emerald-600"
            />
          </div>

          <div className="space-y-2">
            {filteredSops.map(sop => {
              const isSelected = selectedSop?.id === sop.id;
              return (
                <div
                  key={sop.id}
                  onClick={() => setSelectedSop(sop)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-mono font-bold text-emerald-800">{sop.sop_id}</span>
                    <span className="text-slate-400">{sop.version}</span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">{sop.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-1">{sop.machine_type}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected SOP Reader */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
          {selectedSop ? (
            <div className="space-y-5">
              <div className="border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {selectedSop.category}
                  </span>
                  <span className="text-xs font-mono text-slate-400">{selectedSop.sop_id} • {selectedSop.version}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-1">{selectedSop.title}</h2>
                <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                  <span>Target: <strong className="text-slate-700">{selectedSop.target_audience}</strong></span>
                  <span>Author: <strong className="text-slate-700">{selectedSop.author}</strong></span>
                  <span>Updated: <strong className="text-slate-700">{selectedSop.last_updated}</strong></span>
                </div>
              </div>

              {/* Safety Precautions Box */}
              <div className="p-4 rounded-md bg-rose-50 border border-rose-200">
                <h3 className="text-xs font-bold text-rose-800 flex items-center gap-1.5 mb-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Mandatory Safety Precautions</span>
                </h3>
                <ul className="list-disc list-inside space-y-1 text-xs text-rose-900">
                  {selectedSop.safety_precautions.map((p, idx) => (
                    <li key={idx}>{p}</li>
                  ))}
                </ul>
              </div>

              {/* Step by Step instructions */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                  Procedural Execution Steps
                </h3>
                <div className="space-y-2.5">
                  {selectedSop.steps.map((step, idx) => (
                    <div key={idx} className="flex gap-3 text-xs bg-slate-50 p-3 rounded-md border border-slate-200">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <p className="text-slate-800 self-center leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">
              Select an SOP document from the left list to read.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
