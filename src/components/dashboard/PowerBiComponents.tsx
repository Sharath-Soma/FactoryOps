import React from 'react';
import { Filter, Maximize2, MoreHorizontal } from 'lucide-react';

import { formatNumber, formatWholeNumber, formatCompactNumber, safeNumber } from '../../utils/formatters.ts';

/**
 * Power BI Executive & Operational Number Formatter
 * Formats numbers consistently with max 2 decimals and safe null/NaN checks:
 * - 3080386 -> 3.08M (compact) or 3,080,386 (whole)
 * - 264914 -> 264.91K
 */
export function formatPowerBiNumber(
  val: number | string | null | undefined,
  style: 'compact' | 'indian_lakhs' | 'raw' | 'kilo_precise' | 'decimal2' = 'compact'
): string {
  const num = safeNumber(val);

  if (style === 'compact') {
    return formatCompactNumber(num, 2);
  }

  if (style === 'indian_lakhs') {
    const parts = formatNumber(num, 2, 2).split('.');
    let intPart = parts[0].replace(/,/g, '');
    const decPart = parts[1] || '00';
    const isNeg = intPart.startsWith('-');
    if (isNeg) intPart = intPart.substring(1);

    if (intPart.length > 3) {
      const lastThree = intPart.substring(intPart.length - 3);
      const otherNumbers = intPart.substring(0, intPart.length - 3);
      const withCommas = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
      intPart = withCommas + ',' + lastThree;
    }
    return (isNeg ? '-' : '') + intPart + '.' + decPart;
  }

  if (style === 'kilo_precise') {
    const thousands = num / 1_000;
    return `${formatNumber(thousands, 2, 0)}K`;
  }

  if (style === 'decimal2') {
    return formatNumber(num, 2, 2);
  }

  return formatWholeNumber(num);
}

/**
 * Power BI & Operations Top Banner Header
 * Styled with crisp typography hierarchy and executive action buttons
 */
interface PowerBiBannerProps {
  title: string;
  theme?: 'black' | 'blue' | 'modern';
  onFilterClick?: () => void;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const PowerBiBanner: React.FC<PowerBiBannerProps> = ({
  title,
  subtitle = 'Austin Gigafactory • Real-Time Industrial Operations & Equipment Intelligence',
  onFilterClick,
  actions
}) => {
  return (
    <div className="w-full bg-white border border-[#191923]/10 rounded-xl px-5 py-4 mb-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#191923]">
            {title}
          </h1>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Data</span>
          </span>
        </div>
        <p className="text-xs text-slate-500 font-medium">
          {subtitle}
        </p>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
        {actions}
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200/80">
          <button
            onClick={onFilterClick}
            className="p-1.5 rounded hover:bg-white text-slate-600 hover:text-[#0E79B2] transition-colors cursor-pointer"
            title="Toggle Filter Pane"
          >
            <Filter className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 rounded hover:bg-white text-slate-600 hover:text-[#0E79B2] transition-colors cursor-pointer"
            title="Focus Mode"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 rounded hover:bg-white text-slate-600 hover:text-[#0E79B2] transition-colors cursor-pointer"
            title="Dashboard Options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Standard Donezo-style KPI Metric Card
 * Top row: Metric name + circular arrow icon
 * Middle row: Bold tabular numeral value
 * Bottom row: Subtitle/trend descriptor
 */
interface PowerBiCardProps {
  title: string;
  subtitle?: string;
  value: string | number;
  headerBg?: string;
  headerTextColor?: string;
  bodyBg?: string;
  bodyTextColor?: string;
  borderColor?: string;
  fontSerif?: boolean;
  trendText?: string;
  trendPositive?: boolean;
}

export const PowerBiCard: React.FC<PowerBiCardProps> = ({
  title,
  subtitle,
  value,
  trendText,
  trendPositive = true
}) => {
  return (
    <div className="bg-white border border-[#191923]/10 hover:border-[#0E79B2]/40 rounded-xl p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between group">
      {/* Top Header: Label + Circular Arrow Icon */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider line-clamp-1">
          {title}
        </span>
        <div className="w-7 h-7 rounded-full bg-slate-50 border border-slate-200/70 group-hover:bg-[#0E79B2]/10 group-hover:border-[#0E79B2]/30 flex items-center justify-center text-slate-400 group-hover:text-[#0E79B2] transition-colors shrink-0">
          <span className="text-xs font-semibold">↗</span>
        </div>
      </div>

      {/* Primary Metric Value */}
      <div className="my-1">
        <div className="text-2xl sm:text-3xl font-extrabold text-[#191923] font-mono tracking-tight tabular-nums">
          {value}
        </div>
      </div>

      {/* Bottom Subtitle / Comparison descriptor */}
      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="truncate">{subtitle || 'Live operational telemetry'}</span>
        {trendText && (
          <span className={`font-semibold shrink-0 ml-1.5 ${trendPositive ? 'text-emerald-600' : 'text-amber-600'}`}>
            {trendText}
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Modern Visual Container Box with clean white card & header
 */
interface PowerBiVisualContainerProps {
  title: string;
  subtitle?: string;
  headerBg?: string;
  headerTextColor?: string;
  bodyBg?: string;
  borderColor?: string;
  children: React.ReactNode;
  heightClass?: string;
  rightAction?: React.ReactNode;
}

export const PowerBiVisualContainer: React.FC<PowerBiVisualContainerProps> = ({
  title,
  subtitle,
  children,
  heightClass = 'h-[340px]',
  rightAction
}) => {
  return (
    <div className={`bg-white border border-[#191923]/10 rounded-xl shadow-xs overflow-hidden flex flex-col ${heightClass}`}>
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
        <div className="truncate pr-2">
          <h2 className="text-xs sm:text-sm font-bold text-[#191923] uppercase tracking-wide truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[10.5px] text-slate-500 font-medium truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {rightAction && <div className="shrink-0">{rightAction}</div>}
      </div>
      <div className="flex-1 p-3 sm:p-4 overflow-hidden relative bg-white">
        {children}
      </div>
    </div>
  );
};
