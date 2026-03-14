export type NumberSanitizeOptions = {
  fallback?: number;
  min?: number;
  max?: number;
  precision?: number | null;
};

export function normalizeFiniteNumber(value: unknown, options: NumberSanitizeOptions = {}): number {
  const {
    fallback = 0,
    min = Number.NEGATIVE_INFINITY,
    max = Number.POSITIVE_INFINITY,
    precision = 2
  } = options;

  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.trim().replace(',', '.'))
        : fallback;

  const safe = Number.isFinite(parsed) ? parsed : fallback;
  const clamped = Math.min(max, Math.max(min, safe));

  if (precision === null) return clamped;

  const factor = 10 ** precision;
  return Math.round(clamped * factor) / factor;
}

export function sanitizePlainText(
  value: unknown,
  options: {
    fallback?: string;
    maxLength?: number;
    minLength?: number;
  } = {}
): string {
  const { fallback = '', maxLength = 100, minLength = 0 } = options;
  if (typeof value !== 'string') return fallback;

  const withoutTags = value.replace(/<[^>]*>/g, ' ');
  const withoutAngles = withoutTags.replace(/[<>]/g, ' ');
  const withoutControlChars = withoutAngles.replace(/[\u0000-\u001F\u007F]/g, ' ');
  const normalizedWhitespace = withoutControlChars.replace(/\s+/g, ' ').trim();
  const truncated = normalizedWhitespace.slice(0, maxLength).trim();

  return truncated.length >= minLength ? truncated : fallback;
}

export function sanitizeSummaryText(value: unknown, maxLength = 500): string | null {
  const sanitized = sanitizePlainText(value, { fallback: '', maxLength });
  return sanitized.length > 0 ? sanitized : null;
}

export function sanitizeIsoDate(value: unknown, fallback = new Date().toISOString()): string {
  if (typeof value !== 'string') return fallback;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : fallback;
}
