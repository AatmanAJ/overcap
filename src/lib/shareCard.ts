import type { ProviderCatalogIndex } from './metrics';
import { formatMetricNumber, formatMetricValue, formatSpendValue } from './metricFormat';
import { formatLimit, formatReset, projectPace } from './pacing';
import { providerIconViewBox } from './providerIconPaths';
import type { SpendProjection } from './totalSpend';
import type {
  AppSettings,
  DailyUsage,
  ProviderLayout,
  ProviderSnapshot,
  QuotaWindow,
  UsagePeriod,
} from './types';

export const SHARE_CARD_WIDTH = 360;
export const SHARE_CARD_SCALE = 4;

export const SHARE_RECEIPT_COLORS = {
  paper: '#fcfbf7',
  ink: '#12161b',
  header: '#151a20',
  headerInk: '#f2f0e9',
  muted: '#5c646b',
  rule: '#c9c7be',
  signal: '#f04b2f',
} as const;

const RECEIPT_HEADER_HEIGHT = 64;
const RECEIPT_BODY_PADDING_TOP = 14;
const RECEIPT_HORIZONTAL_PADDING = 20;
const RECEIPT_ROW_HEIGHT = 24;
const RECEIPT_SEPARATOR_HEIGHT = 21;
const RECEIPT_FOOTER_HEIGHT = 40;
const RECEIPT_EMPTY_ROW_HEIGHT = RECEIPT_ROW_HEIGHT;
const UI_FONT = '"Inter", system-ui, sans-serif';
const FIGURE_FONT = '"JetBrains Mono", ui-monospace, SFMono-Regular, Consolas, monospace';
const RECEIPT_MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const;

export const TOTAL_SPEND_PERIOD_LABELS = ['Today', 'Yesterday', '30 Days'] as const;
export const TOTAL_SPEND_GEOMETRY = {
  width: 320,
  outerPadding: 10,
  cardPaddingX: 14,
  cardPaddingY: 12,
  switcherHeight: 27,
  bodyGap: 12,
  ringDiameter: 104,
  innerRadiusRatio: 0.618,
  gapWidth: 1.6,
  cornerRadius: 3,
  legendGap: 18,
  legendRowHeight: 22,
  periodFontSize: 11,
  legendFontSize: 12,
  centerFontSize: 13,
  centerUnitFontSize: 9,
} as const;
export const TOTAL_SPEND_OUTER_PADDING = TOTAL_SPEND_GEOMETRY.outerPadding;

export type ShareRow =
  | {
      kind: 'quota';
      label: string;
      reading: string;
      trailing: string;
      fillPercent: number;
      severity: 'normal' | 'warning' | 'critical';
      paceLabel: string | null;
    }
  | { kind: 'text'; label: string; value: string; condensed: boolean }
  | { kind: 'trend'; label: string; daily: DailyUsage[] };

interface ProviderShareCardOptions {
  providerId: string;
  providerNames?: Record<string, string>;
  plan: string | null;
  rows: ShareRow[];
  now: number;
}

interface TotalSpendShareCardOptions {
  projection: SpendProjection;
  providerNames?: Record<string, string>;
  metric: AppSettings['totalSpendMetric'];
  period: AppSettings['totalSpendPeriod'];
  now: number;
}

