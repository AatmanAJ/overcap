import { afterEach, describe, expect, it, vi } from 'vitest';
import { codexState, providerCatalogIndex, settingsState } from '../test/appFixtures';
import { ProviderCatalogIndex } from './metrics';
import {
  buildProviderShareRows as buildProviderShareRowsWithCatalog,
  formatReceiptDate,
  providerIconPlacement,
  providerShareCardHeight,
  renderProviderShareCard,
  renderTotalSpendShareCard as renderTotalSpendShareCardWithCatalog,
  SHARE_CARD_SCALE,
  SHARE_CARD_WIDTH,
  SHARE_RECEIPT_COLORS,
  TOTAL_SPEND_PERIOD_LABELS,
  totalSpendShareCardHeight,
  type ShareRow,
} from './shareCard';
import type { AppSettings, ProviderLayout, ProviderSnapshot } from './types';

function buildProviderShareRows(
  _providerId: string,
  snapshot: ProviderSnapshot,
  layout: ProviderLayout,
  settings: AppSettings,
  now: number,
) {
  return buildProviderShareRowsWithCatalog(providerCatalogIndex, snapshot, layout, settings, now);
}

function renderTotalSpendShareCard(
  options: Parameters<typeof renderTotalSpendShareCardWithCatalog>[1],
) {
  return renderTotalSpendShareCardWithCatalog(providerCatalogIndex, options);
}

const NOW = new Date(2026, 6, 18, 12).getTime();

function installCanvasMock() {
  const drawn: Array<{
    value: string;
    font: string;
    fillStyle: string;
    textAlign: string;
    letterSpacing: string;
  }> = [];
  const fills: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    fillStyle: string;
  }> = [];
  const strokes: Array<{ strokeStyle: string; lineWidth: number }> = [];
  const context = {
    scale: vi.fn(),
    fillRect: (x: number, y: number, width: number, height: number) =>
      fills.push({ x, y, width, height, fillStyle: context.fillStyle }),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: () => strokes.push({ strokeStyle: context.strokeStyle, lineWidth: context.lineWidth }),
    save: vi.fn(),
    restore: vi.fn(),
    setLineDash: vi.fn(),
    arc: vi.fn(),
    measureText: (value: string) => ({ width: value.length * 6 }),
    fillText: (value: string) =>
      drawn.push({
        value,
        font: context.font,
        fillStyle: context.fillStyle,
        textAlign: context.textAlign,
        letterSpacing: context.letterSpacing,
      }),
    textAlign: 'left',
    textBaseline: 'alphabetic',
    fillStyle: '',
    strokeStyle: '',
    font: '',
    letterSpacing: '0px',
    lineWidth: 1,
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
  return { context, drawn, fills, strokes };
}

afterEach(() => vi.restoreAllMocks());

