import type { DailyUsage } from './types';

export const SPARKLINE_WIDTH = 56;
export const SPARKLINE_HEIGHT = 16;
export const SPARKLINE_DOT_DIAMETER = 3;

export interface SparklinePoint {
  date: string;
  tokens: number;
  actual: boolean;
  x: number;
  y: number;
}

export interface SparklineData {
  points: SparklinePoint[];
  polyline: string;
  current: SparklinePoint;
}

export function mapSparklineData(daily: DailyUsage[], now: number): SparklineData | null {
  const anchor = new Date(now);
  if (!Number.isFinite(anchor.getTime())) return null;
  anchor.setHours(12, 0, 0, 0);

  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(anchor);
    date.setDate(anchor.getDate() - (6 - index));
    return localDateKey(date);
  });
  const wantedDates = new Set(dates);
  const byDate = new Map<string, number>();

  // History arrives newest-first. Keep the first valid sample for a date and
  // ignore entries outside the exact seven-day calendar window.
  for (const sample of daily) {
    if (
      byDate.has(sample.date) ||
      !wantedDates.has(sample.date) ||
      !Number.isFinite(sample.tokens) ||
      sample.tokens < 0
    ) {
      continue;
    }
    byDate.set(sample.date, sample.tokens);
  }

  if (byDate.size < 3) return null;

  const values = dates.map((date) => byDate.get(date) ?? 0);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum;
  const padding = SPARKLINE_DOT_DIAMETER / 2;
  const drawableWidth = SPARKLINE_WIDTH - padding * 2;
  const drawableHeight = SPARKLINE_HEIGHT - padding * 2;
  const points = dates.map((date, index): SparklinePoint => {
    const tokens = values[index];
    const normalized = range === 0 ? 0.5 : (tokens - minimum) / range;
    return {
      date,
      tokens,
      actual: byDate.has(date),
      x: roundCoordinate(padding + (drawableWidth * index) / (dates.length - 1)),
      y: roundCoordinate(padding + (1 - normalized) * drawableHeight),
    };
  });

  return {
    points,
    polyline: points.map((point) => `${point.x},${point.y}`).join(' '),
    current: points[points.length - 1],
  };
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function roundCoordinate(value: number) {
  return Math.round(value * 1_000) / 1_000;
}
