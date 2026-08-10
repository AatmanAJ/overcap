import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import HeroGauge from './HeroGauge.svelte';
import type { HeroGaugeSelection } from './heroGauge';

const selection: HeroGaugeSelection = {
  providerId: 'codex',
  providerName: 'Work Codex',
  metricId: 'codex.weekly',
  metricName: 'Weekly limit',
  quota: {
    id: 'weekly',
    label: 'Weekly limit',
    usedPercent: 84.4,
    resetsAt: '2026-08-11T12:00:00.000Z',
    periodSeconds: 604_800,
    format: 'percent',
    usedValue: null,
    limitValue: null,
    estimated: false,
  },
  usedFraction: 0.844,
  usedPercent: 84.4,
  resetAt: Date.parse('2026-08-11T12:00:00.000Z'),
  isSessionWindow: false,
  pace: {
    severity: 'runningOut',
    projectedUsedPercent: 120,
    evenPacePercent: 70,
    runOutAt: Date.parse('2026-08-11T10:00:00.000Z'),
  },
  hasPacing: true,
  projectedToCapBeforeReset: true,
};

afterEach(cleanup);

describe('HeroGauge', () => {
  it('renders the selected constraint as an accessible full-width threshold bar', () => {
    const { container } = render(HeroGauge, {
      selection,
      reducedMotion: false,
      projectionText: 'caps in ~2h 05m at this pace',
    });

    const progress = screen.getByRole('progressbar', {
      name: 'Work Codex Weekly limit usage',
    });
    expect(progress).toHaveAttribute('aria-valuenow', '84');
    expect(progress).toHaveTextContent('Work Codex / Weekly limit');
    expect(progress).toHaveTextContent('84%');
    expect(progress).toHaveTextContent('caps in ~2h 05m at this pace');
    expect(container.querySelector('.hero-gauge__fill')).toHaveClass('hero-gauge__fill--warning');
    expect(container.querySelector('.hero-gauge__fill')).toHaveStyle({ width: '84%' });
    expect(container.querySelector('.hero-gauge__threshold')).toHaveStyle({ left: '95%' });
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  it('turns off the fill transition when reduced motion is requested', () => {
    const { container } = render(HeroGauge, {
      selection,
      reducedMotion: true,
      projectionText: null,
    });

    expect(container.querySelector('.hero-gauge')).toHaveClass('hero-gauge--reduced-motion');
    expect(screen.queryByText(/at this pace/i)).not.toBeInTheDocument();
  });
});
