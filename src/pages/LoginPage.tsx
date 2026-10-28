import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useRouter } from '../contexts/RouterContext.tsx';
import {
  Factory,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  KeyRound
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, isLoading, error: authError } = useAuth();
  const { navigate } = useRouter();

  const [identifier, setIdentifier] = useState('superadmin@factoryops.com');
  const [password, setPassword] = useState('SuperAdmin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!identifier.trim() || !password) {
      setLocalError('Please enter both your work email and password.');
      return;
    }

    try {
      await login({ email: identifier.trim(), password });
      // Redirection is handled automatically by AppContent based on user role
    } catch (err: any) {
      setLocalError(err.message || 'Invalid credentials. Please verify your details.');
    }
  };

  const setCredentialsPreset = (emailVal: string, passVal: string) => {
    setIdentifier(emailVal);
    setPassword(passVal);
    setLocalError(null);
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen bg-[#FBFEF9] flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-[#0E79B2] selection:text-white font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-[#191923] flex items-center justify-center text-white shadow-lg border border-slate-700/30">
            <Factory className="w-7 h-7 text-[#0E79B2]" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-bold tracking-tight text-[#191923] font-display">
          FactoryOps
        </h2>
        <p className="mt-1.5 text-center text-xs text-slate-600 font-medium tracking-wide">
          Enterprise Smart Factory Operations & Telemetry Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-slate-200/80 py-8 px-6 shadow-sm rounded-2xl sm:px-10">
          {displayError && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="font-medium leading-relaxed">{displayError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#191923] mb-1.5">
                Work Email or Corporate ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="e.g. superadmin@factoryops.com"
                  className="w-full bg-[#FBFEF9] border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-[#191923] placeholder-slate-400 focus:outline-hidden focus:border-[#0E79B2] focus:ring-1 focus:ring-[#0E79B2] focus:bg-white transition-all font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#191923]">
                  Password
                </label>
                <span className="text-[10px] text-slate-500 font-mono">Encrypted PBKDF2</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#FBFEF9] border border-slate-200 rounded-xl pl-10 pr-11 py-2.5 text-sm text-[#191923] placeholder-slate-400 focus:outline-hidden focus:border-[#0E79B2] focus:ring-1 focus:ring-[#0E79B2] focus:bg-white transition-all font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#191923] p-1 rounded-md transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-3 py-3 px-4 bg-[#0E79B2] hover:bg-[#0c6799] active:bg-[#0a5680] text-white font-semibold text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Plant Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Preset Bar */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#191923] uppercase tracking-wider font-display">
                <KeyRound className="w-3.5 h-3.5 text-[#0E79B2]" />
                <span>Fast Role Presets</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">100% Real Supabase Data</span>
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs">
              {/* Super Admin Preset */}
              <button
                type="button"
                onClick={() => setCredentialsPreset('superadmin@factoryops.com', 'SuperAdmin@123')}
                className={`w-full text-left px-3 py-2 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                  identifier === 'superadmin@factoryops.com'
                    ? 'bg-purple-50/70 border-purple-300 ring-1 ring-purple-300'
                    : 'bg-[#FBFEF9] hover:bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-purple-900 font-display">Super Admin</span>
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded font-medium">Global</span>
                  </div>
                  <span className="text-[11px] text-slate-500">Central Overview + 4 Role Dashboards Monitor</span>
                </div>
                <span className="text-[11px] font-mono text-slate-600 bg-white/70 px-2 py-0.5 rounded border border-slate-200">
                  superadmin@factoryops.com
                </span>
              </button>

              {/* Admin Preset */}
              <button
                type="button"
                onClick={() => setCredentialsPreset('admin.apex@factoryops.com', 'Admin@123')}
                className={`w-full text-left px-3 py-2 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                  identifier === 'admin.apex@factoryops.com'
                    ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-300'
                    : 'bg-[#FBFEF9] hover:bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-blue-900 font-display">Admin</span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-medium">Apex Plant</span>
                  </div>
                  <span className="text-[11px] text-slate-500">Plant Status, OEE, Machines & Defect Analytics</span>
                </div>
                <span className="text-[11px] font-mono text-slate-600 bg-white/70 px-2 py-0.5 rounded border border-slate-200">
                  admin.apex@factoryops.com
                </span>
              </button>

              {/* Manager / Supervisor Preset */}
              <button
                type="button"
                onClick={() => setCredentialsPreset('manager.apex@factoryops.com', 'Manager@123')}
                className={`w-full text-left px-3 py-2 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                  identifier === 'manager.apex@factoryops.com'
                    ? 'bg-teal-50/70 border-teal-300 ring-1 ring-teal-300'
                    : 'bg-[#FBFEF9] hover:bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-teal-900 font-display">Manager / Supervisor</span>
                    <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.2 rounded font-medium">Floor</span>
                  </div>
                  <span className="text-[11px] text-slate-500">Production vs Target, Downtime, Defect Rates</span>
                </div>
                <span className="text-[11px] font-mono text-slate-600 bg-white/70 px-2 py-0.5 rounded border border-slate-200">
                  manager.apex@factoryops.com
                </span>
              </button>

              {/* Production Planner Preset */}
              <button
                type="button"
                onClick={() => setCredentialsPreset('planner.apex@factoryops.com', 'Planner@123')}
                className={`w-full text-left px-3 py-2 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                  identifier === 'planner.apex@factoryops.com'
                    ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-300'
                    : 'bg-[#FBFEF9] hover:bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-indigo-900 font-display">Production Planner</span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-medium">Planning</span>
                  </div>
                  <span className="text-[11px] text-slate-500">Actual vs Planned, Shortfall & Shift Outputs</span>
                </div>
                <span className="text-[11px] font-mono text-slate-600 bg-white/70 px-2 py-0.5 rounded border border-slate-200">
                  planner.apex@factoryops.com
                </span>
              </button>

              {/* Technician Preset */}
              <button
                type="button"
                onClick={() => setCredentialsPreset('tech.apex@factoryops.com', 'Tech@123')}
                className={`w-full text-left px-3 py-2 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                  identifier === 'tech.apex@factoryops.com'
                    ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300'
                    : 'bg-[#FBFEF9] hover:bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-amber-900 font-display">Technician</span>
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.2 rounded font-medium">Maintenance</span>
                  </div>
                  <span className="text-[11px] text-slate-500">Assigned Tasks, Open Incidents, Work Orders</span>
                </div>
                <span className="text-[11px] font-mono text-slate-600 bg-white/70 px-2 py-0.5 rounded border border-slate-200">
                  tech.apex@factoryops.com
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-[#0E79B2]" />
          <span>PBKDF2 Password Hashing • Isolated Tenant Namespaces • 100% Real Supabase Data</span>
        </div>
      </div>
    </div>
  );
};
