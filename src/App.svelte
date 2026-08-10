<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import {
    beginPanelResize,
    dismissMainWindow,
    getBootstrapState,
    getLogPath,
    getPanelHeightMode,
    getPanelResizeEdge,
    lockPanelResizeAxis,
    onOpenScreen,
    onMainWindowHidden,
    onSettingsState,
    onUpdateProgress,
    onUsageState,
    openExternalLink as openExternalLinkCommand,
    openProviderLink as openProviderLinkCommand,
    openNotificationSettings as openSystemNotificationSettings,
    openLogFolder as openSystemLogFolder,
    quitApplication,
    refreshProviderUsage,
    refreshUsage,
    requestNotificationPermission,
    resetCustomization as resetCustomizationCommand,
    resetProviderCustomization as resetProviderCustomizationCommand,
    setPanelHeightAutomatic,
    setPanelHeightManual,
    type PanelHeightMode,
    type PanelResizeEdge,
  } from './lib/backend';
  import CustomizeProviderDetail from './lib/CustomizeProviderDetail.svelte';
  import CustomizeProviderList from './lib/CustomizeProviderList.svelte';
  import ConfirmationSheet from './lib/ConfirmationSheet.svelte';
  import { restoreCustomization } from './lib/customizationHistory';
  import Dashboard from './lib/Dashboard.svelte';
  import Icon from './lib/Icon.svelte';
  import { createListenerRegistry } from './lib/listenerRegistry';
  import { emptyProviderCatalog, ProviderCatalogIndex } from './lib/metrics';
  import { measuredMotion } from './lib/motion';
  import OvercapMark from './lib/OvercapMark.svelte';
  import { horizontalPageTransition, shouldSlideBetweenScreens } from './lib/pageTransition';
  import { desktopPlatform, shortcutLabels } from './lib/platform';
  import { withProviderName } from './lib/providerNames';
  import RenameProviderSheet from './lib/RenameProviderSheet.svelte';
  import {
    buildProviderShareRows,
    renderProviderShareCard,
    renderTotalSpendShareCard,
  } from './lib/shareCard';
  import SettingsScreen from './lib/SettingsScreen.svelte';
  import { SettingsController } from './lib/settingsController.svelte';
  import type { SpendProjection } from './lib/totalSpend';
  import type { AppSettings, UsageViewState } from './lib/types';
  import { nextUpdateLabel, UpdateController } from './lib/updateController.svelte';
  import { automaticUpdateDelay, UPDATE_CHECK_INTERVAL_MS } from './lib/updateSchedule';
  import { createWindowController, type AppScreen } from './lib/windowController';

  type Screen = AppScreen;
  const appVersion = import.meta.env.APP_VERSION;
  const emptyView: UsageViewState = { providers: {} };

  let viewState = $state<UsageViewState>(emptyView);
  let catalog = $state<ProviderCatalogIndex>(emptyProviderCatalog);
  let screen = $state<Screen>('dashboard');
  let now = $state(Date.now());
  let settingsError = $state<string | null>(null);
  let automaticUpdatesReady = $state(false);
  let reducedMotion = $state(false);
  let slideDirection = $state(1);
  let slidePageTransition = $state(true);
  let customizationHistory = $state<AppSettings[]>([]);
  let customizationGestureStart: AppSettings | null = null;
  let reordering = $state(false);
  let confirmationMessage = $state<string | null>(null);
  let resetConfirmationOpen = $state(false);
  let resettingCustomization = $state(false);
  let showAbout = $state(false);
  let shareMenuOpen = $state(false);
  let optionsMenuElement = $state<HTMLDetailsElement>();
  let shareMenuElement = $state<HTMLDetailsElement>();
  let shareTimer: ReturnType<typeof setTimeout> | undefined;
  const providerStates = $derived(Object.values(viewState.providers));
  const anyRefreshing = $derived(providerStates.some((state) => state.refreshing));
  const lastFullRefresh = $derived(viewState.lastFullRefreshAt ?? undefined);
  const platform = desktopPlatform();
  const shortcuts = shortcutLabels(platform);
  const settingsController = new SettingsController((message) => (settingsError = message));
  const settingsState = $derived(settingsController.state);
  const floatingWindow = $derived(
    !!settingsState &&
      (!settingsState.trayAvailable || settingsState.settings.windowMode === 'floating'),
  );
  const providerDisplayName = (id: string) =>
    catalog.displayName(id, settingsState?.settings.providerNames);
  const updates = new UpdateController();
  let resizeEdge = $state<PanelResizeEdge>(platform === 'windows' ? 'top' : 'bottom');
  const renderedResizeEdge = $derived(floatingWindow ? 'bottom' : resizeEdge);
  let panelHeightMode = $state<PanelHeightMode>('automatic');
  let panelHeightModeRequest = 0;
  let renameCard = $state<{ id: string; initialValue: string } | null>(null);
  let lastResizeGripPointerAt = Number.NEGATIVE_INFINITY;
  let panelResizeOperation: Promise<void> | null = null;
  const windowController = createWindowController({
    screen: () => screen,
    refreshing: () => anyRefreshing,
    reordering: () => reordering,
    automatic: () => panelHeightMode === 'automatic',
    reducedMotion: () => reducedMotion,
    onError: (message) => (settingsError = message),
  });

  $effect(() => {
    if (!settingsState) return;
    const root = document.documentElement;
    if (settingsState.settings.theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = settingsState.settings.theme;
    root.dataset.density = settingsState.settings.density;
  });

  $effect(() => {
    if (!automaticUpdatesReady || !settingsState?.settings.autoCheckUpdates) return;
    const delay = automaticUpdateDelay(settingsState.settings.lastUpdateCheckAt);
    let interval: ReturnType<typeof setInterval> | undefined;
    const timer = setTimeout(() => {
      void checkForUpdates();
      interval = setInterval(() => void checkForUpdates(), UPDATE_CHECK_INTERVAL_MS);
    }, delay);
    return () => {
      clearTimeout(timer);
      if (interval) clearInterval(interval);
    };
  });

  function scheduleWindowFit() {
    windowController.scheduleFit();
  }

  function beginContentMorph() {
    windowController.beginContentMorph();
  }

  function closeMainWindow() {
    resetTransientUi();
    navigate('dashboard');
    void dismissMainWindow();
  }
  function resetTransientUi() {
    closeOptionsMenu();
    showAbout = false;
    resetConfirmationOpen = false;
    renameCard = null;
    resettingCustomization = false;
    confirmationMessage = null;
    const content = document.querySelector<HTMLElement>('.content');
    if (content && typeof content.scrollTo === 'function') content.scrollTo({ top: 0 });
    else if (content) content.scrollTop = 0;
  }
  function quitApp() {
    void quitApplication();
  }
  function screenRank(value: Screen) {
    if (value.startsWith('provider:')) return 2;
    return value === 'dashboard' ? 0 : 1;
  }
  function navigate(next: Screen) {
    if (next === screen) return;
    slidePageTransition = shouldSlideBetweenScreens(screen, next);
    slideDirection = screenRank(next) >= screenRank(screen) ? 1 : -1;
    screen = next;
  }
  function back() {
    if (screen.startsWith('provider:')) navigate('customize');
    else if (screen !== 'dashboard') navigate('dashboard');
    else closeMainWindow();
  }
  function saveSettings(next: AppSettings) {
    settingsError = null;
    const windowModeChanged = settingsState?.settings.windowMode !== next.windowMode;
    if (windowModeChanged) beginContentMorph();
    const save = settingsController.save(next);
    if (windowModeChanged) void save.finally(updatePanelResizeEdge);
  }

  function toggleFloatingWindow() {
    const current = settingsState;
    if (!current?.trayAvailable) return;
    saveSettings({
      ...current.settings,
      windowMode: floatingWindow ? 'popup' : 'floating',
    });
  }

  function cloneSettings(value: AppSettings): AppSettings {
    return JSON.parse(JSON.stringify(value)) as AppSettings;
  }
  function showConfirmation(message: string) {
    confirmationMessage = message;
    if (shareTimer) clearTimeout(shareTimer);
    shareTimer = setTimeout(() => (confirmationMessage = null), 1800);
  }
  function saveCustomization(next: AppSettings) {
    const current = settingsState;
    if (!current) return;
    if (customizationGestureStart) {
      settingsController.setState({ ...current, settings: next });
      settingsError = null;
      return;
    }
    customizationHistory = [...customizationHistory.slice(-19), cloneSettings(current.settings)];
    saveSettings(next);
  }
  function openRenameProvider(providerId: string) {
    const current = settingsState;
    if (!current) return;
    renameCard = {
      id: providerId,
      initialValue: current.settings.providerNames[providerId] ?? '',
    };
  }
  async function closeRenameProvider() {
    const providerId = renameCard?.id;
    renameCard = null;
    if (!providerId) return;
    await tick();
    const provider = [...document.querySelectorAll<HTMLElement>('[data-provider-id]')].find(
      (element) => element.dataset.providerId === providerId,
    );
    provider?.querySelector<HTMLElement>('[data-reorder-touch-handle]')?.focus();
  }
  function renameProvider(name: string) {
    const current = settingsState;
    if (!current || !renameCard) return;
    const changed = withProviderName(current.settings, renameCard.id, name);
    if (changed !== current.settings) saveSettings(changed);
    void closeRenameProvider();
  }
  function beginCustomizationGesture() {
    if (!settingsState) return;
    customizationGestureStart ??= cloneSettings(settingsState.settings);
    reordering = true;
    scheduleWindowFit();
  }
  function endCustomizationGesture(moved: boolean, cancelled = false) {
    const current = settingsState;
    if (!current) return;
    const start = customizationGestureStart;
    const final = current.settings;
    customizationGestureStart = null;
    reordering = false;
    if (start && moved && cancelled) settingsController.setState({ ...current, settings: start });
    else if (start && moved) {
      customizationHistory = [...customizationHistory.slice(-19), start];
      saveSettings(final);
    }
    queueMicrotask(scheduleWindowFit);
  }
  function undoCustomization() {
    const current = settingsState;
    const previous = customizationHistory.at(-1);
    if (!current || !previous) return;
    customizationHistory = customizationHistory.slice(0, -1);
    saveSettings(restoreCustomization(current.settings, previous));
  }
  async function refresh() {
    if (anyRefreshing) return;
    viewState = {
      providers: Object.fromEntries(
        Object.entries(viewState.providers).map(([id, state]) => [
          id,
          { ...state, refreshing: true, error: null },
        ]),
      ),
    };
    try {
      viewState = await refreshUsage();
    } catch {
      viewState = {
        providers: Object.fromEntries(
          Object.entries(viewState.providers).map(([id, state]) => [
            id,
            { ...state, refreshing: false },
          ]),
        ),
      };
      settingsError = "Couldn't refresh providers. Retrying.";
    }
  }
  async function refreshProvider(providerId: string) {
    const current = viewState.providers[providerId];
    if (!current || current.refreshing) return;
    viewState = {
      providers: {
        ...viewState.providers,
        [providerId]: { ...current, refreshing: true, error: null },
      },
    };
    try {
      viewState = await refreshProviderUsage(providerId);
    } catch {
      const failed = viewState.providers[providerId];
      if (failed) {
        viewState = {
          providers: {
            ...viewState.providers,
            [providerId]: { ...failed, refreshing: false },
          },
        };
      }
      settingsError = `Couldn't reach ${providerDisplayName(providerId)}. Retrying.`;
    }
  }
  function openProviderLink(providerId: string, linkIndex: number) {
    void openProviderLinkCommand(providerId, linkIndex).catch(() => {});
  }
  function requestCustomizationReset() {
    resetConfirmationOpen = true;
  }
  async function confirmCustomizationReset() {
    const current = settingsState;
    if (!current || resettingCustomization) return;
    resettingCustomization = true;
    customizationHistory = [...customizationHistory.slice(-19), cloneSettings(current.settings)];
    try {
      settingsController.setState(await resetCustomizationCommand());
    } catch {
      settingsError = "Couldn't reset customisation.";
    } finally {
      resettingCustomization = false;
      resetConfirmationOpen = false;
    }
  }
  async function resetProviderCustomization(providerId: string) {
    const current = settingsState;
    if (!current) return;
    const provider = current.settings.providers.find((item) => item.id === providerId);
    if (!provider) return;
    customizationHistory = [...customizationHistory.slice(-19), cloneSettings(current.settings)];
    try {
      settingsController.setState(await resetProviderCustomizationCommand(providerId));
    } catch {
      settingsError = `Couldn't reset ${providerDisplayName(providerId)}.`;
    }
  }
  async function copyCanvas(canvas: HTMLCanvasElement, fallback: string) {
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) => (value ? resolve(value) : reject(new Error('PNG unavailable'))),
        'image/png',
      ),
    );
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    } else {
      await navigator.clipboard.writeText(fallback);
    }
    showConfirmation('Copied to clipboard');
  }
  async function shareProvider(providerId: string) {
    const current = settingsState;
    if (!current) return;
    const card = document.querySelector<HTMLElement>(`[data-provider-id="${providerId}"]`);
    if (!card) return;
    const provider = viewState.providers[providerId]?.snapshot;
    const layout = current.settings.providers.find((item) => item.id === providerId);
    if (!provider || !layout) return;
    const snapshot = [providerDisplayName(providerId), card.innerText.trim()].join('\n');
    try {
      const rows = buildProviderShareRows(catalog, provider, layout, current.settings, now);
      const canvas = renderProviderShareCard(catalog, {
        providerId,
        providerNames: current.settings.providerNames,
        plan: provider.plan,
        rows,
        now,
      });
      await copyCanvas(canvas, snapshot);
    } catch {
      settingsError = "Couldn't copy that receipt.";
    }
  }
  async function shareTotalSpend(projection: SpendProjection) {
    const current = settingsState;
    if (!current) return false;
    const card = document.querySelector<HTMLElement>('[data-total-spend]');
    if (!card) return false;
    try {
      const canvas = renderTotalSpendShareCard(catalog, {
        projection,
        providerNames: current.settings.providerNames,
        metric: current.settings.totalSpendMetric,
        period: current.settings.totalSpendPeriod,
        now,
      });
      await copyCanvas(canvas, card.innerText.trim());
      return true;
    } catch {
      settingsError = "Couldn't copy that receipt.";
      return false;
    }
  }
  async function copyLogPath() {
    const path = await getLogPath();
    await navigator.clipboard.writeText(path);
    showConfirmation('Log path copied');
  }
  async function openLogFolder() {
    await openSystemLogFolder();
  }
  function topBarTitle() {
    if (screen.startsWith('provider:')) return providerDisplayName(screen.slice(9));
    return screen === 'settings' ? 'Settings' : 'Customise';
  }
  function closeAboutFromBackdrop(event: MouseEvent) {
    if (event.target === event.currentTarget) showAbout = false;
  }
  function openAboutLink(event: MouseEvent) {
    event.preventDefault();
    const url = (event.currentTarget as HTMLAnchorElement).href;
    void openExternalLinkCommand(url).catch(() => {
      settingsError = "Couldn't open that link.";
    });
  }
  function ownsEnterKey(target: EventTarget | null) {
    if (!(target instanceof Element)) return false;
    return (
      target.closest(
        'button, a, input, select, textarea, summary, [contenteditable], [role="button"], [role="menuitem"], [role="option"], [role="combobox"]',
      ) !== null
    );
  }
  function handleOptionsKey(event: KeyboardEvent) {
    const menu = (event.currentTarget as HTMLElement).closest<HTMLDetailsElement>(
      'details.options-menu',
    );
    if (!menu) return;
    if (event.key !== 'Escape' || !menu.open) return;
    event.preventDefault();
    event.stopPropagation();
    closeOptionsMenu(true);
  }
  function closeOptionsMenu(restoreFocus = false) {
    if (shareMenuElement?.open) shareMenuElement.open = false;
    shareMenuOpen = false;
    if (!optionsMenuElement?.open) return;
    optionsMenuElement.open = false;
    if (restoreFocus) optionsMenuElement.querySelector<HTMLElement>('summary')?.focus();
  }
  function handleWindowPointerDown(event: PointerEvent) {
    if (
      event.target instanceof Element &&
      event.target.closest('.floating-chrome__drag') !== null
    ) {
      handleFloatingWindowPointerDown(event);
    }
    if (
      optionsMenuElement?.open &&
      event.target instanceof Node &&
      !optionsMenuElement.contains(event.target)
    ) {
      closeOptionsMenu();
    }
  }
  function updatePanelResizeEdge() {
    if (!('__TAURI_INTERNALS__' in window)) return;
    void getPanelResizeEdge()
      .then((edge) => (resizeEdge = edge))
      .catch(() => undefined);
  }
  function updatePanelHeightMode() {
    if (!('__TAURI_INTERNALS__' in window)) return;
    const request = ++panelHeightModeRequest;
    void getPanelHeightMode()
      .then((mode) => {
        if (request !== panelHeightModeRequest) return;
        panelHeightMode = mode;
        if (mode === 'automatic') scheduleWindowFit();
      })
      .catch(() => undefined);
  }
  function acceptPanelHeightMode(mode: PanelHeightMode) {
    panelHeightModeRequest += 1;
    panelHeightMode = mode;
  }
  function handlePanelResizePointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const pointerAt = event.timeStamp;
    const repeatedPress = event.detail > 1 || pointerAt - lastResizeGripPointerAt <= 400;
    lastResizeGripPointerAt = repeatedPress ? Number.NEGATIVE_INFINITY : pointerAt;
    if (repeatedPress) {
      const activeResize = panelResizeOperation;
      void (async () => {
        if (activeResize) await activeResize;
        await changePanelHeightMode('automatic');
      })();
      return;
    }
    const operation = (async () => {
      try {
        const edge = await beginPanelResize();
        resizeEdge = edge;
        // The native begin command has already persisted the current height as manual. Mirroring it
        // here stops any in-flight frontend auto-fit without waiting for the first resize event.
        acceptPanelHeightMode('manual');
        // TODO(macOS): Tao 0.35 reports native resize dragging as unsupported and Tauri currently
        // swallows that runtime error. Re-test after Tauri/Tao upgrades; add an AppKit fallback if
        // upstream support is still unavailable.
        await getCurrentWindow().startResizeDragging(edge === 'top' ? 'North' : 'South');
      } catch {
        settingsError = "Couldn't resize Overcap.";
      } finally {
        await lockPanelResizeAxis().catch(() => undefined);
        updatePanelHeightMode();
      }
    })();
    panelResizeOperation = operation;
    void operation.finally(() => {
      if (panelResizeOperation === operation) panelResizeOperation = null;
    });
  }
  function handleFloatingWindowPointerDown(event: PointerEvent) {
    if (event.button !== 0 || !('__TAURI_INTERNALS__' in window)) return;
    event.preventDefault();
    void getCurrentWindow()
      .startDragging()
      .catch(() => (settingsError = "Couldn't move Overcap."));
  }
  async function changePanelHeightMode(mode: PanelHeightMode) {
    if (!('__TAURI_INTERNALS__' in window)) return;
    panelHeightModeRequest += 1;
    try {
      if (mode === 'automatic') await setPanelHeightAutomatic();
      else await setPanelHeightManual();
      acceptPanelHeightMode(mode);
      if (mode === 'automatic') scheduleWindowFit();
    } catch {
      settingsError = "Couldn't change panel height.";
      updatePanelHeightMode();
    }
  }
  async function requestNotifications() {
    const current = settingsState;
    if (!current) return;
    try {
      const currentSettings = current.settings;
      const permissionState = await requestNotificationPermission();
      settingsController.setState({ ...permissionState, settings: currentSettings });
    } catch {
      settingsError = "Couldn't request notification access.";
    }
  }
  async function openNotificationSettings() {
    try {
      await openSystemNotificationSettings();
    } catch {
      settingsError = "Couldn't open notification settings.";
    }
  }
  async function checkForUpdates(manual = false) {
    if (!settingsState) return;
    await updates.check(
      manual,
      (checkedAt) => {
        if (!settingsState) return;
        saveSettings({ ...settingsState.settings, lastUpdateCheckAt: checkedAt });
      },
      showConfirmation,
    );
  }

  onMount(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => {
      reducedMotion = motionQuery.matches;
      document.documentElement.toggleAttribute('data-reduced-motion', reducedMotion);
      scheduleWindowFit();
    };
    updateMotionPreference();
    motionQuery.addEventListener('change', updateMotionPreference);
    const refreshWindowState = () => {
      void settingsController.refreshIfIdle();
      updatePanelResizeEdge();
      updatePanelHeightMode();
      scheduleWindowFit();
    };
    updatePanelResizeEdge();
    updatePanelHeightMode();
    window.addEventListener('focus', refreshWindowState);

    const popover = document.querySelector<HTMLElement>('.popover');
    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleWindowFit);
    const observePanelParts = () => {
      resizeObserver?.disconnect();
      document
        .querySelectorAll<HTMLElement>(
          '.floating-chrome, .screen-page, .screen-header, .footer, .notice',
        )
        .forEach((element) => resizeObserver?.observe(element));
      scheduleWindowFit();
    };
    const mutationObserver = new MutationObserver(observePanelParts);
    if (popover) {
      mutationObserver.observe(popover, { childList: true, subtree: true, characterData: true });
    }
    observePanelParts();
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        if (showAbout) {
          showAbout = false;
          return;
        }
        back();
      } else if (event.key === 'Enter' && screen === 'dashboard' && !ownsEnterKey(event.target)) {
        event.preventDefault();
        navigate('customize');
      } else if ((event.ctrlKey || event.metaKey) && event.key === ',') {
        event.preventDefault();
        navigate(screen === 'settings' ? 'dashboard' : 'settings');
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'r') {
        event.preventDefault();
        void refresh();
      } else if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 'z' &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement)
      ) {
        event.preventDefault();
        undoCustomization();
      } else if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 'q' &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement)
      ) {
        event.preventDefault();
        quitApp();
      }
    };
    document.addEventListener('keydown', handleKeydown);
    const clock = window.setInterval(() => (now = Date.now()), 30_000);
    const listeners = createListenerRegistry(() => {
      settingsError ??= 'Overcap lost its event bridge.';
    });
    listeners.add(onUsageState((state) => (viewState = state)));
    listeners.add(
      onSettingsState((state) => {
        settingsController.acceptExternalState(state);
      }),
    );
    listeners.add(
      onOpenScreen((target) => navigate(target === 'settings' ? 'settings' : 'customize')),
    );
    listeners.add(
      onMainWindowHidden(() => {
        resetTransientUi();
        navigate('dashboard');
      }),
    );
    listeners.add(
      onUpdateProgress((progress) => {
        updates.setProgress(progress);
      }),
    );
    void getBootstrapState()
      .then((state) => {
        catalog = new ProviderCatalogIndex(state.catalog);
        viewState = state.usage;
        settingsController.setState(state.settings);
        automaticUpdatesReady = true;
      })
      .catch(() => (settingsError = "Couldn't reach the Overcap backend."));
    return () => {
      document.removeEventListener('keydown', handleKeydown);
      window.clearInterval(clock);
      windowController.dispose();
      motionQuery.removeEventListener('change', updateMotionPreference);
      window.removeEventListener('focus', refreshWindowState);
      document.documentElement.removeAttribute('data-reduced-motion');
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
      listeners.dispose();
    };
  });
