import { describe, expect, it } from 'vitest';
import {
  hasKnownCap,
  heroBarPresentation,
  heroGaugeStatus,
  selectHeroGaugeMetric,
  type HeroGaugeProvider,
} from './heroGauge';
import type { MetricDefinition, ProviderSnapshot, QuotaWindow } from './types';

const now = Date.parse('2026-08-10T12:00:00Z');

function quota(
  id: string,
  usedPercent: number,
  resetInSeconds: number | null,
  overrides: Partial<QuotaWindow> = {},
): QuotaWindow {
  return {
    id,
    label: id === 'session' ? 'Session' : 'Weekly',
    usedPercent,
    resetsAt: resetInSeconds === null ? null : new Date(now + resetInSeconds * 1000).toISOString(),
    periodSeconds: 1_000,
    format: 'percent',
    usedValue: null,
    limitValue: null,
    estimated: false,
    ...overrides,
  };
}

function definition(
  providerId: string,
  sourceId: string,
  label: string,
  sessionWindow = false,
  kind: 'quota' | 'quotaOrValue' = 'quota',
): MetricDefinition {
  return {
    id: `${providerId}.${sourceId}`,
    label,
    source: { kind, sourceId, sessionWindow },
    pinnable: true,
    defaultEnabled: true,
    defaultSection: 'alwaysVisible',
    defaultPinned: false,
    tray: null,
  };
}

function provider(
  providerId: string,
  providerName: string,
  quotas: QuotaWindow[],
  definitions = quotas.map((item) => definition(providerId, item.id, item.label)),
): HeroGaugeProvider {
  const snapshot: ProviderSnapshot = {
    providerId,
    plan: null,
    quotas,
    valueMetrics: [],
    statusMetrics: [],
    notices: [],
    usage: { today: null, yesterday: null, last30Days: null, daily: [], unknownModels: [] },
    warnings: [],
    refreshedAt: new Date(now).toISOString(),
  };
  return { providerId, providerName, snapshot, metricDefinitions: definitions };
}

describe('hero gauge selection', () => {
  it('prefers a quota projected to cap before reset over a higher current fraction', () => {
    const projected = quota('session', 60, 500);
    const highButLevel = quota('weekly', 90, 50, { periodSeconds: 1_000 });

    const result = selectHeroGaugeMetric(
      [provider('claude', 'Claude', [highButLevel]), provider('codex', 'Codex', [projected])],
      now,
    );

    expect(result).toMatchObject({
      providerId: 'codex',
      metricId: 'codex.session',
      projectedToCapBeforeReset: true,
    });
  });

  it('uses the highest fraction among multiple projected-to-cap candidates', () => {
    const lower = quota('daily', 55, 500);
    const higher = quota('weekly', 72, 500);
    const result = selectHeroGaugeMetric(
      [provider('codex', 'Codex', [lower]), provider('claude', 'Claude', [higher])],
      now,
    );

    expect(result?.providerId).toBe('claude');
    expect(result?.projectedToCapBeforeReset).toBe(true);
  });

  it('falls back to the highest fraction used when pacing is unavailable', () => {
    const result = selectHeroGaugeMetric(
      [
        provider('codex', 'Codex', [quota('weekly', 64, null)]),
        provider('claude', 'Claude', [quota('session', 81, null)]),
      ],
      now,
    );

    expect(result).toMatchObject({ providerId: 'claude', usedPercent: 81, hasPacing: false });
  });

  it('breaks equal-usage ties by the soonest future reset', () => {
    const result = selectHeroGaugeMetric(
      [
        provider('codex', 'Codex', [quota('weekly', 48, 800)]),
        provider('claude', 'Claude', [quota('weekly', 48, 700)]),
      ],
      now,
    );

    expect(result?.providerId).toBe('claude');
    expect(result?.resetAt).toBe(now + 700_000);
  });

  it('uses explicit count and spend caps to calculate their fractions', () => {
    const spend = quota('budget', 10, null, {
      format: 'dollars',
      usedValue: 45,
      limitValue: 50,
    });
    const requests = quota('requests', 80, null, {
      format: 'count',
      usedValue: 80,
      limitValue: 100,
    });
    const result = selectHeroGaugeMetric(
      [provider('openrouter', 'OpenRouter', [requests, spend])],
      now,
    );

    expect(result).toMatchObject({ metricId: 'openrouter.budget', usedFraction: 0.9 });
  });

  it('ignores non-percent quotas without a known cap and returns null with no candidates', () => {
    const uncapped = quota('credits', 99, null, {
      format: 'dollars',
      usedValue: 99,
      limitValue: null,
    });

    expect(hasKnownCap(uncapped)).toBe(false);
    expect(
      selectHeroGaugeMetric([provider('openrouter', 'OpenRouter', [uncapped])], now),
    ).toBeNull();
  });

  it('preserves catalog labels, provider nicknames, and session pacing metadata', () => {
    const session = quota('session', 40, 500);
    const customDefinition = definition('codex', 'session', 'Five hour cap', true, 'quotaOrValue');
    const result = selectHeroGaugeMetric(
      [provider('codex', 'Work Codex', [session], [customDefinition])],
      now,
    );

    expect(result).toMatchObject({
      providerName: 'Work Codex',
      metricName: 'Five hour cap',
      isSessionWindow: true,
    });
  });

  it('keeps the copy calm until usage or pace makes the selected cap tight', () => {
    const calm = selectHeroGaugeMetric(
      [provider('codex', 'Codex', [quota('weekly', 42, null)])],
      now,
    );
    const tight = selectHeroGaugeMetric(
      [provider('codex', 'Codex', [quota('weekly', 84, null)])],
      now,
    );
    const projected = selectHeroGaugeMetric(
      [provider('codex', 'Codex', [quota('weekly', 60, 500)])],
      now,
    );

    expect(calm && heroGaugeStatus(calm)).toBe('Room to breathe.');
    expect(tight && heroGaugeStatus(tight)).toBe('Getting tight.');
    expect(projected && heroGaugeStatus(projected)).toBe('Cap in sight.');
  });
});

describe('hero bar presentation', () => {
  it('marks the next threshold and cuts directly between semantic fill colours', () => {
    expect(heroBarPresentation(79.9)).toEqual({ tone: 'accent', activeThreshold: 80 });
    expect(heroBarPresentation(80)).toEqual({ tone: 'warning', activeThreshold: 95 });
    expect(heroBarPresentation(94.9)).toEqual({ tone: 'warning', activeThreshold: 95 });
    expect(heroBarPresentation(95)).toEqual({ tone: 'critical', activeThreshold: 100 });
    expect(heroBarPresentation(100)).toEqual({ tone: 'critical', activeThreshold: 100 });
  });
});
