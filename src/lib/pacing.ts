import type { QuotaWindow } from './types';

export type PaceSeverity = 'level' | 'healthy' | 'close' | 'runningOut' | 'spent';

export interface PaceProjection {
  severity: PaceSeverity;
  projectedUsedPercent: number | null;
  evenPacePercent: number | null;
  runOutAt: number | null;
}

export function projectPace(
  window: QuotaWindow,
  now: number,
  isSessionWindow = false,
): PaceProjection {
  const used = clamp(window.usedPercent, 0, 100);
  if (isVisiblySpent(window, used)) {
    return { severity: 'spent', projectedUsedPercent: 100, evenPacePercent: null, runOutAt: now };
  }
  const reset = window.resetsAt ? new Date(window.resetsAt).getTime() : Number.NaN;
  if (!Number.isFinite(reset) || reset <= now || window.periodSeconds <= 0) return level();
  if (isFreshSessionWindow(window, now, isSessionWindow)) return level();
  const periodMs = window.periodSeconds * 1000;
  const start = reset - periodMs;
  const elapsed = Math.max(0, now - start);
  const progress = clamp(elapsed / periodMs, 0, 1);
  if (elapsed < Math.max(60_000, periodMs * 0.01)) return level();
  const projected = used / progress;
  if (projected <= 90) {
    return {
      severity: 'healthy',
      projectedUsedPercent: projected,
      evenPacePercent: progress * 100,
      runOutAt: null,
    };
  }
  if (used < 5) return level();
  if (projected <= 100) {
    const spare = Math.round(100 - projected);
    return {
      severity: spare >= 1 ? 'close' : 'runningOut',
      projectedUsedPercent: projected,
      evenPacePercent: progress * 100,
      runOutAt: null,
    };
  }
  const candidate = start + (elapsed * 100) / used;
  return {
    severity: 'runningOut',
    projectedUsedPercent: projected,
    evenPacePercent: progress * 100,
    runOutAt: candidate > now && candidate < reset ? candidate : null,
  };
}

export function isFreshSessionWindow(window: QuotaWindow, now: number, isSessionWindow: boolean) {
  if (!isSessionWindow || window.usedPercent > 0 || !window.resetsAt) return false;
  const reset = new Date(window.resetsAt).getTime();
  return Number.isFinite(reset) && now < reset;
}

export function paceTooltip(value: PaceProjection) {
  if (value.severity === 'level') return null;
  if (value.severity === 'spent') return 'Limit reached';
  const projected = value.projectedUsedPercent;
  if (projected === null) return null;
  if (value.severity === 'healthy') return `~${Math.round(100 - projected)}% left at reset`;
  if (value.severity === 'close') return `~${Math.round(projected)}% used at reset`;
  if (projected <= 100) return '~100% used at reset';
  return `~${Math.max(1, Math.round(projected - 100))}% over limit at reset`;
}

/**
 * Turns an already-calculated quota pace into the short product-facing
 * projection shared by quota tooltips and the hero gauge.
 *
 * A zero/unknown burn rate, a young window, or an invalid reset all arrive as
 * an unprojected pace and intentionally produce no copy. That keeps the UI
 * quiet instead of manufacturing a deadline from sparse data.
 */
export function paceProjectionLine(value: PaceProjection, now: number): string | null {
  const projected = value.projectedUsedPercent;
  if (
    value.severity === 'level' ||
    value.severity === 'spent' ||
    projected === null ||
    !Number.isFinite(projected) ||
    projected <= 0
  ) {
    return null;
  }

  if (value.runOutAt !== null) {
    const remaining = value.runOutAt - now;
    if (!Number.isFinite(remaining) || remaining <= 0) return null;
    return `caps in ~${formatProjectionDuration(remaining)} at this pace`;
  }

  return projected <= 100 ? 'clears the reset at this pace' : null;
}

type TimeFormat = 'system' | 'twelveHour' | 'twentyFourHour';

export function formatReset(
  value: string | null,
  now: number,
  mode: 'countdown' | 'exact',
  timeFormat: TimeFormat = 'system',
) {
  if (!value) return 'Reset unavailable';
  const reset = new Date(value).getTime();
  if (!Number.isFinite(reset)) return 'Reset unavailable';
  return formatDeadline('Resets', reset, now, mode, timeFormat);
}

export function formatLimit(
  value: number | null,
  now: number,
  mode: 'countdown' | 'exact',
  timeFormat: TimeFormat = 'system',
) {
  if (value === null) return 'Limit reached';
  return formatDeadline('Limit', value, now, mode, timeFormat);
}

function formatDeadline(
  prefix: string,
  value: number,
  now: number,
  mode: 'countdown' | 'exact',
  timeFormat: TimeFormat,
) {
  const remaining = value - now;
  if (remaining <= 0 || (mode === 'countdown' && remaining <= 5 * 60_000)) {
    return `${prefix} soon`;
  }
  if (mode === 'countdown') return `${prefix} in ${formatDuration(remaining)}`;

  const date = new Date(value);
  const current = new Date(now);
  const currentDay = Date.UTC(current.getFullYear(), current.getMonth(), current.getDate());
  const targetDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDifference = Math.round((targetDay - currentDay) / 86_400_000);
  const time = date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: timeFormat === 'system' ? undefined : timeFormat === 'twelveHour',
  });
  if (dayDifference <= 0) return `${prefix} today at ${time}`;
  if (dayDifference === 1) return `${prefix} tomorrow at ${time}`;
  const monthDay = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date);
  return `${prefix} ${monthDay} at ${time}`;
}

function formatDuration(milliseconds: number) {
  const minutes = Math.max(1, Math.ceil(milliseconds / 60_000));
  const days = Math.floor(minutes / 1_440);
  const hours = Math.floor((minutes % 1_440) / 60);
  const remainder = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
  return `${remainder}m`;
}

function formatProjectionDuration(milliseconds: number) {
  const minutes = Math.max(1, Math.ceil(milliseconds / 60_000));
  const days = Math.floor(minutes / 1_440);
  const hours = Math.floor((minutes % 1_440) / 60);
  const remainder = minutes % 60;
  if (days > 0) return hours > 0 ? `${days}d ${String(hours).padStart(2, '0')}h` : `${days}d`;
  if (hours > 0) return `${hours}h ${String(remainder).padStart(2, '0')}m`;
  return `${remainder}m`;
}

function level(): PaceProjection {
  return { severity: 'level', projectedUsedPercent: null, evenPacePercent: null, runOutAt: null };
}

function isVisiblySpent(window: QuotaWindow, usedPercent: number) {
  if (
    window.format === 'dollars' &&
    window.usedValue !== null &&
    window.limitValue !== null &&
    window.limitValue > 0
  ) {
    return Math.round((window.limitValue - window.usedValue) * 100) / 100 <= 0;
  }
  return Math.round(100 - usedPercent) <= 0;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
