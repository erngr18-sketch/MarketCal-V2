'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type AiPanelIcon = 'info' | 'check' | 'alert' | 'trendUp' | 'trendDown' | 'target' | 'spark';
export type AiPanelTone = 'neutral' | 'success' | 'warning' | 'danger';

export type AiPanelItem = {
  icon: AiPanelIcon;
  text: string;
  title?: string;
  reason?: string;
  action?: string;
  inlineTitle?: boolean;
  tone?: AiPanelTone;
  emphasis?: boolean;
};

type AiPanelProps = {
  title?: string;
  disclaimer?: string;
  items: AiPanelItem[];
  emptyStateText?: string;
};

export function AiPanel({
  title = 'AI Analiz',
  disclaimer = 'Not: Bu analiz tahminidir. Fiyatları ve koşulları panelinizden doğrulayın.',
  items,
  emptyStateText = 'Analiz için girdileri tamamlayın.'
}: AiPanelProps) {
  const normalized = items.length > 0 ? items.slice(0, 5) : [{ icon: 'info' as const, tone: 'neutral' as const, text: emptyStateText }];

  return (
    <section className="card p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-indigo-500" />
        <h3 className="card-title">{title}</h3>
      </div>
      <div className="mt-3 h-px bg-slate-200" />
      <p className="mt-3 text-xs text-slate-500">{disclaimer}</p>

      <ul className="mt-4 space-y-3">
        {normalized.map((item, index) => {
          const Icon = iconByName(item.icon);
          const tone = item.tone ?? 'neutral';
          const hasStructuredContent = item.title || item.reason || item.action;
          return (
            <li key={`${item.text}-${index}`} className="flex items-start gap-2 text-sm">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${toneClass(tone)}`} />
              {hasStructuredContent ? (
                <div className="space-y-1 leading-6">
                  {item.title && item.inlineTitle && item.reason ? (
                    <p className="text-slate-700">
                      <span className="font-semibold text-slate-900">{item.title}</span> {item.reason}
                    </p>
                  ) : null}
                  {item.title && !(item.inlineTitle && item.reason) ? <p className="font-semibold text-slate-900">{item.title}</p> : null}
                  {item.reason && !(item.inlineTitle && item.title) ? <p className="text-slate-700">{item.reason}</p> : null}
                  {item.action ? <p className="text-slate-700">{item.action}</p> : null}
                </div>
              ) : (
                <span className={`${item.emphasis ? 'font-medium text-slate-900' : 'text-slate-700'} block whitespace-pre-line leading-6`}>{item.text}</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function iconByName(icon: AiPanelIcon): LucideIcon {
  if (icon === 'check') return CheckCircle2;
  if (icon === 'alert') return AlertTriangle;
  if (icon === 'trendUp') return TrendingUp;
  if (icon === 'trendDown') return TrendingDown;
  if (icon === 'target') return Target;
  if (icon === 'spark') return Sparkles;
  return Info;
}

function toneClass(tone: AiPanelTone) {
  if (tone === 'success') return 'text-emerald-600';
  if (tone === 'warning') return 'text-amber-600';
  if (tone === 'danger') return 'text-rose-600';
  return 'text-slate-500';
}
