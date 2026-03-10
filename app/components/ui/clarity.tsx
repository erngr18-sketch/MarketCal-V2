import type { ReactNode } from 'react';

type DecisionHeroProps = {
  eyebrow?: string;
  title: string;
  detail?: string;
  badge?: ReactNode;
  metrics?: Array<{
    label: string;
    value: string;
    tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent';
  }>;
};

type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent';
  emphasis?: boolean;
};

type InfoNoteProps = {
  label: string;
  text: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
};

export function DecisionHero({ eyebrow, title, detail, badge, metrics = [] }: DecisionHeroProps) {
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p> : null}
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          {detail ? <p className="text-sm text-slate-600">{detail}</p> : null}
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>

      {metrics.length > 0 ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div key={`${metric.label}-${metric.value}`} className={`rounded-xl border px-3 py-2 ${metricToneClass(metric.tone)}`}>
              <p className="text-[11px] text-slate-500">{metric.label}</p>
              <p className="number-display text-sm font-semibold text-slate-900">{metric.value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function MetricCard({ label, value, hint, tone = 'neutral', emphasis = false }: MetricCardProps) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${metricToneClass(tone, emphasis)}`}>
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className={`number-display font-semibold text-slate-900 ${emphasis ? 'text-base' : 'text-sm'}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-600">{hint}</p> : null}
    </div>
  );
}

export function InfoNote({ label, text, tone = 'neutral' }: InfoNoteProps) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${noteToneClass(tone)}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-700">{text}</p>
    </div>
  );
}

function metricToneClass(tone: MetricCardProps['tone'], emphasis = false) {
  if (tone === 'success') return emphasis ? 'border-emerald-300 bg-emerald-50/70' : 'border-emerald-200 bg-emerald-50/40';
  if (tone === 'warning') return emphasis ? 'border-amber-300 bg-amber-50/80' : 'border-amber-200 bg-amber-50/40';
  if (tone === 'danger') return emphasis ? 'border-rose-300 bg-rose-50/80' : 'border-rose-200 bg-rose-50/40';
  if (tone === 'accent') return emphasis ? 'border-sky-300 bg-sky-50/80' : 'border-sky-200 bg-sky-50/50';
  return emphasis ? 'border-slate-300 bg-white shadow-sm' : 'border-slate-200 bg-slate-50';
}

function noteToneClass(tone: InfoNoteProps['tone']) {
  if (tone === 'success') return 'border-emerald-200 bg-emerald-50/50';
  if (tone === 'warning') return 'border-amber-200 bg-amber-50/50';
  if (tone === 'danger') return 'border-rose-200 bg-rose-50/50';
  return 'border-slate-200 bg-slate-50/70';
}
