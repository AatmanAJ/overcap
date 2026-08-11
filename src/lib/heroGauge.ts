import { projectPace, type PaceProjection } from './pacing';
import type { MetricDefinition, ProviderSnapshot, QuotaWindow } from './types';

export interface HeroGaugeProvider {
  providerId: string;
  providerName: string;
  snapshot: ProviderSnapshot;
  metricDefinitions: readonly MetricDefinition[];
}

export interface HeroGaugeSelection {
  providerId: string;
  providerName: string;
  metricId: string;
  metricName: string;
  quota: QuotaWindow;
  usedFraction: number;
  usedPercent: number;
  resetAt: number | null;
  isSessionWindow: boolean;
  pace: PaceProjection;
  hasPacing: boolean;
  projectedToCapBeforeReset: boolean;
}

/** Selects the most constrained known-cap quota without changing the provider data. */
export function selectHeroGaugeMetric(
  providers: readonly HeroGaugeProvider[],
  now: number,
): HeroGaugeSelection | null {
  const candidates = providers.flatMap((provider) =>
    provider.snapshot.quotas.flatMap((quota) => {
      if (!hasKnownCap(quota)) return [];

      const definition = quotaMetricDefinition(provider.metricDefinitions, quota.id);
      const pace = projectPace(quota, now, definition?.source.sessionWindow ?? false);
      const resetAt = futureTimestamp(quota.resetsAt, now);
      const projectedToCapBeforeReset =
        resetAt !== null &&
        ((pace.runOutAt !== null && pace.runOutAt < resetAt) ||
          (pace.severity === 'spent' && now < resetAt));

      return [
        {
          providerId: provider.providerId,
          providerName: provider.providerName,
          metricId: definition?.id ?? quota.id,
          metricName: definition?.label ?? quota.label,
          quota,
          usedFraction: usedFraction(quota),
          usedPercent: clamp(usedFraction(quota) * 100, 0, 100),
          resetAt,
          isSessionWindow: definition?.source.sessionWindow ?? false,
          pace,
          hasPacing: pace.projectedUsedPercent !== null || pace.severity === 'spent',
          projectedToCapBeforeReset,
        } satisfies HeroGaugeSelection,
      ];
    }),
  );

  if (candidates.length === 0) return null;
  const hasAnyPacing = candidates.some((candidate) => candidate.hasPacing);

  return [...candidates].sort((left, right) => {
    if (hasAnyPacing && left.projectedToCapBeforeReset !== right.projectedToCapBeforeReset) {
      return left.projectedToCapBeforeReset ? -1 : 1;
    }

    const usageDifference = right.usedFraction - left.usedFraction;
    if (Math.abs(usageDifference) > Number.EPSILON) return usageDifference;

    const resetDifference = sortableReset(left.resetAt) - sortableReset(right.resetAt);
    if (resetDifference !== 0) return resetDifference;

    return `${left.providerName}\u0000${left.metricName}\u0000${left.metricId}`.localeCompare(
      `${right.providerName}\u0000${right.metricName}\u0000${right.metricId}`,
    );
  })[0];
}

export function hasKnownCap(quota: QuotaWindow) {
  if (!Number.isFinite(quota.usedPercent)) return false;
  if (quota.format === 'percent') return true;
  return quota.limitValue !== null && Number.isFinite(quota.limitValue) && quota.limitValue > 0;
}

export function heroGaugeStatus(selection: HeroGaugeSelection) {
  if (selection.projectedToCapBeforeReset) return 'Cap in sight.';
  if (selection.usedPercent >= 95) return 'Redlining.';
  if (selection.usedPercent >= 80) return 'Getting tight.';
  return 'Room to breathe.';
}

function quotaMetricDefinition(definitions: readonly MetricDefinition[], quotaId: string) {
  return definitions.find((definition) => {
    const source = definition.source;
    return (
      (source.kind === 'quota' || source.kind === 'quotaOrValue') && source.sourceId === quotaId
    );
  }) as
    | (MetricDefinition & {
        source:
          | { kind: 'quota'; sourceId: string; sessionWindow: boolean }
          | { kind: 'quotaOrValue'; sourceId: string; sessionWindow: boolean };
      })
    | undefined;
}

function usedFraction(quota: QuotaWindow) {
  if (
    quota.format !== 'percent' &&
    quota.usedValue !== null &&
    Number.isFinite(quota.usedValue) &&
    quota.limitValue !== null &&
    Number.isFinite(quota.limitValue) &&
    quota.limitValue > 0
  ) {
    return Math.max(0, quota.usedValue / quota.limitValue);
  }
  return Math.max(0, quota.usedPercent / 100);
}

function futureTimestamp(value: string | null, now: number) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp > now ? timestamp : null;
}

function sortableReset(value: number | null) {
  return value ?? Number.POSITIVE_INFINITY;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
