import type { NotificationThresholds } from './types';

export const defaultNotificationThresholds: NotificationThresholds = {
  warning: 80,
  critical: 95,
  capped: 100,
};

export function normalizeNotificationThresholds(
  thresholds: NotificationThresholds,
): NotificationThresholds {
  const values = [thresholds.warning, thresholds.critical, thresholds.capped]
    .map((value) => clamp(Math.round(Number.isFinite(value) ? value : 1), 1, 100))
    .sort((left, right) => left - right);
  const warning = Math.min(values[0], 98);
  const critical = clamp(values[1], warning + 1, 99);
  const capped = clamp(values[2], critical + 1, 100);
  return { warning, critical, capped };
}

export function patchNotificationThreshold(
  thresholds: NotificationThresholds,
  key: keyof NotificationThresholds,
  value: number,
) {
  const current = normalizeNotificationThresholds(thresholds);
  const rounded = Math.round(value);
  if (key === 'warning') {
    return { ...current, warning: clamp(rounded, 1, current.critical - 1) };
  }
  if (key === 'critical') {
    return {
      ...current,
      critical: clamp(rounded, current.warning + 1, current.capped - 1),
    };
  }
  return { ...current, capped: clamp(rounded, current.critical + 1, 100) };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
