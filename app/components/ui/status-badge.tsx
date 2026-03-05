'use client';

import { Scale, TrendingDown, TrendingUp, Trophy } from 'lucide-react';
import clsx from 'clsx';
import type { ProfitStatus } from '@/lib/profit/compare-engine';

type StatusBadgeProps = {
  status: ProfitStatus;
  compact?: boolean;
  className?: string;
};

export function StatusBadge({ status, compact = false, className }: StatusBadgeProps) {
  const baseClass = compact
    ? 'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold'
    : 'inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 text-xs font-semibold';

  if (status === 'top') {
    return (
      <span className={clsx(baseClass, 'border-emerald-200 bg-emerald-100 text-emerald-700', className)}>
        <Trophy className="h-3.5 w-3.5" />
        En Karlı
      </span>
    );
  }

  if (status === 'on_target') {
    return (
      <span className={clsx(baseClass, 'border-emerald-200 bg-emerald-50 text-emerald-700', className)}>
        <TrendingUp className="h-3.5 w-3.5" />
        Hedefte
      </span>
    );
  }

  if (status === 'borderline') {
    return (
      <span className={clsx(baseClass, 'border-amber-200 bg-amber-50 text-amber-700', className)}>
        <Scale className="h-3.5 w-3.5" />
        Sınırda
      </span>
    );
  }

  return (
    <span className={clsx(baseClass, 'border-rose-200 bg-rose-50 text-rose-700', className)}>
      <TrendingDown className="h-3.5 w-3.5" />
      Zararda
    </span>
  );
}
