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

export type DemoTheme = 'dark' | 'light';

export type DemoBackendOptions = {
  defaultTheme?: DemoTheme;
};

export type RecorderShortcutAction = DemoTheme | 'reset' | null;

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

function buildSettings(defaultTheme: DemoTheme): SettingsViewState {
  const base = structuredClone(settingsState);
  const settings: AppSettings = {
    ...base.settings,
    providerNames: { codex: 'Studio' },
    knownProviderIds: [...DEMO_PROVIDER_IDS],
    theme: defaultTheme,
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

export function buildDemoBootstrap(
  now = Date.now(),
  defaultTheme: DemoTheme = 'dark',
): BootstrapState {
  return {
    usage: {
      providers: {
        codex: buildCodexState(now),
        claude: buildClaudeState(now),
      },
      lastFullRefreshAt: isoAt(now, -3 * 60_000),
    },
    settings: buildSettings(defaultTheme),
    catalog: structuredClone(providerCatalog),
  };
}

export function recorderShortcutAction(
  event: Pick<KeyboardEvent, 'altKey' | 'code' | 'ctrlKey' | 'key' | 'metaKey' | 'shiftKey'>,
): RecorderShortcutAction {
  if (!event.ctrlKey || !event.shiftKey || event.altKey || event.metaKey) return null;
  if (event.code === 'Digit0' || event.code === 'Numpad0' || event.key === '0') return 'reset';
  const key = event.key.toLowerCase();
  if (key === 'l') return 'light';
  if (key === 'd') return 'dark';
  return null;
}

export function installRecorderIndicator() {
  const existing = document.querySelector<HTMLElement>('[data-recorder-indicator]');
  if (existing) return existing;

  const indicator = document.createElement('div');
  indicator.dataset.recorderIndicator = '';
  indicator.setAttribute('role', 'status');
  indicator.setAttribute('aria-label', 'Recorder edition using demo data');
  indicator.textContent = 'Demo data';
  document.body.append(indicator);

  if (!document.querySelector('[data-recorder-indicator-style]')) {
    const style = document.createElement('style');
    style.dataset.recorderIndicatorStyle = '';
    style.textContent = `
      [data-recorder-indicator] {
        position: fixed;
        z-index: 10001;
        top: 8px;
        left: 8px;
        display: grid;
        height: 16px;
        padding: 0 8px;
        border: 1px solid color-mix(in srgb, #12161b 32%, transparent);
        border-radius: 999px;
        background: #f04b2f;
        color: #12161b;
        font: 600 9px/14px Inter, system-ui, sans-serif;
        letter-spacing: 0.04em;
        pointer-events: none;
        place-items: center;
      }
    `;
    document.head.append(style);
  }

  return indicator;
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

type DemoBackend = {
  demo: BootstrapState;
  invoke: DemoTauriInternals['invoke'];
};

type NativeInvoke = typeof import('@tauri-apps/api/core').invoke;

function createDemoBackend(options: DemoBackendOptions = {}): DemoBackend {
  const defaultTheme = options.defaultTheme ?? 'dark';
  const demo = buildDemoBootstrap(Date.now(), defaultTheme);
  let settingsRevision = demo.settings.accountRevision;
  let eventId = 0;

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
        demo.settings = buildSettings(defaultTheme);
        return structuredClone(demo.settings);
      case 'reset_provider_customization':
      case 'request_notification_permission':
        return structuredClone(demo.settings);
      case 'get_provider_api_key_state':
        return { providerId: args.providerId, status: 'notSet' };
      case 'save_provider_api_key':
      case 'delete_provider_api_key':
        return { providerId: args.providerId, status: 'notSet' };
      case 'claim_codex_reset_credit':
        return 'noCredit';
      case 'get_panel_resize_edge':
      case 'begin_panel_resize':
        return 'bottom';
      case 'get_panel_height_mode':
        return 'automatic';
      case 'fit_panel_to_content':
        return true;
      case 'set_panel_height_automatic':
      case 'set_panel_height_manual':
      case 'lock_panel_resize_axis':
      case 'open_external_link':
      case 'open_provider_link':
      case 'open_notification_settings':
      case 'open_log_folder':
      case 'open_update_page':
      case 'install_update':
        return null;
      case 'get_log_path':
        return 'Demo log';
      case 'dismiss_main_window':
      case 'quit_app':
        return null;
      case 'restart_app':
        return null;
      case 'check_for_updates':
        return {
          available: false,
          currentVersion: '0.1.2',
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
        throw new Error(`Recorder backend rejected command: ${command}`);
    }
  };

  return { demo, invoke };
}

let recorderBackend: DemoBackend | null = null;

export function recorderInvoke<T>(
  command: string,
  args: Record<string, unknown> = {},
  nativeInvoke?: NativeInvoke,
  options?: Parameters<NativeInvoke>[2],
): Promise<T> {
  const backend = recorderBackend;
  if (!backend) return Promise.reject(new Error('Overcap Recorder backend is not ready.'));
  if ((command === 'dismiss_main_window' || command === 'quit_app') && nativeInvoke) {
    return nativeInvoke<T>('recorder_close', {}, options);
  }
  if (command === 'restart_app') {
    window.location.reload();
    return Promise.resolve(undefined as T);
  }
  return backend.invoke(command, args) as Promise<T>;
}

export function installRecorderEdition(options: DemoBackendOptions = {}) {
  recorderBackend = createDemoBackend(options);
  document.documentElement.dataset.recorderEdition = '';
  installRecorderIndicator();
  window.addEventListener(
    'keydown',
    (event) => {
      const action = recorderShortcutAction(event);
      if (!action) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (action === 'reset') {
        window.location.reload();
        return;
      }
      if (recorderBackend) recorderBackend.demo.settings.settings.theme = action;
      document.documentElement.dataset.theme = action;
    },
    { capture: true },
  );
  installReceiptPreview();
}

export function installDemoBackend(options: DemoBackendOptions = {}) {
  const backend = createDemoBackend(options);
  let callbackId = 0;
  const callbacks = new Map<number, unknown>();

  const internals: DemoTauriInternals = {
    invoke: backend.invoke,
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
