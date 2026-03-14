'use client';

import { BookmarkPlus, CheckCircle2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  buildDefaultScenarioTitle,
  getScenarioSavePolicy,
  type SavedScenarioRecord,
  type ScenarioPlan,
  type ScenarioType
} from '@/lib/scenario-save';
import { sanitizeScenarioPayload, validateSaveQuota } from '@/lib/security/scenario-validation';

const STORAGE_KEY = 'marketcal.saved-scenarios';

type ScenarioSaveControlProps = {
  type: ScenarioType;
  enabled: boolean;
  inputs: Record<string, unknown>;
  result: Record<string, unknown>;
  aiSummary: string | null;
  plan?: ScenarioPlan;
};

export function ScenarioSaveControl({
  type,
  enabled,
  inputs,
  result,
  aiSummary,
  plan = 'free'
}: ScenarioSaveControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(() => buildDefaultScenarioTitle(type));
  const [savedScenarioId, setSavedScenarioId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenarioRecord[]>([]);

  useEffect(() => {
    setSavedScenarios(readSavedScenarios());
  }, []);

  useEffect(() => {
    if (!savedScenarioId) {
      setTitle(buildDefaultScenarioTitle(type));
    }
  }, [savedScenarioId, type]);

  const policy = getScenarioSavePolicy(plan);
  const saveState = useMemo(
    () =>
      validateSaveQuota({
        trustedPlan: plan,
        usedCount: savedScenarios.length,
        savedScenarioId
      }),
    [plan, savedScenarioId, savedScenarios.length]
  );

  const usageText =
    plan === 'free'
      ? `${savedScenarios.length} / ${policy.maxSavedScenarios} kayıt kullanıldı${Math.max(0, policy.maxSavedScenarios - savedScenarios.length) > 0 ? ` • ${Math.max(0, policy.maxSavedScenarios - savedScenarios.length)} kayıt hakkın kaldı` : ''}`
      : `${savedScenarios.length} kayıt saklandı`;

  const onToggle = () => {
    if (!enabled) return;
    setIsOpen((prev) => !prev);
    setFeedback(null);
  };

  const onSave = () => {
    if (!enabled) return;
    if (!saveState.ok) {
      setFeedback({ tone: 'error', text: saveState.error ?? 'Senaryo kaydedilemedi.' });
      return;
    }

    const validation = sanitizeScenarioPayload({
      id: savedScenarioId ?? undefined,
      type,
      title,
      inputs,
      result,
      aiSummary,
      trustedPlan: plan,
      usedCount: savedScenarios.length,
      savedScenarioId
    });

    if (!validation.ok) {
      setFeedback({ tone: 'error', text: validation.error });
      return;
    }

    const nextSaved = upsertSavedScenario(validation.payload);
    setSavedScenarios(nextSaved);
    setSavedScenarioId(validation.payload.id);
    setFeedback({
      tone: 'success',
      text: savedScenarioId ? 'Senaryo güncellendi' : 'Senaryo kaydedildi'
    });
    setIsOpen(false);
  };

  return (
    <section className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Senaryoyu Kaydet</p>
          <p className="mt-1 text-xs text-slate-500">{usageText}</p>
        </div>

        <button
          type="button"
          onClick={onToggle}
          disabled={!enabled}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <BookmarkPlus className="h-4 w-4" />
          <span>{savedScenarioId ? 'Güncelle' : 'Kaydet'}</span>
        </button>
      </div>

      {!saveState.ok && !savedScenarioId ? <p className="mt-3 text-xs text-amber-600">{saveState.error}</p> : null}
      {!enabled ? <p className="mt-3 text-xs text-slate-500">Kaydetmek için önce anlamlı bir sonuç oluşturun.</p> : null}

      {isOpen && enabled ? (
        <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
          <label className="space-y-1.5 text-sm text-slate-700">
            <span>Başlık</span>
            <input type="text" maxLength={100} className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>

          {policy.retentionDays ? <p className="text-xs text-slate-500">Free planda kayıtlar {policy.retentionDays} gün saklanır.</p> : null}

          <div className="flex items-center justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setIsOpen(false)}>
              Vazgeç
            </button>
            <button type="button" className="btn btn-primary" onClick={onSave} disabled={!saveState.ok}>
              {savedScenarioId ? 'Güncellemeyi Kaydet' : 'Kaydet'}
            </button>
          </div>
        </div>
      ) : null}

      {feedback ? (
        <p className={`mt-3 inline-flex items-center gap-2 text-xs ${feedback.tone === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
          {feedback.tone === 'success' ? <CheckCircle2 className="h-4 w-4" /> : null}
          <span>{feedback.text}</span>
        </p>
      ) : null}
    </section>
  );
}

function readSavedScenarios(): SavedScenarioRecord[] {
  if (typeof window === 'undefined') return [];

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as SavedScenarioRecord[];
    const now = Date.now();
    const filtered = parsed.filter((item) => !item.expiresAt || new Date(item.expiresAt).getTime() > now);

    if (filtered.length !== parsed.length) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }

    return filtered;
  } catch {
    return [];
  }
}

function upsertSavedScenario(payload: SavedScenarioRecord) {
  const current = readSavedScenarios();
  const next = [payload, ...current.filter((item) => item.id !== payload.id)];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
