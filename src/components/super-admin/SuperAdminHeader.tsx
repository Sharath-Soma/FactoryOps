import React, { useState, useRef, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { useRouter } from '../../contexts/RouterContext.tsx';
import { useData } from '../../contexts/DataContext.tsx';
import { UserProfileModal } from '../UserProfileModal.tsx';
import { NotificationPopover } from '../NotificationPopover.tsx';
import {
  Factory as FactoryIcon,
  LogOut,
  Building2,
  ShieldCheck,
  Search,
  Bell,
  UserCheck
} from 'lucide-react';

export const SuperAdminHeader: React.FC = () => {
  const { user, logout, switchDemoRole } = useAuth();
  const { navigate } = useRouter();
  const { incidents, workOrders, machines } = useData();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const bellButtonRef = useRef<HTMLButtonElement>(null);

  // Live alerts for Super Admin
  const unreadAlertsCount = useMemo(() => {
    const criticalIncidents = incidents.filter(
      i => i.status !== 'Closed' && (i.severity === 'Critical' || i.severity === 'High')
    ).length;
    const pendingOrders = workOrders.filter(
      w => w.status === 'Pending Parts' || w.priority === 'Critical'
    ).length;
    const warningMachines = machines.filter(m => m.status === 'warning').length;
    return criticalIncidents + pendingOrders + warningMachines;
  }, [incidents, workOrders, machines]);

  return (
    <header className="bg-white border-b border-slate-200 text-slate-800 sticky top-0 z-40 shadow-xs">
      <div className="max-w-[1850px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Branding & Tenant Mode */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/super-admin/overview')}
            className="flex items-center gap-2.5 text-left focus:outline-hidden cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs">
              <FactoryIcon className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-slate-900">FactoryOps</span>
                <span className="text-[10px] font-semibold bg-purple-100 text-purple-800 border border-purple-300 px-1.5 py-0.2 rounded uppercase tracking-wider">
                  Super Admin
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium hidden sm:block">Multi-Tenant Plant Operations</p>
            </div>
          </button>

          <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-200">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
            </span>
            <span className="text-xs font-medium text-slate-600">Reserved Management Console</span>
          </div>
        </div>

        {/* Right: Quick Role Switcher, Search, Notifications, User Info, Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Demo Role Switcher */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg text-xs">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden sm:inline">Role:</span>
            <select
              value={user?.role || 'SUPER_ADMIN'}
              onChange={(e) => {
                const targetRole = e.target.value as any;
                if (targetRole) {
                  switchDemoRole(targetRole);
                }
              }}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
              title="Fast Switch Role for Testing"
            >
              <option value="SUPER_ADMIN">Super Admin (Reserved)</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER_SUPERVISOR">Manager / Supervisor</option>
              <option value="TECHNICIAN">Technician</option>
              <option value="PRODUCTION_PLANNER">Production Planner</option>
            </select>
          </div>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              ref={bellButtonRef}
              onClick={() => setIsNotificationsOpen(prev => !prev)}
              aria-label={`Notifications (${unreadAlertsCount} unread)`}
              className={`p-2 rounded-lg transition-colors relative cursor-pointer ${
                isNotificationsOpen ? 'bg-slate-100 text-[#0E79B2]' : 'text-slate-600 hover:text-[#191923] hover:bg-slate-100'
              }`}
              title="Operational Notifications & Alarms"
            >
              <Bell className="w-4 h-4" />
              {unreadAlertsCount > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-mono font-bold leading-none shadow-2xs">
                  {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
                </span>
              )}
            </button>

            <NotificationPopover
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
              anchorRef={bellButtonRef}
            />
          </div>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-200">
            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-left focus:outline-hidden"
              title="View User Profile & Permissions"
              aria-label="User Profile"
            >
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-slate-900 flex items-center justify-end gap-1">
                  <span>{user?.name || 'Super Admin'}</span>
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-[10px] text-slate-500 font-medium">Global Application Administrator</div>
              </div>

              <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                {user?.name?.charAt(0) || 'S'}
              </div>
            </button>

            <button
              onClick={logout}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </header>
  );
};
