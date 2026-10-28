import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { api } from '../services/api.ts';
import {
  Settings,
  Users,
  Building2,
  Info
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const { user, activeFactory } = useAuth();
  const [usersList, setUsersList] = useState<any[]>([]);
  const isManager = user?.role === 'FACTORY_MANAGER';

  useEffect(() => {
    api.users.getAll().then(setUsersList).catch(() => {});
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-600" />
          <span>Plant Administration & Local User Roster</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Tenant identity, plant telemetry settings, and access control policies
        </p>
      </div>

      {/* Role permission notice if Factory Manager */}
      {isManager && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-950">Factory Manager Role (Restricted Administrative Scope)</h4>
            <p className="text-amber-800 mt-0.5">
              As a Factory Manager, you have operational read and write privileges over machines, production logs, work orders, and incidents. However, global tenant configurations, tenant deletion, and administrative credentials are reserved for the <strong>Factory Owner</strong> and <strong>Super Admin</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Factory Profile Details */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>Plant Profile Information</span>
          </h2>
          <span className="font-mono text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            {activeFactory?.factory_code}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-500">Factory Name:</span>
            <p className="text-slate-900 font-semibold mt-0.5">{activeFactory?.name}</p>
          </div>
          <div>
            <span className="text-slate-500">Location:</span>
            <p className="text-slate-900 font-semibold mt-0.5">{activeFactory?.location}</p>
          </div>
          <div>
            <span className="text-slate-500">Industry Sector:</span>
            <p className="text-slate-900 font-semibold mt-0.5">{activeFactory?.industry}</p>
          </div>
          <div>
            <span className="text-slate-500">Plant Owner:</span>
            <p className="text-slate-900 font-semibold mt-0.5">{activeFactory?.owner_name}</p>
          </div>
          <div>
            <span className="text-slate-500">Rated Monthly Capacity:</span>
            <p className="text-slate-900 font-semibold mt-0.5">{activeFactory?.capacity}</p>
          </div>
          <div>
            <span className="text-slate-500">Year Established:</span>
            <p className="text-slate-900 font-semibold mt-0.5">{activeFactory?.established_year}</p>
          </div>
        </div>
      </div>

      {/* Local Plant Users Roster */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Authorized Plant Personnel ({usersList.length})</span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3">Email</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {usersList.map((u: any) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{u.name}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">{u.email}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-emerald-700 font-medium">Active</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
