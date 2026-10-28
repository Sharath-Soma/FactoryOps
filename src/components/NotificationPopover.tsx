import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext.tsx';
import { useRouter } from '../contexts/RouterContext.tsx';
import {
  Bell,
  X,
  AlertTriangle,
  ClipboardList,
  Cpu,
  Check,
  CheckCheck,
  CheckCircle2,
  ExternalLink,
  Clock
} from 'lucide-react';

import { formatNumber, formatPercent } from '../utils/formatters.ts';

interface NotificationItem {
  id: string;
  type: 'incident' | 'work_order' | 'machine';
  title: string;
  description: string;
  timestamp: string;
  severity?: 'Critical' | 'High' | 'Medium' | 'Low';
  targetPath: string;
  read: boolean;
  meta: string;
}

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  isOpen,
  onClose,
  anchorRef
}) => {
  const { incidents, workOrders, machines } = useData();
  const { navigate } = useRouter();

  // Track read notification IDs in local state
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [filterTab, setFilterTab] = useState<'all' | 'alerts' | 'tasks'>('all');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Generate real notifications from live plant telemetry and records
  const notifications: NotificationItem[] = React.useMemo(() => {
    const list: NotificationItem[] = [];

    // 1. Incidents (especially Critical and High)
    incidents.forEach(inc => {
      const isCriticalOrHigh = inc.severity === 'Critical' || inc.severity === 'High';
      const isOpen = inc.status !== 'Closed';
      if (isOpen) {
        list.push({
          id: `inc-${inc.id || inc.incident_id}`,
          type: 'incident',
          title: `${inc.severity} Incident: ${inc.incident_id}`,
          description: `${inc.title} - ${inc.description}`,
          timestamp: inc.reported_at ? new Date(inc.reported_at).toLocaleString() : 'Recent shift',
          severity: (inc.severity as any) || 'High',
          targetPath: '/incidents',
          read: readIds.has(`inc-${inc.id || inc.incident_id}`),
          meta: `Machine: ${inc.machine_id} • Status: ${inc.status}`
        });
      }
    });

    // 2. Urgent / Active Work Orders
    workOrders.forEach(wo => {
      if (wo.status === 'Pending Parts' || wo.status === 'In Progress' || wo.priority === 'Critical' || wo.priority === 'High') {
        list.push({
          id: `wo-${wo.id || wo.work_order_id}`,
          type: 'work_order',
          title: `Work Order: ${wo.work_order_id}`,
          description: `${wo.title} (${wo.priority} Priority)`,
          timestamp: wo.created_at ? new Date(wo.created_at).toLocaleString() : 'Active order',
          severity: (wo.priority as any) || 'Medium',
          targetPath: '/work-orders',
          read: readIds.has(`wo-${wo.id || wo.work_order_id}`),
          meta: `Assigned: ${wo.assigned_to || 'Unassigned'} • Due: ${wo.due_date || 'ASAP'}`
        });
      }
    });

    // 3. Machines in Warning or Offline
    machines.forEach(m => {
      if (m.status === 'warning') {
        list.push({
          id: `mach-${m.id || m.machine_id}`,
          type: 'machine',
          title: `Telemetry Alert: ${m.machine_id}`,
          description: `${m.name} operating at elevated telemetry (${formatNumber(m.temperature_c, 1)}°C / ${formatNumber(m.vibration_mms, 2)} mm/s)`,
          timestamp: 'Live reading',
          severity: 'High',
          targetPath: '/machines',
          read: readIds.has(`mach-${m.id || m.machine_id}`),
          meta: `Line: ${m.line} • Health: ${formatPercent(m.health_score, 1)}`
        });
      }
    });

    return list;
  }, [incidents, workOrders, machines, readIds]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = notifications.filter(n => {
    if (filterTab === 'alerts') return n.type === 'incident' || n.type === 'machine';
    if (filterTab === 'tasks') return n.type === 'work_order';
    return true;
  });

  // Handle clicking outside & Escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!isOpen) return;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, anchorRef]);

  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setReadIds(prev => new Set(prev).add(id));
  };

  const handleMarkAllAsRead = () => {
    const allIds = new Set<string>(notifications.map(n => n.id));
    setReadIds(allIds);
  };

  const handleItemClick = (notification: NotificationItem) => {
    handleMarkAsRead(notification.id);
    onClose();
    navigate(notification.targetPath);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      role="region"
      aria-label="Operational Notifications"
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-[#191923]/15 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-800"
    >
      {/* Header */}
      <div className="bg-[#191923] text-white px-4 py-3 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-[#0E79B2]">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-tight">
              Operational Notifications
            </h3>
            <span className="text-[10px] text-slate-300">
              {unreadCount} unread alarm{unreadCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-[10px] font-semibold text-slate-300 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors flex items-center gap-1 cursor-pointer"
              title="Mark all notifications as read"
            >
              <CheckCheck className="w-3 h-3 text-[#0E79B2]" />
              <span className="hidden sm:inline">Mark all read</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-slate-50 border-b border-slate-200 px-3 py-1.5 flex items-center gap-1 text-[11px]">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
            filterTab === 'all'
              ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilterTab('alerts')}
          className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
            filterTab === 'alerts'
              ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Incidents & Telemetry
        </button>
        <button
          onClick={() => setFilterTab('tasks')}
          className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
            filterTab === 'tasks'
              ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Work Orders
        </button>
      </div>

      {/* Notifications List */}
      <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">All Alarms Clear</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              No active warnings or unassigned critical orders pending on plant floor.
            </p>
          </div>
        ) : (
          filteredNotifications.map(item => (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 relative ${
                !item.read ? 'bg-blue-50/40' : ''
              }`}
            >
              {/* Type Icon */}
              <div
                className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                  item.type === 'incident'
                    ? 'bg-rose-100 text-rose-700'
                    : item.type === 'machine'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {item.type === 'incident' ? (
                  <AlertTriangle className="w-3.5 h-3.5" />
                ) : item.type === 'machine' ? (
                  <Cpu className="w-3.5 h-3.5" />
                ) : (
                  <ClipboardList className="w-3.5 h-3.5" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {item.title}
                  </h4>
                  {!item.read && (
                    <span className="w-2 h-2 rounded-full bg-[#0E79B2] shrink-0" title="Unread" />
                  )}
                </div>

                <p className="text-[11px] text-slate-600 line-clamp-2 leading-snug">
                  {item.description}
                </p>

                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span className="truncate">{item.meta}</span>
                  <span className="shrink-0">{item.timestamp}</span>
                </div>
              </div>

              {/* Quick Mark Read Button */}
              {!item.read && (
                <button
                  onClick={e => handleMarkAsRead(item.id, e)}
                  className="opacity-0 group-hover:opacity-100 hover:bg-slate-200 text-slate-500 p-1 rounded transition-opacity"
                  title="Mark as read"
                >
                  <Check className="w-3 h-3" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
        <span>Real operational alarms from live plant floor</span>
        <button
          onClick={onClose}
          className="text-[#0E79B2] hover:underline font-semibold cursor-pointer"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};