export function buildProviderShareRows(
  catalog: ProviderCatalogIndex,
  snapshot: ProviderSnapshot,
  layout: ProviderLayout,
  settings: AppSettings,
  now: number,
) {
  const alwaysVisible = layout.metrics.filter(
    (metric) => metric.enabled && metric.section === 'alwaysVisible',
  );
  const visible = layout.expanded
    ? [
        ...alwaysVisible,
        ...layout.metrics.filter((metric) => metric.enabled && metric.section === 'onDemand'),
      ]
    : alwaysVisible;
  const rows: ShareRow[] = [];
  let previousTextSection: ProviderLayout['metrics'][number]['section'] | null = null;

  for (const notice of snapshot.notices) {
    rows.push({ kind: 'text', label: notice.title, value: notice.message, condensed: false });
  }

  for (const metric of visible) {
    const definition = catalog.metric(metric.id);
    if (!definition) continue;
    const source = definition.source;
    if (source.kind === 'quota' || source.kind === 'quotaOrValue') {
      const quota = snapshot.quotas.find((item) => item.id === source.sourceId);
      if (quota) {
        rows.push(quotaShareRow(quota, settings, now, source.sessionWindow));
      } else if (source.kind === 'quotaOrValue') {
        const valueMetric = snapshot.valueMetrics.find((item) => item.id === source.sourceId);
        rows.push({
          kind: 'text',
          label: definition.label,
          value: valueMetric
            ? valueMetric.values
                .map((value) =>
                  formatMetricValue(value.number, value.kind, 'row', value.label ?? undefined),
                )
                .join(' · ')
            : 'No data',
          condensed: previousTextSection === metric.section,
        });
        previousTextSection = metric.section;
        continue;
      } else {
        rows.push({
          kind: 'quota',
          label: definition.label,
          reading: 'No data',
          trailing: 'Reset unavailable',
          fillPercent: 0,
          severity: 'normal',
          paceLabel: null,
        });
      }
      previousTextSection = null;
      continue;
    }
    if (source.kind === 'trend') {
      rows.push({ kind: 'trend', label: definition.label, daily: snapshot.usage.daily });
      previousTextSection = null;
      continue;
    }

    if (source.kind === 'status') {
      const statusMetric = snapshot.statusMetrics.find((item) => item.id === source.sourceId);
      rows.push({
        kind: 'text',
        label: definition.label,
        value: statusMetric?.text ?? 'No data',
        condensed: previousTextSection === metric.section,
      });
      previousTextSection = metric.section;
      continue;
    }

    if (source.kind === 'value') {
      const valueMetric = snapshot.valueMetrics.find((item) => item.id === source.sourceId);
      rows.push({
        kind: 'text',
        label: definition.label,
        value: valueMetric
          ? valueMetric.values
              .map((value) =>
                formatMetricValue(value.number, value.kind, 'row', value.label ?? undefined),
              )
              .join(' · ')
          : 'No data',
        condensed: previousTextSection === metric.section,
      });
      previousTextSection = metric.section;
      continue;
    }

    if (source.kind !== 'usage') continue;
    const period = usagePeriod(snapshot, source.period);
    rows.push({
      kind: 'text',
      label: definition.label,
      value: usageReading(period),
      condensed: previousTextSection === metric.section,
    });
    previousTextSection = metric.section;
  }
  return rows;
}

export function providerShareCardHeight(rows: ShareRow[], hasPlan = false) {
  const providerRowsHeight = RECEIPT_ROW_HEIGHT * (hasPlan ? 2 : 1);
  const contentHeight = rows.length
    ? rows.reduce((height, row) => height + shareRowHeight(row), 0)
    : RECEIPT_EMPTY_ROW_HEIGHT;
  return (
    RECEIPT_HEADER_HEIGHT +
    RECEIPT_BODY_PADDING_TOP +
    providerRowsHeight +
    RECEIPT_SEPARATOR_HEIGHT +
    contentHeight +
    RECEIPT_SEPARATOR_HEIGHT +
    RECEIPT_FOOTER_HEIGHT
  );
}

export function totalSpendShareCardHeight(providerCount = 0) {
  return (
    RECEIPT_HEADER_HEIGHT +
    RECEIPT_BODY_PADDING_TOP +
    RECEIPT_ROW_HEIGHT +
    RECEIPT_SEPARATOR_HEIGHT +
    Math.max(1, providerCount) * RECEIPT_ROW_HEIGHT +
    RECEIPT_SEPARATOR_HEIGHT +
    RECEIPT_ROW_HEIGHT +
    RECEIPT_FOOTER_HEIGHT
  );
}