describe('share card layout', () => {
  it('uses the authored width and 4x export scale', () => {
    expect(SHARE_CARD_WIDTH).toBe(360);
    expect(SHARE_CARD_SCALE).toBe(4);
  });

  it('aspect-fits non-100 provider viewBoxes in exported headers', () => {
    expect(providerIconPlacement('codex', 16, 16, 22)).toEqual({
      x: 16,
      y: 16,
      scale: 0.22,
    });
    expect(providerIconPlacement('devin', 16, 16, 22)).toEqual({
      x: 17.32,
      y: 16,
      scale: 0.44,
    });
    const opencode = providerIconPlacement('opencode', 16, 16, 22);
    expect(opencode.x).toBeCloseTo(18.2);
    expect(opencode.y).toBe(16);
    expect(opencode.scale).toBeCloseTo(22 / 30);
  });

  it('exports only the provider rows visible on the dashboard', () => {
    const snapshot = codexState.snapshot!;
    const settings = settingsState.settings;
    const collapsed = settings.providers[0];
    const collapsedRows = buildProviderShareRows('codex', snapshot, collapsed, settings, NOW);

    expect(collapsedRows.map((row) => row.kind)).toEqual(['quota', 'quota', 'trend']);

    const expandedRows = buildProviderShareRows(
      'codex',
      snapshot,
      { ...collapsed, expanded: true },
      settings,
      NOW,
    );
    expect(expandedRows.map((row) => row.kind)).toEqual([
      'quota',
      'quota',
      'trend',
      'quota',
      'quota',
      'text',
      'text',
      'text',
      'text',
      'text',
    ]);
    expect(expandedRows.slice(-3)).toMatchObject([
      { condensed: true },
      { condensed: true },
      { condensed: true },
    ]);
  });

  it('does not encode unknown pricing as an approximation prefix', () => {
    const snapshot = structuredClone(codexState.snapshot!);
    snapshot.usage.today = {
      tokens: 500,
      estimatedCostUsd: 0.03,
      costEstimated: true,
      estimateComplete: false,
      unknownModels: ['future-unpriced-model'],
    };
    const rows = buildProviderShareRows(
      'codex',
      snapshot,
      { ...settingsState.settings.providers[0], expanded: true },
      settingsState.settings,
      NOW,
    );

    expect(rows.find((row) => row.kind === 'text' && row.label === 'Today')).toMatchObject({
      value: '$0.03 · 500 tokens',
    });
  });

  it('keeps provider notices in exported cards', () => {
    const snapshot = structuredClone(codexState.snapshot!);
    snapshot.notices = [
      {
        id: 'rateLimited',
        title: 'Live usage paused',
        message: 'Retrying in about 5 minutes',
        tone: 'warning',
      },
    ];
    const rows = buildProviderShareRows(
      'codex',
      snapshot,
      settingsState.settings.providers[0],
      settingsState.settings,
      NOW,
    );

    expect(rows[0]).toMatchObject({
      kind: 'text',
      label: 'Live usage paused',
      value: 'Retrying in about 5 minutes',
    });
  });

  it('keeps provider-supplied count units in exported quota rows', () => {
    const snapshot = structuredClone(codexState.snapshot!);
    snapshot.quotas[0] = {
      ...snapshot.quotas[0],
      format: 'count',
      usedPercent: 25,
      usedValue: 25,
      limitValue: 100,
      unit: 'searches',
    };

    const rows = buildProviderShareRows(
      'codex',
      snapshot,
      settingsState.settings.providers[0],
      settingsState.settings,
      NOW,
    );

    expect(rows[0]).toMatchObject({ kind: 'quota', reading: '75 searches left' });
  });

  it('exports customizable status metrics as text rows', () => {
    const catalog = new ProviderCatalogIndex({
      providers: [
        {
          id: 'grok',
          displayName: 'Grok',
          shortName: 'G',
          fallbackEnabled: false,
          localUsageSourceNote: null,
          links: [],
          metrics: [
            {
              id: 'grok.payAsYouGo',
              label: 'Extra Usage',
              source: { kind: 'status', sourceId: 'payAsYouGo' },
              pinnable: true,
              defaultEnabled: true,
              defaultSection: 'alwaysVisible',
              defaultPinned: true,
              tray: { shortLabel: 'E', suffix: null },
            },
          ],
        },
      ],
    });
    const snapshot: ProviderSnapshot = {
      providerId: 'grok',
      plan: null,
      quotas: [],
      valueMetrics: [],
      statusMetrics: [
        {
          id: 'payAsYouGo',
          label: 'Extra Usage',
          text: '2500 cap',
          tone: 'positive',
        },
      ],
      notices: [],
      usage: { today: null, yesterday: null, last30Days: null, daily: [], unknownModels: [] },
      warnings: [],
      refreshedAt: '2026-07-18T00:00:00Z',
    };
    const layout: ProviderLayout = {
      id: 'grok',
      enabled: true,
      detected: true,
      expanded: false,
      metrics: [
        {
          id: 'grok.payAsYouGo',
          enabled: true,
          section: 'alwaysVisible',
          pinned: true,
        },
      ],
    };

    expect(
      buildProviderShareRowsWithCatalog(catalog, snapshot, layout, settingsState.settings, NOW),
    ).toEqual([{ kind: 'text', label: 'Extra Usage', value: '2500 cap', condensed: false }]);
  });

  it('keeps always-visible rows ahead of expanded rows like the dashboard', () => {
    const snapshot = codexState.snapshot!;
    const settings = settingsState.settings;
    const layout = settings.providers[0];
    const metric = (id: string) => layout.metrics.find((item) => item.id === id)!;
    const interleaved = {
      ...layout,
      expanded: true,
      metrics: [
        metric('codex.today'),
        metric('codex.session'),
        metric('codex.yesterday'),
        metric('codex.weekly'),
      ],
    };

    const rows = buildProviderShareRows('codex', snapshot, interleaved, settings, NOW);
    expect(rows.map((row) => row.label)).toEqual(['Session', 'Weekly', 'Today', 'Yesterday']);
  });

  it('grows provider exports with content instead of enforcing a minimum canvas', () => {
    const settings = settingsState.settings;
    const layout = { ...settings.providers[0], expanded: true };
    const rows = buildProviderShareRows('codex', codexState.snapshot!, layout, settings, NOW);

    expect(providerShareCardHeight(rows)).toBeGreaterThan(
      providerShareCardHeight(rows.slice(0, 1)),
    );
    expect(providerShareCardHeight([])).toBeLessThan(providerShareCardHeight(rows));
  });

  it('uses deterministic receipt dates and content-driven Total Spend heights', () => {
    expect(TOTAL_SPEND_PERIOD_LABELS).toEqual(['Today', 'Yesterday', '30 Days']);
    expect(formatReceiptDate(NOW)).toBe('18 Jul 2026');
    expect(formatReceiptDate(Number.NaN)).toBe('Date unavailable');
    expect(totalSpendShareCardHeight(3)).toBeGreaterThan(totalSpendShareCardHeight(1));
  });

  it('renders provider cards as fixed-palette receipts with nicknames and usage rows', () => {
    const { context, drawn, fills, strokes } = installCanvasMock();
    const rows = [
      {
        kind: 'quota',
        label: 'Session',
        reading: '25% used',
        trailing: 'Resets in 2h',
        fillPercent: 25,
        severity: 'normal',
        paceLabel: 'On pace',
      },
      { kind: 'text', label: 'Today', value: '$3.50 / 2,000 tokens', condensed: false },
    ] satisfies ShareRow[];

    const canvas = renderProviderShareCard(providerCatalogIndex, {
      providerId: 'codex',
      providerNames: { codex: 'Work Codex' },
      plan: 'Plus',
      rows,
      now: NOW,
    });

    const text = drawn.map((entry) => entry.value);
    expect(canvas.width).toBe(SHARE_CARD_WIDTH * SHARE_CARD_SCALE);
    expect(canvas.height).toBe(providerShareCardHeight(rows, true) * SHARE_CARD_SCALE);
    expect(text).toEqual(
      expect.arrayContaining([
        'OVERCAP',
        '18 Jul 2026',
        'Provider',
        'Work Codex',
        'Plan',
        'Plus',
        'SESSION',
        '25% used',
        'Today',
        '$3.50 / 2,000 tokens',
        'overcap.dev',
      ]),
    );
    expect(drawn.every((entry) => entry.font.includes('Inter Variable'))).toBe(true);
    expect(drawn.every((entry) => !/[6-9]00 /.test(entry.font))).toBe(true);
    expect(drawn.find((entry) => entry.value === 'OVERCAP')).toMatchObject({
      font: expect.stringContaining('500 11px'),
      fillStyle: SHARE_RECEIPT_COLORS.muted,
      letterSpacing: '0.99px',
    });
    expect(drawn.find((entry) => entry.value === '25% used')).toMatchObject({
      font: expect.stringContaining('500 52px'),
      fillStyle: SHARE_RECEIPT_COLORS.ink,
      letterSpacing: '-2.08px',
    });
    expect(drawn.find((entry) => entry.value === 'overcap.dev')?.fillStyle).toBe(
      SHARE_RECEIPT_COLORS.muted,
    );
    expect(fills).toEqual([
      {
        x: 0,
        y: 0,
        width: SHARE_CARD_WIDTH,
        height: providerShareCardHeight(rows, true),
        fillStyle: SHARE_RECEIPT_COLORS.paper,
      },
      {
        x: 0,
        y: 56,
        width: SHARE_CARD_WIDTH,
        height: 8,
        fillStyle: SHARE_RECEIPT_COLORS.accent,
      },
    ]);
    expect(strokes).not.toHaveLength(0);
    expect(strokes.every((stroke) => stroke.lineWidth === 0.5)).toBe(true);
    expect(strokes.every((stroke) => stroke.strokeStyle === SHARE_RECEIPT_COLORS.rule)).toBe(true);
    expect(context.setLineDash).not.toHaveBeenCalled();
  });

  it('renders Total Spend as provider rows and a receipt total without ring geometry', () => {
    const { context, drawn, fills, strokes } = installCanvasMock();

    const canvas = renderTotalSpendShareCard({
      projection: {
        slices: [
          {
            id: 'codex',
            value: 12,
            period: {
              tokens: 1_000_000,
              estimatedCostUsd: 12,
              costEstimated: true,
              estimateComplete: true,
            },
          },
        ],
        centerValue: 12,
        costEstimated: true,
        estimateComplete: true,
      },
      providerNames: { codex: 'Night Shift' },
      metric: 'cost',
      period: 'last30Days',
      now: NOW,
    });

    const text = drawn.map((entry) => entry.value);
    expect(canvas.width).toBe(SHARE_CARD_WIDTH * SHARE_CARD_SCALE);
    expect(canvas.height).toBe(totalSpendShareCardHeight(1) * SHARE_CARD_SCALE);
    expect(text).toEqual(
      expect.arrayContaining([
        'OVERCAP',
        '18 Jul 2026',
        'Period',
        '30 Days',
        'Night Shift',
        '$12.00',
        'TOTAL SPEND',
        'overcap.dev',
      ]),
    );
    expect(context.arc).not.toHaveBeenCalled();
    expect(context.setLineDash).not.toHaveBeenCalled();
    expect(drawn.filter((entry) => entry.value === '$12.00')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ font: expect.stringContaining('400 12px') }),
        expect.objectContaining({ font: expect.stringContaining('500 52px') }),
      ]),
    );
    expect(fills.filter((fill) => fill.fillStyle === SHARE_RECEIPT_COLORS.accent)).toEqual([
      expect.objectContaining({ x: 0, y: 56, width: SHARE_CARD_WIDTH, height: 8 }),
    ]);
    expect(strokes.every((stroke) => stroke.lineWidth === 0.5)).toBe(true);
  });
});
