import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { providerCatalogIndex, settingsState } from '../test/appFixtures';
import TotalSpend from './TotalSpend.svelte';
import type { UsageHistory } from './types';

afterEach(cleanup);

const period = {
  tokens: 1_000,
  estimatedCostUsd: 30,
  costEstimated: true,
  estimateComplete: true,
};

function usage(dailyCost: number | null): UsageHistory {
  return {
    today: period,
    yesterday: null,
    last30Days: period,
    daily:
      dailyCost === null
        ? []
        : [
            {
              date: '2026-04-10',
              tokens: 1_000,
              estimatedCostUsd: dailyCost,
              estimateComplete: true,
            },
          ],
    unknownModels: [],
  };
}

function renderTotalSpend(dailyCost: number | null) {
  return render(TotalSpend, {
    providers: [{ id: 'codex', usage: usage(dailyCost) }],
    now: new Date(2026, 3, 10, 12).getTime(),
    settings: settingsState.settings,
    catalog: providerCatalogIndex,
    onChange: vi.fn(),
    onShare: vi.fn(() => true),
  });
}

describe('TotalSpend monthly projection', () => {
  it('shows the exact projected-spend copy with an approximate currency prefix', () => {
    renderTotalSpend(30);

    expect(screen.getByText('on pace for ~$50.00 this month')).toBeInTheDocument();
  });

  it('hides the projection when daily spend history is absent', () => {
    renderTotalSpend(null);

    expect(screen.queryByText(/on pace for ~/i)).not.toBeInTheDocument();
  });
});