export function renderProviderShareCard(
  catalog: ProviderCatalogIndex,
  options: ProviderShareCardOptions,
) {
  const height = providerShareCardHeight(options.rows, Boolean(options.plan));
  const { canvas, context } = createCanvas(SHARE_CARD_WIDTH, height);
  drawReceiptBase(context, SHARE_CARD_WIDTH, height, options.now);

  let rowTop = RECEIPT_HEADER_HEIGHT + RECEIPT_BODY_PADDING_TOP;
  drawReceiptLine(
    context,
    'Provider',
    catalog.displayName(options.providerId, options.providerNames),
    rowTop,
  );
  rowTop += RECEIPT_ROW_HEIGHT;
  if (options.plan) {
    drawReceiptLine(context, 'Plan', options.plan, rowTop);
    rowTop += RECEIPT_ROW_HEIGHT;
  }
  rowTop = drawReceiptSeparator(context, SHARE_CARD_WIDTH, rowTop);
  if (options.rows.length === 0) {
    drawReceiptLine(context, 'Usage', 'No data', rowTop);
    rowTop += RECEIPT_EMPTY_ROW_HEIGHT;
  } else {
    for (const row of options.rows) {
      drawReceiptShareRow(context, row, rowTop);
      rowTop += shareRowHeight(row);
    }
  }
  rowTop = drawReceiptSeparator(context, SHARE_CARD_WIDTH, rowTop);
  drawReceiptFooter(context, SHARE_CARD_WIDTH, rowTop);
  return canvas;
}

export function renderTotalSpendShareCard(
  catalog: ProviderCatalogIndex,
  options: TotalSpendShareCardOptions,
) {
  const height = totalSpendShareCardHeight(options.projection.slices.length);
  const width = SHARE_CARD_WIDTH;
  const { canvas, context } = createCanvas(width, height);
  drawReceiptBase(context, width, height, options.now);

  let rowTop = RECEIPT_HEADER_HEIGHT + RECEIPT_BODY_PADDING_TOP;
  drawReceiptLine(context, 'Period', receiptPeriodLabel(options.period), rowTop);
  rowTop += RECEIPT_ROW_HEIGHT;
  rowTop = drawReceiptSeparator(context, width, rowTop);

  if (options.projection.slices.length === 0) {
    drawReceiptLine(context, 'Providers', 'No data', rowTop);
    rowTop += RECEIPT_EMPTY_ROW_HEIGHT;
  } else {
    for (const slice of options.projection.slices) {
      drawReceiptLine(
        context,
        catalog.displayName(slice.id, options.providerNames),
        formatSpendValue(slice.value, options.metric, 'full'),
        rowTop,
        false,
        true,
      );
      rowTop += RECEIPT_ROW_HEIGHT;
    }
  }

  rowTop = drawReceiptSeparator(context, width, rowTop);
  drawReceiptLine(
    context,
    receiptMetricLabel(options.metric),
    options.projection.centerValue === null
      ? 'No data'
      : formatSpendValue(options.projection.centerValue, options.metric, 'full'),
    rowTop,
    true,
  );
  rowTop += RECEIPT_ROW_HEIGHT;
  drawReceiptFooter(context, width, rowTop);
  return canvas;
}

function quotaShareRow(
  quota: QuotaWindow,
  settings: AppSettings,
  now: number,
  sessionWindow: boolean,
): ShareRow {
  const used = clamp(quota.usedPercent, 0, 100);
  const remaining = Math.max(0, 100 - used);
  let reading = `${(settings.usageDisplay === 'used' ? used : remaining).toFixed(0)}% ${settings.usageDisplay}`;
  let fillPercent = settings.usageDisplay === 'used' ? used : remaining;
  if (quota.format === 'count' && quota.usedValue !== null && quota.limitValue !== null) {
    const displayed =
      settings.usageDisplay === 'left'
        ? Math.max(0, quota.limitValue - quota.usedValue)
        : quota.usedValue;
    reading = `${displayed.toFixed(0)} ${quota.unit?.trim() || 'requests'} ${settings.usageDisplay}`;
  }
  if (quota.format === 'dollars' && quota.usedValue !== null) {
    const displayed =
      settings.usageDisplay === 'left' && quota.limitValue !== null
        ? Math.max(0, quota.limitValue - quota.usedValue)
        : quota.usedValue;
    reading = `$${displayed.toFixed(2)} ${settings.usageDisplay === 'left' ? 'left' : 'spent'}`;
    if (quota.limitValue !== null && quota.limitValue > 0) {
      fillPercent = (displayed / quota.limitValue) * 100;
    }
  }

  const pace = projectPace(quota, now, sessionWindow);
  const severity =
    pace.severity === 'spent' || pace.severity === 'runningOut'
      ? 'critical'
      : pace.severity === 'close'
        ? 'warning'
        : used >= 90
          ? 'critical'
          : used >= 80
            ? 'warning'
            : 'normal';
  const paceLabel =
    pace.severity === 'spent'
      ? 'Limit reached'
      : pace.severity === 'runningOut'
        ? formatLimit(pace.runOutAt, now, settings.resetDisplay, settings.timeFormat)
        : pace.severity === 'close' && pace.projectedUsedPercent !== null
          ? `~${Math.max(1, Math.round(100 - pace.projectedUsedPercent))}% spare`
          : pace.severity === 'healthy' &&
              settings.alwaysShowPacing &&
              pace.projectedUsedPercent !== null
            ? `~${Math.max(0, Math.round(100 - pace.projectedUsedPercent))}% left at reset`
            : null;

  return {
    kind: 'quota',
    label: quota.label,
    reading,
    trailing: formatReset(quota.resetsAt, now, settings.resetDisplay, settings.timeFormat),
    fillPercent: clamp(fillPercent, 0, 100),
    severity,
    paceLabel,
  };
}

