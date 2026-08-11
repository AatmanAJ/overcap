import { claudeState, codexState, providerCatalog, settingsState } from '../test/appFixtures';
import type {
  AppSettings,
  BootstrapState,
  DailyUsage,
  MetricDefinition,
  ProviderLayout,
  ProviderViewState,
  SettingsViewState,
  UsagePeriod,
} from '../lib/types';

type DemoClipboardItem = {
  getType: (type: string) => Promise<Blob>;
  types: string[];
};

type DemoTauriInternals = {
  invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
  metadata: {
    currentWindow: { label: string };
    currentWebview: { label: string; windowLabel: string };
  };
  transformCallback: (callback: unknown, once?: boolean) => number;
  unregisterCallback: (id: number) => void;
};

const DEMO_PROVIDER_IDS = ['codex', 'claude', 'openrouter', 'antigravity'];

function isoAt(now: number, offsetMs: number) {
  return new Date(now + offsetMs).toISOString();
}

function dayAt(now: number, offset: number) {
  const date = new Date(now);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function dailyHistory(now: number, tokenMillions: number[], costs: number[]): DailyUsage[] {
  return tokenMillions.map((tokens, index) => ({
    date: dayAt(now, index - tokenMillions.length + 1),
    tokens: Math.round(tokens * 1_000_000),
    estimatedCostUsd: costs[index] ?? null,
    estimateComplete: true,
  }));
}

function usagePeriod(daily: DailyUsage[], indices: number[]): UsagePeriod {
  const days = indices.map((index) => daily.at(index)).filter((day) => day !== undefined);
  return {
    tokens: days.reduce((total, day) => total + day.tokens, 0),
    estimatedCostUsd: days.reduce((total, day) => total + (day.estimatedCostUsd ?? 0), 0),
    costEstimated: true,
    estimateComplete: true,
  };
}

function metricLayout(metric: MetricDefinition, alwaysVisible: ReadonlySet<string>) {
  return {
    id: metric.id,
    enabled: true,
    section: alwaysVisible.has(metric.id) ? ('alwaysVisible' as const) : ('onDemand' as const),
    pinned: metric.defaultPinned,
  };
}

function providerLayout(
  providerId: string,
  enabled: boolean,
  alwaysVisible: readonly string[],
): ProviderLayout {
  const definition = providerCatalog.providers.find((provider) => provider.id === providerId);
  if (!definition) throw new Error(`Missing demo provider definition: ${providerId}`);
  const visible = new Set(alwaysVisible);
  return {
    id: providerId,
    enabled,
    detected: enabled,
    expanded: false,
    metrics: definition.metrics.map((metric) => metricLayout(metric, visible)),
  };
}

function buildCodexState(now: number): ProviderViewState {
  const state = structuredClone(codexState);
  if (!state.snapshot) return state;
  const daily = dailyHistory(
    now,
    [0.72, 1.04, 0.93, 1.48, 1.31, 1.77, 2.08],
    [1.36, 1.95, 1.74, 2.78, 2.46, 3.32, 3.91],
  );
  state.snapshot.refreshedAt = isoAt(now, -3 * 60_000);
  state.snapshot.quotas = [
    {
      id: 'session',
      label: 'Session',
      usedPercent: 76,
      resetsAt: isoAt(now, 75 * 60_000),
      periodSeconds: 5 * 60 * 60,
      format: 'percent',
      usedValue: null,
      limitValue: null,
      estimated: false,
    },
    {
      id: 'weekly',
      label: 'Weekly',
      usedPercent: 64,
      resetsAt: isoAt(now, 2 * 24 * 60 * 60_000),
      periodSeconds: 7 * 24 * 60 * 60,
      format: 'percent',
      usedValue: null,
      limitValue: null,
      estimated: false,
    },
  ];
  state.snapshot.usage = {
    today: usagePeriod(daily, [-1]),
    yesterday: usagePeriod(daily, [-2]),
    last30Days: usagePeriod(daily, [0, 1, 2, 3, 4, 5, 6]),
    daily,
    unknownModels: [],
  };
  return state;
}

function buildClaudeState(now: number): ProviderViewState {
  const state = structuredClone(claudeState);
  if (!state.snapshot) return state;
  const daily = dailyHistory(
    now,
    [0.44, 0.62, 0.51, 0.88, 0.71, 1.06, 0.92],
    [0.82, 1.16, 0.95, 1.64, 1.33, 1.98, 1.72],
  );
  state.snapshot.refreshedAt = isoAt(now, -4 * 60_000);
  state.snapshot.quotas = [
    {
      id: 'session',
      label: 'Session',
      usedPercent: 43,
      resetsAt: isoAt(now, 3 * 60 * 60_000),
      periodSeconds: 5 * 60 * 60,
      format: 'percent',
      usedValue: null,
      limitValue: null,
      estimated: false,
    },
    {
      id: 'weekly',
      label: 'Weekly',
      usedPercent: 51,
      resetsAt: isoAt(now, 4 * 24 * 60 * 60_000),
      periodSeconds: 7 * 24 * 60 * 60,
      format: 'percent',
      usedValue: null,
      limitValue: null,
      estimated: false,
    },
    {
      id: 'extra',
      label: 'Extra Usage',
      usedPercent: 32,
      resetsAt: isoAt(now, 19 * 24 * 60 * 60_000),
      periodSeconds: 30 * 24 * 60 * 60,
      format: 'dollars',
      usedValue: 16,
      limitValue: 50,
      estimated: false,
    },
  ];
  state.snapshot.usage = {
    today: usagePeriod(daily, [-1]),
    yesterday: usagePeriod(daily, [-2]),
    last30Days: usagePeriod(daily, [0, 1, 2, 3, 4, 5, 6]),
    daily,
    unknownModels: [],
  };
  return state;
}

function buildSettings(): SettingsViewState {
  const base = structuredClone(settingsState);
  const settings: AppSettings = {
    ...base.settings,
    providerNames: { codex: 'Studio' },
    knownProviderIds: [...DEMO_PROVIDER_IDS],
    theme: 'dark',
    windowMode: 'floating',
    autoCheckUpdates: false,
    notifications: { almostOut: true, cuttingItClose: true, willRunOut: true },
    providerNotificationThresholds: {
      codex: { warning: 78, critical: 92, capped: 100 },
    },
    providers: [
      providerLayout('codex', true, [
        'codex.session',
        'codex.weekly',
        'codex.trend',
        'codex.today',
      ]),
      providerLayout('claude', true, [
        'claude.session',
        'claude.weekly',
        'claude.trend',
        'claude.today',
      ]),
      providerLayout('openrouter', false, ['openrouter.credits', 'openrouter.balance']),
      providerLayout('antigravity', false, ['antigravity.geminiPro', 'antigravity.geminiWeekly']),
    ],
  };
  return {
    ...base,
    notificationPermission: 'granted',
    trayAvailable: false,
    renamableProviderIds: ['codex', 'claude'],
    settings,
  };
}

function buildBootstrap(now = Date.now()): BootstrapState {
  return {
    usage: {
      providers: {
        codex: buildCodexState(now),
        claude: buildClaudeState(now),
      },
      lastFullRefreshAt: isoAt(now, -3 * 60_000),
    },
    settings: buildSettings(),
    catalog: structuredClone(providerCatalog),
  };
}

function installReceiptPreview() {
  class ClipboardItemMock implements DemoClipboardItem {
    readonly types: string[];

    constructor(private readonly values: Record<string, Blob>) {
      this.types = Object.keys(values);
    }

    async getType(type: string) {
      const blob = this.values[type];
      if (!blob) throw new Error(`Clipboard type unavailable: ${type}`);
      return blob;
    }
  }

  async function showReceipt(items: DemoClipboardItem[]) {
    const item = items.find((candidate) => candidate.types.includes('image/png'));
    if (!item) return;
    const blob = await item.getType('image/png');
    const existing = document.querySelector('[data-demo-receipt]');
    existing?.remove();
    const backdrop = document.createElement('div');
    backdrop.dataset.demoReceipt = '';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-label', 'Share receipt preview');
    const image = document.createElement('img');
    image.alt = 'Overcap share receipt preview';
    image.src = URL.createObjectURL(blob);
    backdrop.append(image);
    backdrop.addEventListener('click', () => backdrop.remove());
    document.body.append(backdrop);
  }

  Object.defineProperty(globalThis, 'ClipboardItem', {
    configurable: true,
    value: ClipboardItemMock,
  });
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      write: (items: DemoClipboardItem[]) => showReceipt(items),
      writeText: async () => undefined,
    },
  });

  const style = document.createElement('style');
  style.textContent = `
    [data-demo-receipt] {
      position: fixed;
      z-index: 10000;
      display: grid;
      padding: 24px;
      background: rgba(20, 20, 20, 0.92);
      cursor: pointer;
      inset: 0;
      place-items: center;
    }

    [data-demo-receipt] img {
      display: block;
      width: min(280px, calc(100vw - 48px));
      max-height: calc(100vh - 48px);
      object-fit: contain;
    }
  `;
  document.head.append(style);
}