</script>

<svelte:head><meta name="color-scheme" content="light dark" /></svelte:head>
<svelte:window onpointerdown={handleWindowPointerDown} />

<main
  class="popover"
  class:popover--floating={floatingWindow}
  class:popover--macos={floatingWindow && platform === 'macos'}
  aria-label="Overcap usage dashboard"
  oncontextmenu={(event) => event.preventDefault()}
>
  <p id="reorder-instructions" class="sr-only">
    Drag to reorder. With a keyboard, use Alt plus Up Arrow or Alt plus Down Arrow.
  </p>
  {#if renderedResizeEdge === 'top'}
    <div
      class="panel-resize-dragger panel-resize-dragger--top"
      role="separator"
      aria-label="Resize panel height"
      aria-orientation="horizontal"
      onpointerdown={handlePanelResizePointerDown}
    ></div>
  {/if}
  {#if floatingWindow}
    <header class="floating-chrome" aria-label="Overcap window controls">
      <div class="floating-chrome__drag">
        <OvercapMark size={16} />
        <span>Overcap</span>
      </div>
      <button
        class="floating-chrome__close"
        type="button"
        aria-label={settingsState?.trayAvailable ? 'Hide Overcap' : 'Close Overcap'}
        onclick={closeMainWindow}
      >
        <Icon name="close" size={12} strokeWidth={2.1} />
      </button>
    </header>
  {/if}
  {#if settingsState}
    {#if screen !== 'dashboard'}
      <header class="screen-header app-top-bar">
        <button type="button" onclick={back} aria-label="Back" data-tooltip="Back">
          <Icon name="back" size={16} strokeWidth={2.2} />
        </button>
        <h1>{topBarTitle()}</h1>
        {#if screen === 'customize'}
          <button
            class="text-button"
            type="button"
            onclick={requestCustomizationReset}
            aria-label="Reset all customisation"
            data-tooltip="Reset all customisation"
            ><Icon name="reset" size={16} strokeWidth={2} /></button
          >
        {:else if screen.startsWith('provider:')}
          <button
            class="text-button"
            type="button"
            onclick={() => resetProviderCustomization(screen.slice(9))}
            aria-label={`Reset ${topBarTitle()}`}
            data-tooltip={`Reset ${topBarTitle()}`}
            ><Icon name="reset" size={16} strokeWidth={2} /></button
          >
        {:else}
          <span></span>
        {/if}
      </header>
    {/if}
    <div class="content" class:content--chrome={screen !== 'dashboard'}>
      {#if settingsError}<div class="notice notice--blocking" role="alert">
          {settingsError}
        </div>{/if}
      <div class="screen-stage">
        {#key screen}
          <div
            class="screen-page"
            data-screen={screen}
            in:horizontalPageTransition={{
              direction: slideDirection,
              ...measuredMotion(reducedMotion || !slidePageTransition),
            }}
            out:horizontalPageTransition={{
              direction: -slideDirection,
              ...measuredMotion(reducedMotion || !slidePageTransition),
            }}
          >
            {#if screen === 'dashboard'}
              <Dashboard
                {viewState}
                {catalog}
                settings={settingsState.settings}
                {now}
                onSettingsChange={saveSettings}
                onCustomizationChange={saveCustomization}
                onReorderStart={beginCustomizationGesture}
                onReorderEnd={endCustomizationGesture}
                onCustomize={() => navigate('customize')}
                onOpenProviderCustomize={(id) => navigate(`provider:${id}`)}
                onRenameProvider={openRenameProvider}
                onShare={shareProvider}
                onShareTotal={shareTotalSpend}
                onRefresh={refreshProvider}
                onOpenProviderLink={openProviderLink}
                onContentMorph={beginContentMorph}
                {reducedMotion}
                updateStatus={updates.status}
                installingUpdate={updates.installing}
                updateProgress={updates.progress}
                updateError={updates.error}
                onInstallUpdate={() => updates.install()}
                onOpenUpdatePage={() => updates.openDownloadPage()}
              />
            {:else if screen === 'settings'}
              <SettingsScreen
                settingsView={settingsState}
                {platform}
                {panelHeightMode}
                onChange={saveSettings}
                onPanelHeightModeChange={(mode) => void changePanelHeightMode(mode)}
                onRequestNotifications={requestNotifications}
                onOpenNotificationSettings={openNotificationSettings}
                updateError={updates.error}
                checkingUpdate={updates.checking}
                onCheckForUpdates={() => void checkForUpdates(true)}
                onCustomize={() => navigate('customize')}
                onAbout={() => (showAbout = true)}
                onCopyLogPath={copyLogPath}
                onOpenLogFolder={openLogFolder}
              />
            {:else if screen === 'customize'}
              <CustomizeProviderList
                settings={settingsState.settings}
                {catalog}
                onOpen={(id) => navigate(`provider:${id}`)}
                onChange={saveCustomization}
                onReorderStart={beginCustomizationGesture}
                onReorderEnd={endCustomizationGesture}
                onSettings={() => navigate('settings')}
                {reducedMotion}
              />
            {:else if screen.startsWith('provider:')}
              <CustomizeProviderDetail
                settings={settingsState.settings}
                providerId={screen.slice(9)}
                {catalog}
                onChange={saveCustomization}
                onNameChange={saveSettings}
                onReorderStart={beginCustomizationGesture}
                onReorderEnd={endCustomizationGesture}
                {reducedMotion}
              />
            {/if}
          </div>
        {/key}
      </div>
    </div>

    {#if screen === 'dashboard' || screen === 'settings'}
      <footer class="footer">
        <button
          class="identity"
          type="button"
          onclick={refresh}
          disabled={anyRefreshing}
          aria-label="Refresh all provider usage"
        >
          <span>Overcap {appVersion}</span><small
            >{anyRefreshing ? 'Updating…' : nextUpdateLabel(lastFullRefresh, now)}</small
          >
        </button>
        {#if screen === 'dashboard'}
          <div class="footer-actions">
            {#if settingsState.trayAvailable}
              <button
                class="window-mode-toggle"
                class:window-mode-toggle--active={floatingWindow}
                type="button"
                aria-label={floatingWindow ? 'Return to Tray Popup' : 'Keep Window Open'}
                aria-pressed={floatingWindow}
                data-tooltip={floatingWindow ? 'Return to Tray Popup' : 'Keep Window Open'}
                onclick={toggleFloatingWindow}
              >
                <Icon name={floatingWindow ? 'pin-filled' : 'pin'} size={16} strokeWidth={2} />
              </button>
            {/if}
            <details class="options-menu" bind:this={optionsMenuElement}>
              <summary aria-label="Open options" onkeydown={handleOptionsKey}
                ><span>Options</span><Icon
                  name="chevron-down"
                  size={12}
                  strokeWidth={2.2}
                /></summary
              >
              <div
                class="options-menu__panel"
                role="menu"
                aria-label="Options menu"
                tabindex="-1"
                onkeydown={handleOptionsKey}
                onclick={(event) => {
                  if (event.target instanceof Element && event.target.closest('button')) {
                    closeOptionsMenu();
                  }
                }}
              >
                <button
                  class="menu-item"
                  type="button"
                  aria-label="Customise"
                  onclick={() => navigate('customize')}
                  ><Icon name="sliders" /><span>Customise</span><kbd>↩</kbd></button
                >
                <button
                  class="menu-item"
                  type="button"
                  aria-label="Settings"
                  onclick={() => navigate('settings')}
                  ><Icon name="gear" /><span>Settings</span><kbd>{shortcuts.settings}</kbd></button
                >
                <hr />
                <details
                  bind:this={shareMenuElement}
                  class="share-menu"
                  ontoggle={(event) => (shareMenuOpen = event.currentTarget.open)}
                >
                  <summary
                    ><span class="share-menu__direction"
                      ><Icon name="chevron-left" size={12} /></span
                    ><span>Share receipt</span></summary
                  >
                  <div>
                    {#if shareMenuOpen}
                      {#each settingsState.settings.providers.filter((provider) => provider.enabled && catalog.provider(provider.id)) as provider (provider.id)}
                        <button type="button" onclick={() => shareProvider(provider.id)}
                          >{providerDisplayName(provider.id)}</button
                        >
                      {/each}
                    {/if}
                  </div>
                </details>
                <button class="menu-item" type="button" onclick={() => void checkForUpdates(true)}
                  ><Icon name="refresh" /><span>Check for updates…</span></button
                >
                <hr />
                <button class="menu-item" type="button" onclick={() => (showAbout = true)}
                  ><Icon name="about" /><span>About Overcap</span></button
                >
                <button
                  class="menu-item menu-item--danger"
                  type="button"
                  aria-label="Quit Overcap"
                  onclick={quitApp}
                  ><Icon name="power" /><span>Quit Overcap</span><kbd>{shortcuts.quit}</kbd></button
                >
              </div>
            </details>
          </div>
        {/if}
      </footer>
    {/if}

    {#if confirmationMessage}
      <div class="transient-pill" role="status">
        <Icon name="check" size={16} strokeWidth={2} />{confirmationMessage}
      </div>
    {/if}

    {#if resetConfirmationOpen}
      <ConfirmationSheet
        title="Reset all customisation?"
        message="This turns installed providers back on and restores every provider's metric visibility and order."
        confirmLabel="Reset all"
        pending={resettingCustomization}
        onConfirm={() => void confirmCustomizationReset()}
        onCancel={() => (resetConfirmationOpen = false)}
      />
    {/if}

    {#if renameCard}
      <RenameProviderSheet
        initialValue={renameCard.initialValue}
        onRename={renameProvider}
        onCancel={() => void closeRenameProvider()}
      />
    {/if}

    {#if showAbout}
      <div class="about-backdrop" role="presentation" onclick={closeAboutFromBackdrop}>
        <div
          class="about-card"
          role="dialog"
          tabindex="-1"
          aria-modal="true"
          aria-label="About Overcap"
        >
          <button
            class="about-card__close"
            type="button"
            aria-label="Close About"
            onclick={() => (showAbout = false)}
            ><Icon name="close" size={12} strokeWidth={2} /></button
          >
          <OvercapMark size={44} />
          <h1>Overcap by AIWITHAJ</h1>
          <p class="about-card__version">Version {appVersion}</p>
          <a
            class="about-card__credit"
            href="https://github.com/deviffyy/OpenQuota"
            onclick={openAboutLink}>Started life as OpenQuota by deviffyy</a
          >
          <nav class="about-card__links" aria-label="Overcap links">
            <a href="https://overcap.dev" onclick={openAboutLink}>overcap.dev</a>
            <a href="https://aiwithaj.dev" onclick={openAboutLink}>aiwithaj.dev</a>
          </nav>
        </div>
      </div>
    {/if}
  {:else}
    <div class="content">
      {#if settingsError}
        <div class="notice notice--blocking" role="alert">{settingsError}</div>
      {:else}
        <p class="empty-row">Loading Overcap…</p>
      {/if}
    </div>
  {/if}
  {#if renderedResizeEdge === 'bottom'}
    <div
      class="panel-resize-dragger panel-resize-dragger--bottom"
      role="separator"
      aria-label="Resize panel height"
      aria-orientation="horizontal"
      onpointerdown={handlePanelResizePointerDown}
    ></div>
  {/if}
</main>

<style>
  :global {
    .popover {
      position: relative;
      display: flex;
      width: 100%;
      height: 100%;
      min-width: 0;
      flex-direction: column;
      overflow: hidden;
      color: var(--body);
      background: var(--paper);
      border-radius: 16px;
      isolation: isolate;
      user-select: none;
    }

    .floating-chrome {
      position: relative;
      z-index: 32;
      display: grid;
      width: 100%;
      height: 32px;
      flex: 0 0 32px;
      grid-template-columns: 32px 1fr 32px;
      align-items: center;
      border-bottom: 0.5px solid var(--rule);
    }

    .floating-chrome__drag {
      display: flex;
      height: 100%;
      grid-row: 1;
      grid-column: 1 / -1;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--muted);
      cursor: grab;
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.09em;
      touch-action: none;
    }

    .floating-chrome__drag:active {
      cursor: grabbing;
    }

    .floating-chrome__drag > * {
      pointer-events: none;
    }

    .floating-chrome__close {
      position: relative;
      z-index: 1;
      display: grid;
      width: 24px;
      height: 24px;
      grid-row: 1;
      grid-column: 3;
      justify-self: center;
      padding: 0;
      border: 0;
      color: var(--muted);
      cursor: default;
      place-items: center;
    }

    .popover--macos .floating-chrome__close {
      grid-column: 1;
    }

    .panel-resize-dragger {
      position: relative;
      z-index: 20;
      display: grid;
      width: 100%;
      height: 8px;
      flex: 0 0 8px;
      cursor: ns-resize;
      touch-action: none;
      place-items: center;
    }

    .panel-resize-dragger::after {
      width: 32px;
      border-top: 0.5px solid var(--rule);
      content: '';
    }

    .content {
      flex: 1;
      min-height: 0;
      padding: 20px;
      overflow-x: hidden;
      overflow-y: auto;
      scrollbar-width: none;
    }

    .content::-webkit-scrollbar {
      width: 0;
      height: 0;
    }

    .screen-stage {
      display: grid;
      width: 100%;
      min-width: 0;
      min-height: 0;
      overflow: clip;
    }

    .screen-page {
      width: 100%;
      min-width: 0;
      min-height: 0;
      grid-area: 1 / 1;
      align-self: start;
    }

    .footer {
      display: flex;
      min-height: 48px;
      align-items: center;
      gap: 12px;
      padding: 8px 20px;
      border-top: 0.5px solid var(--rule);
    }

    .identity {
      display: flex;
      flex-direction: column;
      padding: 0;
      border: 0;
      color: var(--muted);
      font-size: 11px;
      font-weight: 400;
      line-height: 16px;
      text-align: left;
      cursor: pointer;
      font-variant-numeric: tabular-nums lining-nums;
    }

    .identity small {
      color: inherit;
      font: inherit;
    }

    .identity:disabled {
      cursor: default;
    }

    .footer-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: auto;
    }

    .window-mode-toggle,
    .options-menu > summary {
      display: grid;
      width: 28px;
      height: 28px;
      padding: 0;
      border: 0;
      color: var(--ink);
      cursor: pointer;
      list-style: none;
      place-items: center;
    }

    .options-menu,
    .share-menu {
      position: relative;
    }

    .options-menu > summary::-webkit-details-marker,
    .share-menu > summary::-webkit-details-marker {
      display: none;
    }

    .options-menu__panel,
    .options-menu > div,
    .share-menu > div {
      position: absolute;
      right: 0;
      bottom: 36px;
      z-index: 40;
      width: 176px;
      padding: 8px 0;
      border-top: 0.5px solid var(--rule);
      border-bottom: 0.5px solid var(--rule);
    }

    .options-menu .menu-item,
    .share-menu > summary,
    .share-menu button {
      display: flex;
      width: 100%;
      min-height: 32px;
      align-items: center;
      gap: 8px;
      padding: 8px 0;
      border: 0;
      color: var(--ink);
      font-size: 12px;
      font-weight: 400;
      text-align: left;
    }

    .options-menu .menu-item span,
    .share-menu > summary span {
      flex: 1;
    }

    .options-menu kbd {
      color: var(--muted);
      font: inherit;
      font-variant-numeric: tabular-nums lining-nums;
    }

    .options-menu .menu-item--danger {
      color: var(--critical);
    }

    .share-menu > div {
      right: calc(100% + 4px);
      bottom: 0;
      width: 144px;
    }

    .share-menu__direction {
      display: grid;
      width: 16px;
      flex: 0 0 16px;
      place-items: center;
    }

    .screen-header {
      display: grid;
      min-height: 40px;
      grid-template-columns: 40px 1fr 40px;
      align-items: center;
      margin: 0 0 24px;
      border-bottom: 0.5px solid var(--rule);
    }

    .app-top-bar {
      width: 100%;
      min-height: 40px;
      flex: 0 0 40px;
      margin: 0;
      padding: 0 20px;
    }

    .screen-header h1 {
      margin: 0;
      color: var(--ink);
      font-size: 13px;
      font-weight: 500;
      text-align: center;
    }

    .screen-header button {
      display: grid;
      width: 28px;
      height: 28px;
      padding: 0;
      border: 0;
      color: var(--ink);
      cursor: pointer;
      place-items: center;
    }

    .screen-header .text-button {
      justify-self: end;
    }

    .transient-pill {
      position: absolute;
      right: 20px;
      bottom: 64px;
      z-index: 80;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 0;
      border-top: 0.5px solid var(--rule);
      border-bottom: 0.5px solid var(--rule);
      color: var(--body);
      font-size: 11px;
      font-variant-numeric: tabular-nums lining-nums;
    }

    .about-backdrop {
      position: absolute;
      z-index: 100;
      display: grid;
      border: 0;
      inset: 0;
      place-items: center;
    }

    .about-card {
      position: relative;
      display: flex;
      width: 240px;
      align-items: center;
      padding: 24px 20px;
      border-top: 0.5px solid var(--rule);
      border-bottom: 0.5px solid var(--rule);
      color: var(--body);
      flex-direction: column;
    }

    .about-card h1 {
      margin: 12px 0 4px;
      color: var(--ink);
      font-size: 13px;
      font-weight: 500;
    }

    .about-card p,
    .about-card__credit,
    .about-card__links {
      color: var(--muted);
      font-size: 11px;
      font-weight: 400;
      line-height: 16px;
      font-variant-numeric: tabular-nums lining-nums;
    }

    .about-card p {
      margin: 0;
    }

    .about-card__credit {
      margin-top: 16px;
      color: var(--ink);
      text-align: center;
      text-decoration: underline;
      text-underline-offset: 4px;
    }

    .about-card__links {
      display: flex;
      gap: 16px;
      margin-top: 12px;
    }

    .about-card__links a {
      color: var(--muted);
      text-decoration: none;
    }

    .about-card__close {
      position: absolute;
      top: 8px;
      right: 8px;
      display: grid;
      width: 24px;
      height: 24px;
      padding: 0;
      border: 0;
      color: var(--ink);
      cursor: pointer;
      place-items: center;
    }

    .notice--blocking {
      color: var(--critical);
    }
  }
</style>
