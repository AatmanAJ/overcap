import { describe, expect, it } from 'vitest';
import { projectMonthlySpend, projectSpend } from './totalSpend';
import type { DailyUsage, UsageHistory } from './types';

const empty: UsageHistory = {
  today: null,
  yesterday: null,
  last30Days: null,
  daily: [],
  unknownModels: [],
};

function usage(today: UsageHistory['today']): UsageHistory {
  return { ...empty, today };
}

function history(daily: DailyUsage[]): UsageHistory {
  return { ...empty, daily };
}

function sample(date: string, estimatedCostUsd: number | null): DailyUsage {
  return { date, tokens: 1_000, estimatedCostUsd, estimateComplete: true };
}

describe('Total Spend projection', () => {
  it('keeps token-only Codex data available without inventing cost data', () => {
    const providers = [
      {
        id: 'codex',
        usage: usage({
          tokens: 164_800_000,
          estimatedCostUsd: null,
          costEstimated: true,
          estimateComplete: false,
        }),
      },
      { id: 'antigravity', usage: empty },
    ];

    expect(projectSpend(providers, 'today', 'cost').slices).toEqual([]);
    expect(projectSpend(providers, 'today', 'tokens')).toMatchObject({
      centerValue: 164_800_000,
      slices: [{ id: 'codex', value: 164_800_000 }],
    });
  });

  it('does not let a token-only provider erase another provider cost', () => {
    const providers = [
      {
        id: 'claude',
        usage: usage({
          tokens: 1_000_000,
          estimatedCostUsd: 4,
          costEstimated: true,
          estimateComplete: true,
        }),
      },
      {
        id: 'codex',
        usage: usage({
          tokens: 9_000_000,
          estimatedCostUsd: null,
          costEstimated: true,
          estimateComplete: false,
        }),
      },
    ];

    expect(projectSpend(providers, 'today', 'cost')).toMatchObject({
      centerValue: 4,
      slices: [{ id: 'claude', value: 4 }],
    });
  });

  it('calculates a blended cost per million instead of summing provider rates', () => {
    const providers = [
      {
        id: 'claude',
        usage: usage({
          tokens: 1_000_000,
          estimatedCostUsd: 10,
          costEstimated: true,
          estimateComplete: true,
        }),
      },
      {
        id: 'codex',
        usage: usage({
          tokens: 3_000_000,
          estimatedCostUsd: 60,
          costEstimated: true,
          estimateComplete: true,
        }),
      },
    ];

    expect(projectSpend(providers, 'today', 'costPerMillion').centerValue).toBe(17.5);
  });

  it('tracks local estimation independently from pricing coverage', () => {
    const providers = [
      {
        id: 'claude',
        usage: usage({
          tokens: 1_000,
          estimatedCostUsd: 2,
          costEstimated: true,
          estimateComplete: false,
        }),
      },
    ];

    expect(projectSpend(providers, 'today', 'cost')).toMatchObject({
      costEstimated: true,
      estimateComplete: false,
    });
    expect(projectSpend(providers, 'today', 'tokens')).toMatchObject({
      costEstimated: false,
      estimateComplete: false,
    });
  });
});

describe('monthly spend projection', () => {
  it('uses a 30-calendar-day average with sparse days counted as zero', () => {
    const now = new Date(2026, 3, 10, 12).getTime();
    const providers = [{ id: 'codex', usage: history([sample('2026-04-10', 30)]) }];

    expect(projectMonthlySpend(providers, now)).toBe(50);
  });

  it('aggregates providers while keeping the first newest-first sample for a duplicate date', () => {
    const now = new Date(2026, 3, 10, 12).getTime();
    const providers = [
      {
        id: 'claude',
        usage: history([
          sample('2026-04-10', 10),
          sample('2026-04-10', 100),
          sample('2026-04-08', 5),
        ]),
      },
      { id: 'codex', usage: history([sample('2026-04-10', 20)]) },
    ];

    expect(projectMonthlySpend(providers, now)).toBeCloseTo(35 + (35 / 30) * 20);
  });

  it('uses the actual days remaining in a leap-year month', () => {
    const now = new Date(2028, 1, 10, 12).getTime();
    const providers = [{ id: 'codex', usage: history([sample('2028-02-10', 30)]) }];

    expect(projectMonthlySpend(providers, now)).toBe(49);
  });

  it('keeps the full month-to-date total on day 31', () => {
    const now = new Date(2026, 0, 31, 12).getTime();
    const providers = [
      {
        id: 'codex',
        usage: history([sample('2026-01-31', 30), sample('2026-01-01', 31)]),
      },
    ];

    expect(projectMonthlySpend(providers, now)).toBe(61);
  });

  it.each([
    ['empty history', []],
    ['unknown cost', [sample('2026-04-10', null)]],
    ['stale history', [sample('2026-01-01', 20)]],
    ['future history', [sample('2026-04-11', 20)]],
  ])('hides when spend samples are absent: %s', (_label, daily) => {
    const now = new Date(2026, 3, 10, 12).getTime();

    expect(projectMonthlySpend([{ id: 'codex', usage: history(daily) }], now)).toBeNull();
  });

  it('clamps negative spend samples so the projection is nonnegative', () => {
    const now = new Date(2026, 3, 10, 12).getTime();
    const providers = [{ id: 'codex', usage: history([sample('2026-04-10', -30)]) }];

    expect(projectMonthlySpend(providers, now)).toBe(0);
  });

  it('rejects invalid clocks, malformed dates, and non-finite costs', () => {
    const now = new Date(2026, 3, 10, 12).getTime();

    expect(projectMonthlySpend([], Number.NaN)).toBeNull();
    expect(
      projectMonthlySpend([{ id: 'codex', usage: history([sample('2026-02-30', 20)]) }], now),
    ).toBeNull();
    expect(
      projectMonthlySpend(
        [{ id: 'codex', usage: history([sample('2026-04-10', Number.POSITIVE_INFINITY)]) }],
        now,
      ),
    ).toBeNull();
  });
});