export function installDemoBackend() {
  const demo = buildBootstrap();
  let settingsRevision = demo.settings.accountRevision;
  let callbackId = 0;
  let eventId = 0;
  const callbacks = new Map<number, unknown>();

  const invoke: DemoTauriInternals['invoke'] = async (command, args = {}) => {
    switch (command) {
      case 'get_bootstrap_state':
        return structuredClone(demo);
      case 'get_usage_state':
      case 'refresh_usage':
      case 'refresh_provider_usage':
        demo.usage.lastFullRefreshAt = new Date().toISOString();
        return structuredClone(demo.usage);
      case 'get_app_settings':
        return structuredClone(demo.settings);
      case 'save_app_settings': {
        const settings = args.settings as AppSettings | undefined;
        if (settings) {
          settingsRevision += 1;
          demo.settings = {
            ...demo.settings,
            accountRevision: settingsRevision,
            settings: JSON.parse(JSON.stringify(settings)) as AppSettings,
          };
        }
        return structuredClone(demo.settings);
      }
      case 'reset_customization':
        demo.settings = buildSettings();
        return structuredClone(demo.settings);
      case 'reset_provider_customization':
      case 'request_notification_permission':
        return structuredClone(demo.settings);
      case 'get_provider_api_key_state':
        return { providerId: args.providerId, status: 'notSet' };
      case 'get_panel_resize_edge':
        return 'bottom';
      case 'get_panel_height_mode':
        return 'automatic';
      case 'fit_panel_to_content':
        return true;
      case 'get_log_path':
        return 'Demo log';
      case 'check_for_updates':
        return {
          available: false,
          currentVersion: '0.1.0',
          version: null,
          body: null,
          installable: false,
          releaseUrl: 'https://github.com/AJ-Base44/overcap/releases/latest',
        };
      case 'plugin:event|listen':
        eventId += 1;
        return eventId;
      case 'plugin:window|current_monitor':
        return null;
      case 'plugin:window|scale_factor':
        return 1;
      case 'plugin:window|inner_size':
        return { width: window.innerWidth, height: window.innerHeight };
      default:
        return null;
    }
  };

  const internals: DemoTauriInternals = {
    invoke,
    metadata: {
      currentWindow: { label: 'main' },
      currentWebview: { label: 'main', windowLabel: 'main' },
    },
    transformCallback(callback) {
      callbackId += 1;
      callbacks.set(callbackId, callback);
      return callbackId;
    },
    unregisterCallback(id) {
      callbacks.delete(id);
    },
  };

  Object.defineProperty(window, '__TAURI_INTERNALS__', {
    configurable: true,
    value: internals,
  });
  Object.defineProperty(window, '__TAURI_EVENT_PLUGIN_INTERNALS__', {
    configurable: true,
    value: { unregisterListener: () => undefined },
  });
  installReceiptPreview();
}
