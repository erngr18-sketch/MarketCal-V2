'use client';

import type { ProfitStatus } from '@/lib/profit/compare-engine';

type ProgressMeterProps = {
  status: ProfitStatus;
  value?: number;
  max?: number;
};

export function ProgressMeter({ status, value, max }: ProgressMeterProps) {
  const width = calculateWidth(status, value, max);
  const colorClass = status === 'top' ? 'bg-emerald-500' : status === 'on_target' ? 'bg-emerald-400' : status === 'borderline' ? 'bg-amber-400' : 'bg-rose-400';

  return (
    <div className="w-full h-2 overflow-hidden rounded-full bg-slate-100">
      <div className={`h-2 rounded-full transition-all duration-300 ${colorClass}`} style={{ width: `${width}%` }} />
    </div>
  );
}

function calculateWidth(status: ProfitStatus, value?: number, max?: number) {
  if (status === 'loss') return 100;
  if (status === 'borderline') return 60;
  if (status === 'on_target' || status === 'top') return 100;
  if (!Number.isFinite(value) || !Number.isFinite(max) || (max ?? 0) <= 0) return 0;
  return clamp(((value as number) / (max as number)) * 100, 0, 100);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
