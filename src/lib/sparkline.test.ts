import { describe, expect, it } from 'vitest';
import { mapSparklineData, SPARKLINE_HEIGHT, SPARKLINE_WIDTH } from './sparkline';
import type { DailyUsage } from './types';

const now = new Date(2026, 6, 10, 12).getTime();

function day(date: string, tokens: number): DailyUsage {
  return { date, tokens, estimatedCostUsd: null, estimateComplete: true };
}

describe('provider sparkline mapping', () => {
  it('maps newest-first history onto seven chronological calendar points with gaps', () => {
    const mapped = mapSparklineData(
      [day('2026-07-10', 70), day('2026-07-08', 40), day('2026-07-05', 10)],
      now,
    );

    expect(mapped?.points.map(({ date, tokens, actual }) => ({ date, tokens, actual }))).toEqual([
      { date: '2026-07-04', tokens: 0, actual: false },
      { date: '2026-07-05', tokens: 10, actual: true },
      { date: '2026-07-06', tokens: 0, actual: false },
      { date: '2026-07-07', tokens: 0, actual: false },
      { date: '2026-07-08', tokens: 40, actual: true },
      { date: '2026-07-09', tokens: 0, actual: false },
      { date: '2026-07-10', tokens: 70, actual: true },
    ]);
    expect(mapped?.current.date).toBe('2026-07-10');
  });

  it('requires three unique valid samples inside the current window', () => {
    expect(
      mapSparklineData(
        [
          day('2026-07-10', 10),
          day('2026-07-09', 20),
          day('2026-07-03', 30),
          day('2026-07-08', Number.NaN),
          day('2026-07-07', -1),
        ],
        now,
      ),
    ).toBeNull();
  });

  it('keeps the line and current dot inside the 56x16 drawing area', () => {
    const mapped = mapSparklineData(
      [day('2026-07-10', 70), day('2026-07-09', 20), day('2026-07-08', 40)],
      now,
    );

    expect(mapped?.points[0].x).toBe(1.5);
    expect(mapped?.current.x).toBe(SPARKLINE_WIDTH - 1.5);
    expect(mapped?.points.every((point) => point.y >= 1.5 && point.y <= 14.5)).toBe(true);
    expect(mapped?.current.y).toBeGreaterThanOrEqual(1.5);
    expect(mapped?.current.y).toBeLessThanOrEqual(SPARKLINE_HEIGHT - 1.5);
  });

  it('centres a constant series without emitting invalid coordinates', () => {
    const mapped = mapSparklineData(
      [
        day('2026-07-10', 12),
        day('2026-07-09', 12),
        day('2026-07-08', 12),
        day('2026-07-07', 12),
        day('2026-07-06', 12),
        day('2026-07-05', 12),
        day('2026-07-04', 12),
      ],
      now,
    );

    expect(mapped?.points.every((point) => point.y === SPARKLINE_HEIGHT / 2)).toBe(true);
    expect(mapped?.polyline).not.toMatch(/NaN|Infinity/);
  });
});
