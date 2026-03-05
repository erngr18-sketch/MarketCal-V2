'use client';

import { Sparkles } from 'lucide-react';
import { AlertTriangle, CheckCircle2, Info, Sparkles as SparklesMini, TrendingUp } from 'lucide-react';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { ProfitStatus } from '@/lib/profit/compare-engine';
import { StatusBadge } from '@/app/components/ui/status-badge';

export type AiSummaryItem = {
  marketplaceName?: string;
  status?: ProfitStatus;
  text: string;
  type?: 'status' | 'action' | 'risk' | 'check' | 'info';
  icon?: LucideIcon;
};

type AiSummaryCardProps = {
  title?: string;
  disclaimer?: string;
  summaryLine?: string;
  items: AiSummaryItem[];
  footerControl?: string;
  children?: ReactNode;
};

export function AiSummaryCard({
  title = 'AI Analiz Özeti',
  disclaimer = 'Not: Bu analiz tahminidir. Fiyatları ve koşulları panelinizden doğrulayın.',
  summaryLine,
  items,
  footerControl,
  children
}: AiSummaryCardProps) {
  return (
    <section className="rounded-2xl bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-indigo-500" />
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="mt-3 h-px bg-slate-200" />

      <p className="mt-3 text-xs text-slate-600">{disclaimer}</p>

      {summaryLine ? <p className="mt-3 text-sm font-medium text-slate-800">{summaryLine}</p> : null}

      {children ? (
        <div className="mt-3">{children}</div>
      ) : (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
          {items.slice(0, 5).map((item, index) => (
            <li key={`${item.marketplaceName ?? 'item'}-${index}`} className="flex items-start gap-2">
              {item.icon ? (
                <item.icon className={clsx('mt-1 h-4 w-4 shrink-0', iconClass(item.type))} />
              ) : (
                <TypeIcon type={item.type} />
              )}
              <div className="min-w-0">
                {item.marketplaceName ? (
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className={clsx('font-semibold', marketplaceClass(item.status))}>{item.marketplaceName}</span>
                    {item.status ? <StatusBadge status={item.status} compact /> : null}
                  </div>
                ) : null}
                <p className={textClass(item.type)}>{item.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {footerControl ? <p className="mt-3 text-xs text-slate-600">{footerControl}</p> : null}
    </section>
  );
}

function TypeIcon({ type }: { type?: AiSummaryItem['type'] }) {
  const Icon = typeIcon(type);
  return <Icon className={clsx('mt-1 h-4 w-4 shrink-0', iconClass(type))} />;
}

function typeIcon(type?: AiSummaryItem['type']) {
  if (type === 'status') return TrendingUp;
  if (type === 'action') return SparklesMini;
  if (type === 'risk') return AlertTriangle;
  if (type === 'check') return CheckCircle2;
  return Info;
}

function iconClass(type?: AiSummaryItem['type']) {
  if (type === 'status') return 'text-emerald-600';
  if (type === 'action') return 'text-sky-600';
  if (type === 'risk') return 'text-amber-600';
  if (type === 'check') return 'text-slate-600';
  return 'text-slate-500';
}

function textClass(type?: AiSummaryItem['type']) {
  if (type === 'status') return 'text-slate-800';
  if (type === 'action') return 'text-slate-700';
  if (type === 'risk') return 'text-amber-800';
  if (type === 'check') return 'text-slate-700';
  return 'text-slate-700';
}

function marketplaceClass(status?: ProfitStatus) {
  if (status === 'top') return 'text-emerald-600';
  if (status === 'on_target') return 'text-emerald-500';
  if (status === 'borderline') return 'text-amber-500';
  if (status === 'loss') return 'text-rose-500';
  return 'text-slate-800';
}
