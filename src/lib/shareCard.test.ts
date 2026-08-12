import { afterEach, describe, expect, it, vi } from 'vitest';
import { codexState, providerCatalogIndex, settingsState } from '../test/appFixtures';
import { ProviderCatalogIndex } from './metrics';
import totalSpendSource from './TotalSpend.svelte?raw';
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
  TOTAL_SPEND_GEOMETRY,
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
  const drawn: Array<{ value: string; font: string; fillStyle: string; textAlign: string }> = [];
  const fills: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    fillStyle: string;
  }> = [];
  const context = {
    scale: vi.fn(),
    fillRect: (x: number, y: number, width: number, height: number) =>
      fills.push({ x, y, width, height, fillStyle: context.fillStyle }),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
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
      }),
    textAlign: 'left',
    textBaseline: 'alphabetic',
    fillStyle: '',
    strokeStyle: '',
    font: '',
    lineWidth: 1,
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
  return { context, drawn, fills };
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
    expect(formatReceiptDate(NOW)).toBe('18 JUL 2026');
    expect(formatReceiptDate(Number.NaN)).toBe('DATE UNAVAILABLE');
    expect(totalSpendShareCardHeight(3)).toBeGreaterThan(totalSpendShareCardHeight(1));
  });

  it('leaves the live Total Spend geometry source intact', () => {
    expect(TOTAL_SPEND_GEOMETRY).toMatchObject({
      width: 320,
      switcherHeight: 27,
      ringDiameter: 104,
      legendGap: 18,
    });
    expect(totalSpendSource).toContain("import { TOTAL_SPEND_GEOMETRY } from './shareCard';");
    expect(totalSpendSource).toContain('--total-switcher-height:');
    expect(totalSpendSource).toContain('--total-ring-size:');
    expect(totalSpendSource).toContain('ringSectorPath(segment, TOTAL_SPEND_GEOMETRY)');
  });

  it('renders provider cards as fixed-palette receipts with nicknames and usage rows', () => {
    const { context, drawn, fills } = installCanvasMock();
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
        'Overcap',
        '18 JUL 2026',
        'PROVIDER',
        'Work Codex',
        'PLAN',
        'Plus',
        'SESSION',
        '25% used',
        'TODAY',
        '$3.50 / 2,000 tokens',
        'overcap.dev',
      ]),
    );
    expect(drawn.find((entry) => entry.value === 'Overcap')?.font).toContain('Inter');
    expect(
      drawn
        .filter((entry) => entry.value !== 'Overcap')
        .every((entry) => entry.font.includes('JetBrains Mono')),
    ).toBe(true);
    expect(
      drawn.every((entry) =>
        (
          [
            SHARE_RECEIPT_COLORS.ink,
            SHARE_RECEIPT_COLORS.headerInk,
            SHARE_RECEIPT_COLORS.muted,
          ] as string[]
        ).includes(entry.fillStyle),
      ),
    ).toBe(true);
    expect(fills).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fillStyle: SHARE_RECEIPT_COLORS.paper }),
        expect.objectContaining({ fillStyle: SHARE_RECEIPT_COLORS.header }),
        expect.objectContaining({ fillStyle: SHARE_RECEIPT_COLORS.signal }),
      ]),
    );
    expect(context.setLineDash).toHaveBeenCalledWith([5, 4]);
  });

  it('renders Total Spend as provider rows and a receipt total without ring geometry', () => {
    const { context, drawn, fills } = installCanvasMock();

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
        'Overcap',
        '18 JUL 2026',
        'PERIOD',
        '30 DAYS',
        'Night Shift',
        '$12.00',
        'TOTAL SPEND',
        'overcap.dev',
      ]),
    );
    expect(context.arc).not.toHaveBeenCalled();
    expect(context.setLineDash).toHaveBeenCalledWith([5, 4]);
    expect(fills).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fillStyle: SHARE_RECEIPT_COLORS.paper }),
        expect.objectContaining({ fillStyle: SHARE_RECEIPT_COLORS.header }),
      ]),
    );
  });
});
