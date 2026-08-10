import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import ProviderSparkline from './ProviderSparkline.svelte';
import type { DailyUsage } from './types';

const now = new Date(2026, 6, 10, 12).getTime();

function day(date: string, tokens: number): DailyUsage {
  return { date, tokens, estimatedCostUsd: null, estimateComplete: true };
}

afterEach(cleanup);

describe('ProviderSparkline', () => {
  it('renders a stroke-only line and a 2.5-pixel current-day point', () => {
    const { container } = render(ProviderSparkline, {
      daily: [day('2026-07-10', 70), day('2026-07-09', 20), day('2026-07-08', 40)],
      now,
    });

    expect(screen.getByRole('img', { name: 'Token usage over the last 7 days' })).toHaveAttribute(
      'viewBox',
      '0 0 56 14',
    );
    expect(container.querySelector('polyline')).toHaveClass('provider-sparkline__line');
    expect(container.querySelector('polyline')).toHaveAttribute('fill', 'none');
    expect(container.querySelector('circle')).toHaveAttribute('r', '1.25');
  });

  it('stays hidden until three days of valid history exist', () => {
    const { container } = render(ProviderSparkline, {
      daily: [day('2026-07-10', 70), day('2026-07-09', 20)],
      now,
    });

    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });
});
