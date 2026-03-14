export type ScenarioType = 'profit_scenario' | 'marketplace_comparison' | 'market_analysis' | 'price_position';
export type ScenarioPlan = 'free' | 'pro' | 'plus';

export type SavedScenarioRecord = {
  id: string;
  type: ScenarioType;
  title: string;
  inputs: Record<string, unknown>;
  result: Record<string, unknown>;
  aiSummary: string | null;
  createdAt: string;
  expiresAt: string | null;
};

export type ScenarioSavePolicy = {
  maxSavedScenarios: number;
  retentionDays: number | null;
};

export const scenarioSavePolicies: Record<ScenarioPlan, ScenarioSavePolicy> = {
  free: {
    maxSavedScenarios: 5,
    retentionDays: 30
  },
  pro: {
    maxSavedScenarios: 100,
    retentionDays: null
  },
  plus: {
    maxSavedScenarios: 500,
    retentionDays: null
  }
};

export const scenarioTitleLabels: Record<ScenarioType, string> = {
  profit_scenario: 'Kâr Senaryosu',
  marketplace_comparison: 'Pazaryeri Karşılaştırma',
  market_analysis: 'Rekabet Analizi',
  price_position: 'Fiyat Konumu'
};

export function getScenarioSavePolicy(plan: ScenarioPlan): ScenarioSavePolicy {
  return scenarioSavePolicies[plan];
}

export function buildDefaultScenarioTitle(type: ScenarioType, now = new Date()): string {
  const dateLabel = new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long'
  }).format(now);

  return `${scenarioTitleLabels[type]} - ${dateLabel}`;
}

export function buildScenarioSavePayload({
  id,
  type,
  title,
  inputs,
  result,
  aiSummary,
  createdAt,
  plan
}: {
  id?: string;
  type: ScenarioType;
  title: string;
  inputs: Record<string, unknown>;
  result: Record<string, unknown>;
  aiSummary: string | null;
  createdAt?: string;
  plan: ScenarioPlan;
}): SavedScenarioRecord {
  const nowIso = createdAt ?? new Date().toISOString();
  const policy = getScenarioSavePolicy(plan);

  return {
    id: id ?? createScenarioId(type, nowIso),
    type,
    title: title.trim() || buildDefaultScenarioTitle(type, new Date(nowIso)),
    inputs,
    result,
    aiSummary,
    createdAt: nowIso,
    expiresAt: policy.retentionDays === null ? null : addDays(nowIso, policy.retentionDays)
  };
}

export function canSaveScenario({
  plan,
  usedCount,
  savedScenarioId
}: {
  plan: ScenarioPlan;
  usedCount: number;
  savedScenarioId?: string | null;
}) {
  const policy = getScenarioSavePolicy(plan);
  const remaining = Math.max(0, policy.maxSavedScenarios - usedCount);
  const isUpdate = Boolean(savedScenarioId);
  const allowed = isUpdate || usedCount < policy.maxSavedScenarios;

  return {
    allowed,
    remaining,
    reason: allowed ? null : `Free planda ${policy.maxSavedScenarios} kayıt saklanabilir.`
  };
}

function createScenarioId(type: ScenarioType, createdAt: string) {
  const random = Math.random().toString(36).slice(2, 8);
  return `${type}_${createdAt.replaceAll(':', '').replaceAll('.', '').replaceAll('-', '')}_${random}`;
}

function addDays(isoString: string, days: number) {
  const date = new Date(isoString);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}