function usagePeriod(snapshot: ProviderSnapshot, sourceId: string) {
  if (sourceId === 'today') return snapshot.usage.today;
  if (sourceId === 'yesterday') return snapshot.usage.yesterday;
  return snapshot.usage.last30Days;
}

function usageReading(period: UsagePeriod | null) {
  if (!period) return 'No data';
  const tokens = formatMetricValue(period.tokens, 'count', 'row', 'tokens');
  if (period.estimatedCostUsd === null) return tokens;
  return `${formatMetricNumber(period.estimatedCostUsd, 'dollars', 'row')} · ${tokens}`;
}

function shareRowHeight(row: ShareRow) {
  return row.kind === 'quota' ? 42 : RECEIPT_ROW_HEIGHT;
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width * SHARE_CARD_SCALE;
  canvas.height = Math.ceil(height * SHARE_CARD_SCALE);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas unavailable');
  context.scale(SHARE_CARD_SCALE, SHARE_CARD_SCALE);
  context.textBaseline = 'alphabetic';
  return { canvas, context };
}

export function formatReceiptDate(now: number) {
  if (!Number.isFinite(now)) return 'DATE UNAVAILABLE';
  const date = new Date(now);
  if (!Number.isFinite(date.getTime())) return 'DATE UNAVAILABLE';
  const day = String(date.getDate()).padStart(2, '0');
  const month = RECEIPT_MONTHS[date.getMonth()];
  const year = String(date.getFullYear()).padStart(4, '0');
  return `${day} ${month} ${year}`;
}

function drawReceiptBase(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  now: number,
) {
  context.fillStyle = SHARE_RECEIPT_COLORS.paper;
  context.fillRect(0, 0, width, height);
  context.fillStyle = SHARE_RECEIPT_COLORS.header;
  context.fillRect(0, 0, width, RECEIPT_HEADER_HEIGHT);
  context.fillStyle = SHARE_RECEIPT_COLORS.signal;
  context.fillRect(0, RECEIPT_HEADER_HEIGHT - 6, width, 6);

  context.fillStyle = SHARE_RECEIPT_COLORS.headerInk;
  context.font = `600 28px ${UI_FONT}`;
  context.textAlign = 'left';
  context.fillText('Overcap', RECEIPT_HORIZONTAL_PADDING, 40);

  context.fillStyle = SHARE_RECEIPT_COLORS.headerInk;
  context.font = `500 10px ${FIGURE_FONT}`;
  context.textAlign = 'right';
  context.fillText(formatReceiptDate(now), width - RECEIPT_HORIZONTAL_PADDING, 37);
  context.textAlign = 'left';
}

function drawReceiptLine(
  context: CanvasRenderingContext2D,
  label: string,
  value: string,
  top: number,
  emphasis = false,
  preserveLabelCase = false,
) {
  const left = RECEIPT_HORIZONTAL_PADDING;
  const right = SHARE_CARD_WIDTH - RECEIPT_HORIZONTAL_PADDING;
  const baseline = top + 16;
  context.fillStyle = SHARE_RECEIPT_COLORS.ink;
  context.font = `${emphasis ? '600 13px' : '600 10px'} ${FIGURE_FONT}`;
  fitText(context, preserveLabelCase ? label : label.toUpperCase(), left, baseline, 145);

  context.font = `${emphasis ? '600 13px' : '400 11px'} ${FIGURE_FONT}`;
  context.textAlign = 'right';
  fitTextRight(context, value, right, baseline, 165);
  context.textAlign = 'left';
}

