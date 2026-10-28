import React, { useState, useMemo } from 'react';
import type { Machine, ProductionRecord, WorkOrder, MaintenanceRecord, FactoryKPIs } from '../../types/index.ts';
import {
  formatPowerBiNumber,
  PowerBiBanner,
  PowerBiCard,
  PowerBiVisualContainer
} from './PowerBiComponents.tsx';
import {
  formatWholeNumber,
  formatPercent,
  formatCompactNumber,
  formatNumber
} from '../../utils/formatters.ts';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { ChevronDown, ChevronRight, Wrench } from 'lucide-react';

interface ProductionPlannerDashboardViewProps {
  machines: Machine[];
  production: ProductionRecord[];
  workOrders: WorkOrder[];
  maintenance: MaintenanceRecord[];
  kpis: FactoryKPIs | null;
  onSelectMachine: (machine: Machine) => void;
  onOpenWorkOrderModal: () => void;
}

export const ProductionPlannerDashboardView: React.FC<ProductionPlannerDashboardViewProps> = ({
  machines,
  production,
  workOrders,
  onSelectMachine,
  onOpenWorkOrderModal
}) => {
  // Slicers state
  const [selectedMachine, setSelectedMachine] = useState<string>('Select all');
  const [selectedShift, setSelectedShift] = useState<string>('all'); // 'all' | 'A' | 'B' | 'C'
  const [selectedQuarter, setSelectedQuarter] = useState<string>('all'); // 'all' | 'Qtr 3'
  const [isDateExpanded, setIsDateExpanded] = useState<boolean>(true);

  // Filtered production data based on slicers
  const filteredProduction = useMemo(() => {
    return production.filter(p => {
      // Machine filter
      if (selectedMachine !== 'Select all' && p.machine_id !== selectedMachine) {
        return false;
      }
      // Shift filter
      if (selectedShift !== 'all' && p.shift !== selectedShift) {
        return false;
      }
      // Date / Quarter filter (July, Aug, Sep are Qtr 3)
      if (selectedQuarter !== 'all' && p.date) {
        const month = new Date(p.date).getMonth(); // 6=Jul, 7=Aug, 8=Sep
        const isQ3 = month >= 6 && month <= 8;
        if (selectedQuarter === 'Qtr 3' && !isQ3) return false;
        if (selectedQuarter !== 'Qtr 3') return false;
      }
      return true;
    });
  }, [production, selectedMachine, selectedShift, selectedQuarter]);

  // Filtered work orders
  const filteredWorkOrders = useMemo(() => {
    if (selectedMachine === 'Select all') return workOrders;
    return workOrders.filter(w => w.machine_id === selectedMachine);
  }, [workOrders, selectedMachine]);

  // Aggregated KPIs
  const actualProductionTotal = useMemo(() => {
    return filteredProduction.reduce((sum, p) => sum + (Number(p.actual_units) || 0), 0);
  }, [filteredProduction]);

  const plannedProductionTotal = useMemo(() => {
    return filteredProduction.reduce((sum, p) => sum + (Number(p.planned_units) || 0), 0);
  }, [filteredProduction]);

  const achievementPct = useMemo(() => {
    if (plannedProductionTotal === 0) return '0%';
    return formatPercent((actualProductionTotal / plannedProductionTotal) * 100, 2);
  }, [actualProductionTotal, plannedProductionTotal]);

  const productionShortfall = useMemo(() => {
    const shortfall = plannedProductionTotal - actualProductionTotal;
    return formatCompactNumber(shortfall, 2);
  }, [actualProductionTotal, plannedProductionTotal]);

  const totalDefects = useMemo(() => {
    return filteredProduction.reduce((sum, p) => sum + (Number(p.defect_units) || 0), 0);
  }, [filteredProduction]);

  const totalGoodUnits = useMemo(() => {
    return Math.max(0, actualProductionTotal - totalDefects);
  }, [actualProductionTotal, totalDefects]);

  // Quality Distribution Donut (good units vs defect units)
  const qualityDistribution = useMemo(() => {
    return [
      { name: 'Sum of good_units', value: totalGoodUnits, color: '#0D47A1' },
      { name: 'Sum of defect_units', value: totalDefects, color: '#C2410C' }
    ];
  }, [totalGoodUnits, totalDefects]);

  // Actual Production by Machine (Detailed multi-metric table/bar for tooltip)
  const productionByMachine = useMemo(() => {
    const map: Record<string, { actual: number; plannedSum: number; oeeSum: number; count: number }> = {};
    production.forEach(p => {
      const id = p.machine_id;
      if (!map[id]) {
        map[id] = { actual: 0, plannedSum: 0, oeeSum: 0, count: 0 };
      }
      map[id].actual += Number(p.actual_units) || 0;
      map[id].plannedSum += Number(p.planned_units) || 0;
      map[id].oeeSum += Number(p.oee_percent) || 0;
      map[id].count++;
    });

    return Object.entries(map)
      .map(([machine_id, data]) => ({
        machine_id,
        actual_units: data.actual,
        sum_oee: Number(formatNumber(data.oeeSum, 2)),
        avg_planned: Math.round(data.plannedSum / data.count),
        displayUnits: formatCompactNumber(data.actual, 1)
      }))
      .sort((a, b) => b.actual_units - a.actual_units);
  }, [production]);

  // Planned vs Actual Production Trend (Dual line chart)
  const productionTrend = useMemo(() => {
    const dateMap: Record<string, { actual: number; planned: number }> = {};
    filteredProduction.forEach(p => {
      const d = p.date ? p.date.substring(0, 10) : '';
      if (d) {
        if (!dateMap[d]) dateMap[d] = { actual: 0, planned: 0 };
        dateMap[d].actual += Number(p.actual_units) || 0;
        dateMap[d].planned += Number(p.planned_units) || 0;
      }
    });

    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => {
        const dt = new Date(date);
        const monthName = dt.toLocaleString('en-US', { month: 'short' });
        const day = dt.getDate();
        return {
          date,
          label: `${monthName} ${day}`,
          actual: data.actual,
          planned: data.planned
        };
      });
  }, [filteredProduction]);

  // Work Orders by Status
  const workOrdersByStatus = useMemo(() => {
    const counts: Record<string, number> = {
      Completed: 0,
      Scheduled: 0,
      'In Progress': 0,
      Open: 0,
      'Pending Parts': 0
    };
    filteredWorkOrders.forEach(w => {
      if (counts[w.status] !== undefined) counts[w.status]++;
      else counts.Open++;
    });

    return [
      { status: 'Completed', count: counts.Completed },
      { status: 'Scheduled', count: counts.Scheduled },
      { status: 'In Progress', count: counts['In Progress'] },
      { status: 'Open', count: counts.Open },
      { status: 'Pending Parts', count: counts['Pending Parts'] }
    ];
  }, [filteredWorkOrders]);

  // Actual Production by Shift (Shift A, B, C vertical columns)
  const productionByShift = useMemo(() => {
    const shiftData: Record<string, { actual: number; planned: number; oeeSum: number; count: number }> = {
      A: { actual: 0, planned: 0, oeeSum: 0, count: 0 },
      B: { actual: 0, planned: 0, oeeSum: 0, count: 0 },
      C: { actual: 0, planned: 0, oeeSum: 0, count: 0 }
    };

    filteredProduction.forEach(p => {
      const s = p.shift;
      if (s && shiftData[s]) {
        shiftData[s].actual += Number(p.actual_units) || 0;
        shiftData[s].planned += Number(p.planned_units) || 0;
        shiftData[s].oeeSum += Number(p.oee_percent) || 0;
        shiftData[s].count++;
      }
    });

    return ['A', 'B', 'C'].map(shift => ({
      shift,
      actual: shiftData[shift].actual,
      planned: shiftData[shift].planned,
      avgOee: shiftData[shift].count > 0 ? formatNumber(shiftData[shift].oeeSum / shiftData[shift].count, 2) : '0',
      displayActual: formatCompactNumber(shiftData[shift].actual, 2)
    }));
  }, [filteredProduction]);

  // Custom Power BI Tooltip for Machine Production
  const CustomMachineTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-slate-300 p-2.5 rounded shadow-xl text-xs space-y-1 z-50 text-slate-800 min-w-[210px]">
          <div className="flex justify-between items-center gap-4">
            <span className="text-slate-500">machine_id</span>
            <span className="font-bold text-slate-900">{data.machine_id}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-slate-500">Sum of actual_units</span>
            <span className="font-bold text-slate-900">{formatWholeNumber(data.actual_units)}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-slate-500">Sum of oee_percent</span>
            <span className="font-bold text-slate-900">{formatNumber(data.sum_oee, 2)}%</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-slate-500">Average of planned_units</span>
            <span className="font-bold text-slate-900">{formatWholeNumber(data.avg_planned)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-[1850px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 font-sans text-[#191923]">
      {/* Top Banner Header */}
      <PowerBiBanner
        title="Production Planner Dashboard"
        subtitle="Shift Schedules, Line Targets, Output Shortfall & Machine Scheduling"
        actions={
          <button
            onClick={onOpenWorkOrderModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0E79B2] hover:bg-[#0E79B2]/90 text-white transition-colors shadow-2xs cursor-pointer"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>+ Work Order</span>
          </button>
        }
      />

      {/* Main Grid: Left Slicers + Center KPIs & Visuals + Right Machine Visual */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column Slicers: MACHINE ID, SHIFT, DATE */}
        <div className="lg:col-span-2 min-w-0 space-y-3">
          {/* MACHINE ID Slicer */}
          <div className="bg-white rounded-xl border border-[#191923]/10 overflow-hidden shadow-xs">
            <div className="px-3 py-2 font-bold text-[11px] tracking-wider uppercase text-[#191923] border-b border-slate-100 flex items-center justify-between">
              <span>MACHINE ID</span>
              <span className="text-[10px] text-slate-400 font-normal">24 units</span>
            </div>
            <div className="p-2 max-h-[160px] overflow-y-auto space-y-1 text-xs text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer hover:text-[#0E79B2] p-1 rounded hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="planner_machine"
                  checked={selectedMachine === 'Select all'}
                  onChange={() => setSelectedMachine('Select all')}
                  className="accent-[#0E79B2] cursor-pointer"
                />
                <span className="font-semibold">Select all</span>
              </label>
              {machines.map(m => (
                <label key={m.machine_id} className="flex items-center gap-2 cursor-pointer hover:text-[#0E79B2] p-1 rounded hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="planner_machine"
                    checked={selectedMachine === m.machine_id}
                    onChange={() => setSelectedMachine(m.machine_id)}
                    className="accent-[#0E79B2] cursor-pointer"
                  />
                  <span className="font-mono text-slate-800">{m.machine_id}</span>
                </label>
              ))}
            </div>
          </div>

          {/* SHIFT Slicer */}
          <div className="bg-white rounded-xl border border-[#191923]/10 overflow-hidden shadow-xs">
            <div className="px-3 py-2 font-bold text-[11px] tracking-wider uppercase text-[#191923] border-b border-slate-100">
              SHIFT
            </div>
            <div className="p-2 space-y-1 text-xs text-slate-700">
              {['A', 'B', 'C'].map(shift => (
                <label key={shift} className="flex items-center gap-2 cursor-pointer hover:text-[#0E79B2] p-1 rounded hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="planner_shift"
                    checked={selectedShift === shift}
                    onChange={() => setSelectedShift(selectedShift === shift ? 'all' : shift)}
                    className="accent-[#0E79B2] cursor-pointer"
                  />
                  <span className="font-bold">Shift {shift}</span>
                </label>
              ))}
            </div>
          </div>

          {/* DATE Hierarchy Slicer */}
          <div className="bg-white rounded-xl border border-[#191923]/10 overflow-hidden shadow-xs">
            <div className="px-3 py-2 font-bold text-[11px] tracking-wider uppercase text-[#191923] border-b border-slate-100">
              DATE RANGE
            </div>
            <div className="p-2 text-xs space-y-1">
              <div
                className="flex items-center gap-1 cursor-pointer font-bold select-none text-[#191923] p-1"
                onClick={() => setIsDateExpanded(!isDateExpanded)}
              >
                {isDateExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                <span>Year 2026</span>
              </div>
              {isDateExpanded && (
                <div className="pl-4 space-y-1 text-slate-600">
                  {['Qtr 1', 'Qtr 2', 'Qtr 3', 'Qtr 4'].map(qtr => (
                    <label key={qtr} className="flex items-center gap-1.5 cursor-pointer hover:text-[#0E79B2] p-0.5 transition-colors">
                      <input
                        type="radio"
                        name="planner_qtr"
                        checked={selectedQuarter === qtr}
                        onChange={() => setSelectedQuarter(selectedQuarter === qtr ? 'all' : qtr)}
                        className="accent-[#0E79B2] cursor-pointer"
                      />
                      <span className={selectedQuarter === qtr ? 'font-bold text-[#0E79B2]' : ''}>{qtr}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center Grid: 5 Top KPIs & Quality Distribution */}
        <div className="lg:col-span-6 min-w-0 space-y-3">
          {/* Top 3 KPI Strip: ACTUAL, PLANNED, ACHIEVEMENT % */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <PowerBiCard
              title="ACTUAL PRODUCTION"
              subtitle="Sum of actual_units"
              value={actualProductionTotal.toLocaleString('en-US')}
              trendText="Live verified"
              trendPositive={true}
            />
            <PowerBiCard
              title="PLANNED PRODUCTION"
              subtitle="Sum of planned_units"
              value={formatPowerBiNumber(plannedProductionTotal, 'indian_lakhs')}
              trendText="Scheduled targets"
              trendPositive={true}
            />
            <PowerBiCard
              title="ACHIEVEMENT %"
              subtitle="Production Achievement"
              value={achievementPct}
              trendText="Above threshold"
              trendPositive={true}
            />
          </div>

          {/* Shortfall + Quality Distribution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PowerBiCard
              title="PRODUCTION SHORTFALL"
              subtitle="Units variance to plan"
              value={productionShortfall}
              trendText="Tracked gap"
              trendPositive={false}
            />
            <PowerBiVisualContainer
              title="PRODUCTION QUALITY"
              subtitle="Defect vs Good Output"
              heightClass="h-[155px]"
            >
              <div className="h-full flex items-center justify-between px-1">
                <div className="relative w-28 h-28 mx-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={qualityDistribution}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius={32}
                        outerRadius={50}
                        strokeWidth={1}
                        stroke="#fff"
                      >
                        {qualityDistribution.map((entry, idx) => (
                          <Cell key={`cell-qual-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#191923', fontSize: '11px', borderRadius: '8px' }}
                        formatter={(val: any, name: any) => [Number(val).toLocaleString(), name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-[#191923]">
                    <span className="text-base font-bold font-mono">{formatPowerBiNumber(totalDefects, 'compact')}</span>
                  </div>
                </div>
                <div className="text-[10px] space-y-1.5 text-slate-600 pr-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0E79B2]"></span>
                    <span className="font-semibold">Good Output</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span>
                    <span className="font-semibold">Defects ({formatPowerBiNumber(totalDefects, 'compact')})</span>
                  </div>
                </div>
              </div>
            </PowerBiVisualContainer>
          </div>
        </div>

        {/* Right Column: ACTUAL PRODUCTION BY MACHINE */}
        <div className="lg:col-span-4 min-w-0">
          <PowerBiVisualContainer
            title="ACTUAL PRODUCTION BY MACHINE"
            subtitle="Units, OEE and Planned Targets"
            heightClass="h-[310px]"
          >
            <div className="h-full w-full overflow-y-auto pr-1">
              <ResponsiveContainer width="100%" height={Math.max(260, productionByMachine.length * 22)}>
                <BarChart
                  data={productionByMachine}
                  layout="vertical"
                  margin={{ top: 5, right: 35, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    stroke="#94a3b8"
                    fontSize={9}
                    tickFormatter={(v) => `${Math.round(v / 1000)}K`}
                  />
                  <YAxis
                    type="category"
                    dataKey="machine_id"
                    stroke="#64748b"
                    fontSize={8.5}
                    width={40}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomMachineTooltip />} />
                  <Bar
                    dataKey="actual_units"
                    fill="#0E79B2"
                    radius={[0, 4, 4, 0]}
                    label={{ position: 'right', fill: '#64748b', fontSize: 8.5, formatter: (v: any) => `${Math.round(Number(v) / 1000)}K` }}
                    onClick={(entry: any) => {
                      const m = machines.find(x => x.machine_id === entry?.machine_id);
                      if (m) onSelectMachine(m);
                    }}
                    className="cursor-pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </PowerBiVisualContainer>
        </div>
      </div>

      {/* Bottom Row Visuals (3 Panels) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: PLANNED VS ACTUAL PRODUCTION TREND */}
        <div className="lg:col-span-4 min-w-0">
          <PowerBiVisualContainer
            title="PLANNED VS ACTUAL TREND"
            subtitle="Daily Trajectory Comparison"
            heightClass="h-[300px]"
          >
            <div className="h-full w-full pt-1 flex flex-col">
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={productionTrend}
                    margin={{ top: 10, right: 15, left: 5, bottom: 15 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#94a3b8"
                      fontSize={9}
                      tickLine={false}
                      interval={25}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={9}
                      domain={[31000, 38500]}
                      ticks={[32000, 34000, 36000, 38000]}
                      tickFormatter={(v) => `${Math.round(v / 1000)}K`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#191923', fontSize: '11px', borderRadius: '8px' }}
                      formatter={(val: any, name: any) => [Number(val).toLocaleString(), name]}
                    />
                    <Line
                      type="monotone"
                      name="Sum of planned_units"
                      dataKey="planned"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      name="Sum of actual_units"
                      dataKey="actual"
                      stroke="#0E79B2"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 text-[10px] text-slate-600 pb-1 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#94a3b8]"></span>
                  <span>Planned Units</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0E79B2]"></span>
                  <span>Actual Units</span>
                </div>
              </div>
            </div>
          </PowerBiVisualContainer>
        </div>

        {/* Center: WORK ORDERS BY STATUS */}
        <div className="lg:col-span-4 min-w-0">
          <PowerBiVisualContainer
            title="WORK ORDERS BY STATUS"
            subtitle="Execution Status Breakdown"
            heightClass="h-[300px]"
            rightAction={
              <button
                onClick={onOpenWorkOrderModal}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#0E79B2] hover:bg-[#0E79B2]/90 text-white rounded-md text-[10px] font-semibold transition-colors cursor-pointer"
              >
                <Wrench className="w-3 h-3" />
                <span>New WO</span>
              </button>
            }
          >
            <div className="h-full w-full pt-2">
              <ResponsiveContainer width="100%" height="90%">
                <BarChart
                  data={workOrdersByStatus}
                  layout="vertical"
                  margin={{ top: 10, right: 35, left: 20, bottom: 15 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    stroke="#94a3b8"
                    fontSize={9}
                    domain={[0, 120]}
                    ticks={[0, 50, 100]}
                    label={{ value: 'Count of work_order_id', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 9 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="status"
                    stroke="#64748b"
                    fontSize={9}
                    width={80}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#191923', fontSize: '11px', borderRadius: '8px' }}
                    formatter={(val: any) => [val, 'Count']}
                  />
                  <Bar
                    dataKey="count"
                    fill="#191923"
                    radius={[0, 4, 4, 0]}
                    label={{ position: 'right', fill: '#191923', fontSize: 10, fontWeight: 'bold' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </PowerBiVisualContainer>
        </div>

        {/* Right: ACTUAL PRODUCTION BY SHIFT */}
        <div className="lg:col-span-4 min-w-0">
          <PowerBiVisualContainer
            title="ACTUAL PRODUCTION BY SHIFT"
            subtitle="Shift A, B, C Output Distribution"
            heightClass="h-[300px]"
          >
            <div className="h-full w-full pt-1">
              <ResponsiveContainer width="100%" height="90%">
                <BarChart
                  data={productionByShift}
                  margin={{ top: 25, right: 20, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="shift" stroke="#64748b" fontSize={11} tickLine={false} label={{ value: 'Shift', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 10 }} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={9}
                    domain={[0, 1200000]}
                    ticks={[0, 500000, 1000000]}
                    tickFormatter={(v) => formatCompactNumber(v, 1)}
                    label={{ value: 'Actual Units', angle: -90, position: 'insideLeft', offset: 0, fill: '#64748b', fontSize: 9 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#191923', fontSize: '11px', borderRadius: '8px' }}
                    formatter={(val: any) => [formatWholeNumber(val), 'Actual Units']}
                  />
                  <Bar
                    dataKey="actual"
                    fill="#0E79B2"
                    radius={[4, 4, 0, 0]}
                    label={{ position: 'top', fill: '#191923', fontSize: 10, fontWeight: 'bold', formatter: (v: any) => formatCompactNumber(v, 2) }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </PowerBiVisualContainer>
        </div>
      </div>
    </div>
  );
};
