import type { AppSettings, UsageHistory, UsagePeriod } from './types';

export interface SpendProvider {
  id: string;
  usage: UsageHistory;
}

export interface SpendSlice {
  id: string;
  value: number;
  period: UsagePeriod;
}

export interface SpendProjection {
  slices: SpendSlice[];
  centerValue: number | null;
  costEstimated: boolean;
  estimateComplete: boolean;
}

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function calendarDateKey(date: Date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, index) =>
      index === 0 ? String(part).padStart(4, '0') : String(part).padStart(2, '0'),
    )
    .join('-');
}

function validCalendarDateKey(value: string) {
  const match = CALENDAR_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function selectedPeriod(
  history: UsageHistory,
  selection: AppSettings['totalSpendPeriod'],
): UsagePeriod | null {
  if (selection === 'today') return history.today;
  if (selection === 'yesterday') return history.yesterday;
  return history.last30Days;
}

function valueFor(period: UsagePeriod, metric: AppSettings['totalSpendMetric']): number | null {
  if (metric === 'tokens') return period.tokens > 0 ? period.tokens : null;
  if (period.estimatedCostUsd === null || period.estimatedCostUsd <= 0) return null;
  if (metric === 'costPerMillion') {
    return period.tokens > 0 ? (period.estimatedCostUsd / period.tokens) * 1_000_000 : null;
  }
  return period.estimatedCostUsd;
}

export function projectSpend(
  providers: SpendProvider[],
  periodSelection: AppSettings['totalSpendPeriod'],
  metric: AppSettings['totalSpendMetric'],
): SpendProjection {
  const slices = providers
    .flatMap((provider) => {
      const period = selectedPeriod(provider.usage, periodSelection);
      if (!period) return [];
      const value = valueFor(period, metric);
      return value === null ? [] : [{ id: provider.id, value, period }];
    })
    .sort((left, right) => right.value - left.value || left.id.localeCompare(right.id));

  if (slices.length === 0) {
    return { slices, centerValue: null, costEstimated: false, estimateComplete: true };
  }

  const centerValue =
    metric === 'costPerMillion'
      ? (() => {
          const totalCost = slices.reduce(
            (sum, slice) => sum + (slice.period.estimatedCostUsd ?? 0),
            0,
          );
          const totalTokens = slices.reduce((sum, slice) => sum + slice.period.tokens, 0);
          return totalTokens > 0 ? (totalCost / totalTokens) * 1_000_000 : null;
        })()
      : slices.reduce((sum, slice) => sum + slice.value, 0);

  return {
    slices,
    centerValue,
    costEstimated: metric !== 'tokens' && slices.some((slice) => slice.period.costEstimated),
    estimateComplete: slices.every((slice) => slice.period.estimateComplete),
  };
}

export function projectMonthlySpend(providers: SpendProvider[], now: number): number | null {
  if (!Number.isFinite(now)) return null;
  const today = new Date(now);
  if (!Number.isFinite(today.getTime())) return null;

  const todayKey = calendarDateKey(today);
  const monthStartKey = `${String(today.getFullYear()).padStart(4, '0')}-${String(
    today.getMonth() + 1,
  ).padStart(2, '0')}-01`;
  const rollingDates = new Set<string>();
  for (let offset = 0; offset < 30; offset += 1) {
    rollingDates.add(
      calendarDateKey(
        new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset, 12),
      ),
    );
  }

  const costByDate = new Map<string, number>();
  let hasSpendSample = false;
  for (const provider of providers) {
    const seenDates = new Set<string>();
    for (const sample of provider.usage.daily) {
      if (!validCalendarDateKey(sample.date) || seenDates.has(sample.date)) continue;
      seenDates.add(sample.date);
      const inCurrentMonth = sample.date >= monthStartKey && sample.date <= todayKey;
      if (!inCurrentMonth && !rollingDates.has(sample.date)) continue;
      if (sample.estimatedCostUsd === null || !Number.isFinite(sample.estimatedCostUsd)) continue;
      hasSpendSample = true;
      costByDate.set(
        sample.date,
        (costByDate.get(sample.date) ?? 0) + Math.max(0, sample.estimatedCostUsd),
      );
    }
  }

  if (!hasSpendSample) return null;
  const monthToDate = [...costByDate.entries()].reduce(
    (sum, [date, cost]) => (date >= monthStartKey && date <= todayKey ? sum + cost : sum),
    0,
  );
  const rollingSpend = [...rollingDates].reduce(
    (sum, date) => sum + (costByDate.get(date) ?? 0),
    0,
  );
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(0, daysInMonth - today.getDate());
  return Math.max(0, monthToDate + (rollingSpend / 30) * daysRemaining);
}

export function emptySpendMessage(metric: AppSettings['totalSpendMetric']) {
  if (metric === 'tokens') return 'No token data for this period';
  if (metric === 'costPerMillion') return 'No cost-per-token data for this period';
  return 'No cost data for this period';
}