function drawReceiptShareRow(context: CanvasRenderingContext2D, row: ShareRow, top: number) {
  if (row.kind === 'quota') {
    drawReceiptLine(context, row.label, row.reading, top);
    const details = [row.trailing, row.paceLabel].filter(Boolean).join(' / ');
    context.fillStyle = SHARE_RECEIPT_COLORS.ink;
    context.font = `400 9px ${FIGURE_FONT}`;
    fitText(
      context,
      details.toUpperCase(),
      RECEIPT_HORIZONTAL_PADDING,
      top + 35,
      SHARE_CARD_WIDTH - RECEIPT_HORIZONTAL_PADDING * 2,
    );
    return;
  }
  if (row.kind === 'trend') {
    const tokens = row.daily.reduce(
      (total, sample) => total + (Number.isFinite(sample.tokens) ? Math.max(0, sample.tokens) : 0),
      0,
    );
    drawReceiptLine(
      context,
      row.label,
      row.daily.length ? formatMetricValue(tokens, 'count', 'full', 'tokens') : 'No data',
      top,
    );
    return;
  }
  drawReceiptLine(context, row.label, row.value, top);
}

function drawReceiptSeparator(context: CanvasRenderingContext2D, width: number, top: number) {
  const y = top + RECEIPT_SEPARATOR_HEIGHT / 2;
  context.save();
  context.beginPath();
  context.setLineDash([5, 4]);
  context.strokeStyle = SHARE_RECEIPT_COLORS.rule;
  context.lineWidth = 1;
  context.moveTo(RECEIPT_HORIZONTAL_PADDING, y);
  context.lineTo(width - RECEIPT_HORIZONTAL_PADDING, y);
  context.stroke();
  context.setLineDash([]);
  context.restore();
  return top + RECEIPT_SEPARATOR_HEIGHT;
}

function drawReceiptFooter(context: CanvasRenderingContext2D, width: number, top: number) {
  context.fillStyle = SHARE_RECEIPT_COLORS.muted;
  context.font = `500 10px ${FIGURE_FONT}`;
  context.textAlign = 'center';
  context.fillText('overcap.dev', width / 2, top + 25);
  context.textAlign = 'left';
}

function receiptPeriodLabel(period: AppSettings['totalSpendPeriod']) {
  const index = period === 'today' ? 0 : period === 'yesterday' ? 1 : 2;
  return TOTAL_SPEND_PERIOD_LABELS[index].toUpperCase();
}

function receiptMetricLabel(metric: AppSettings['totalSpendMetric']) {
  if (metric === 'tokens') return 'Total usage';
  if (metric === 'costPerMillion') return 'Cost / MTok';
  return 'Total spend';
}

export function providerIconPlacement(providerId: string, x: number, y: number, size: number) {
  const values = providerIconViewBox(providerId)
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const [minX, minY, width, height] = values;
  if (
    values.length !== 4 ||
    !values.every(Number.isFinite) ||
    width <= 0 ||
    height <= 0 ||
    !Number.isFinite(size) ||
    size <= 0
  ) {
    return { x, y, scale: size / 100 };
  }

  const scale = Math.min(size / width, size / height);
  return {
    x: x + (size - width * scale) / 2 - minX * scale,
    y: y + (size - height * scale) / 2 - minY * scale,
    scale,
  };
}

function fitText(
  context: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
) {
  context.fillText(ellipsize(context, value, maxWidth), x, y);
}

function fitTextRight(
  context: CanvasRenderingContext2D,
  value: string,
  right: number,
  y: number,
  maxWidth: number,
) {
  context.fillText(ellipsize(context, value, maxWidth), right, y);
}

function ellipsize(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  if (context.measureText(value).width <= maxWidth) return value;
  let result = value;
  while (result.length > 1 && context.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
