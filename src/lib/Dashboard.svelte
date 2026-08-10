<script lang="ts">
  import { onDestroy } from 'svelte';
  import { flip } from 'svelte/animate';
  import { measuredMotion, measuredReveal } from './motion';
  import { pointerReorder } from './pointerReorder';
  import ProviderIcon from './ProviderIcon.svelte';
  import ProviderLinks from './ProviderLinks.svelte';
  import ProviderNoticeRow from './ProviderNoticeRow.svelte';
  import ProviderSparkline from './ProviderSparkline.svelte';
  import Icon from './Icon.svelte';
  import HeroGauge from './HeroGauge.svelte';
  import MetricRenderer from './MetricRenderer.svelte';
  import TotalSpend from './TotalSpend.svelte';
  import type { SpendProjection } from './totalSpend';
  import type { ProviderCatalogIndex } from './metrics';
  import { paceProjectionLine } from './pacing';
  import { selectHeroGaugeMetric } from './heroGauge';
  import type {
    AppSettings,
    MetricLayout,
    ProviderLayout,
    ProviderSnapshot,
    ProviderViewState,
    UpdateProgress,
    UpdateFailure,
    UsageHistory,
    UsageViewState,
    UpdateStatus,
  } from './types';

  interface Props {
    viewState: UsageViewState;
    settings: AppSettings;
    now: number;
    catalog: ProviderCatalogIndex;
    onSettingsChange: (settings: AppSettings) => void;
    onCustomizationChange: (settings: AppSettings) => void;
    onReorderStart: () => void;
    onReorderEnd: (moved: boolean, cancelled?: boolean) => void;
    onCustomize: () => void;
    onOpenProviderCustomize: (providerId: string) => void;
    onRenameProvider: (providerId: string) => void;
    onShare: (providerId: string) => void;
    onShareTotal: (projection: SpendProjection) => boolean | Promise<boolean>;
    onRefresh: (providerId: string) => void;
    onOpenProviderLink: (providerId: string, linkIndex: number) => void;
    onContentMorph: () => void;
    reducedMotion: boolean;
    updateStatus: UpdateStatus | null;
    installingUpdate: boolean;
    updateProgress: UpdateProgress | null;
    updateError: UpdateFailure | null;
    onInstallUpdate: () => void;
    onOpenUpdatePage: () => void;
  }
  let {
    viewState,
    settings,
    now,
    catalog,
    onSettingsChange,
    onCustomizationChange,
    onReorderStart,
    onReorderEnd,
    onCustomize,
    onOpenProviderCustomize,
    onRenameProvider,
    onShare,
    onShareTotal,
    onRefresh,
    onOpenProviderLink,
    onContentMorph,
    reducedMotion,
    updateStatus,
    installingUpdate,
    updateProgress,
    updateError,
    onInstallUpdate,
    onOpenUpdatePage,
  }: Props = $props();
  const metricDefinition = (id: string) => catalog.metric(id);
  const providerDisplayName = (id: string) => catalog.displayName(id, settings.providerNames);
  const providerSupportsSpend = (id: string) => catalog.supportsSpend(id);
  const emptyUsage: UsageHistory = {
    today: null,
    yesterday: null,
    last30Days: null,
    daily: [],
    unknownModels: [],
  };
  function emptyProviderSnapshot(providerId: string): ProviderSnapshot {
    return {
      providerId,
      plan: null,
      quotas: [],
      valueMetrics: [],
      statusMetrics: [],
      notices: [],
      usage: emptyUsage,
      warnings: [],
      refreshedAt: '1970-01-01T00:00:00.000Z',
    };
  }
  let providerMenu = $state<{ id: string; x: number; y: number } | null>(null);
  let metricMenu = $state<{ providerId: string; metricId: string; x: number; y: number } | null>(
    null,
  );
  let demandMorphing = $state(false);
  let demandMorphTimer: ReturnType<typeof setTimeout> | undefined;
  const enabledProviders = $derived(
    settings.providers.filter((provider) => provider.enabled && catalog.provider(provider.id)),
  );
  const dashboardProviders = $derived(
    enabledProviders.map((provider) => {
      const state = viewState.providers[provider.id];
      return {
        provider,
        state,
        snapshot: state?.snapshot ?? emptyProviderSnapshot(provider.id),
        alwaysMetrics: provider.metrics.filter(
          (metric) => metric.enabled && metric.section === 'alwaysVisible',
        ),
        demandMetrics: provider.metrics.filter(
          (metric) => metric.enabled && metric.section === 'onDemand',
        ),
        links: catalog.provider(provider.id)?.links ?? [],
      };
    }),
  );
  const providerUsage = $derived(
    enabledProviders
      .filter((provider) => providerSupportsSpend(provider.id))
      .map((provider) => ({
        id: provider.id,
        usage: viewState.providers[provider.id]?.snapshot?.usage ?? emptyUsage,
      })),
  );
  const heroSelection = $derived(
    selectHeroGaugeMetric(
      settings.providers.flatMap((provider) => {
        if (!provider.enabled) return [];
        const snapshot = viewState.providers[provider.id]?.snapshot;
        if (!snapshot) return [];
        return [
          {
            providerId: provider.id,
            providerName: providerDisplayName(provider.id),
            snapshot,
            metricDefinitions: catalog.provider(provider.id)?.metrics ?? [],
          },
        ];
      }),
      now,
    ),
  );
  const heroProjectionText = $derived(
    heroSelection ? paceProjectionLine(heroSelection.pace, now) : null,
  );

  function updateProvider(next: ProviderLayout, customization = true) {
    const changed = {
      ...settings,
      providers: settings.providers.map((item) => (item.id === next.id ? next : item)),
    };
    (customization ? onCustomizationChange : onSettingsChange)(changed);
  }
  function toggleDemandMetrics(provider: ProviderLayout) {
    window.clearTimeout(demandMorphTimer);
    demandMorphing = !reducedMotion;
    if (demandMorphing) {
      demandMorphTimer = window.setTimeout(
        () => (demandMorphing = false),
        measuredMotion(false).duration + 32,
      );
    }
    onContentMorph();
    updateProvider({ ...provider, expanded: !provider.expanded }, false);
  }
  onDestroy(() => window.clearTimeout(demandMorphTimer));
  function reorderProvider(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    const enabled = settings.providers.filter((provider) => provider.enabled);
    const from = enabled.findIndex((provider) => provider.id === draggedId);
    const to = enabled.findIndex((provider) => provider.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = enabled.splice(from, 1);
    enabled.splice(to, 0, moved);
    const providers = [...enabled, ...settings.providers.filter((provider) => !provider.enabled)];
    onCustomizationChange({ ...settings, providers });
  }
  function reorderMetric(
    draggedMetricId: string,
    providerId: string,
    targetMetricId: string,
    targetSection: MetricLayout['section'],
  ) {
    const provider = settings.providers.find((item) => item.id === providerId);
    if (!provider || draggedMetricId === targetMetricId) return;
    const metrics = [...provider.metrics];
    const from = metrics.findIndex((metric) => metric.id === draggedMetricId);
    const to = metrics.findIndex((metric) => metric.id === targetMetricId);
    if (from < 0 || to < 0) return;
    const [source] = metrics.splice(from, 1);
    const moved = { ...source, section: targetSection };
    metrics.splice(to, 0, moved);
    updateProvider({ ...provider, metrics });
  }
  function reorderMetricToTarget(
    draggedMetricId: string,
    providerId: string,
    targetMetricId: string,
  ) {
    if (targetMetricId === 'section:onDemand') {
      moveMetricIntoSection(draggedMetricId, providerId, 'onDemand');
      return;
    }
    const target = settings.providers
      .find((provider) => provider.id === providerId)
      ?.metrics.find((metric) => metric.id === targetMetricId);
    if (target) reorderMetric(draggedMetricId, providerId, targetMetricId, target.section);
  }
  function moveMetricIntoSection(
    draggedMetricId: string,
    providerId: string,
    section: MetricLayout['section'],
  ) {
    const provider = settings.providers.find((item) => item.id === providerId);
    if (!provider) return;
    const metrics = [...provider.metrics];
    const from = metrics.findIndex((metric) => metric.id === draggedMetricId);
    if (from < 0) return;
    const [source] = metrics.splice(from, 1);
    const lastInSection = metrics.reduce(
      (last, metric, index) => (metric.section === section ? index : last),
      -1,
    );
    const insertAt =
      lastInSection >= 0 ? lastInSection + 1 : section === 'alwaysVisible' ? 0 : metrics.length;
    metrics.splice(insertAt, 0, { ...source, section });
    updateProvider({ ...provider, metrics });
  }
  function openProviderMenu(event: MouseEvent, providerId: string) {
    event.preventDefault();
    metricMenu = null;
    const focusFirstItem = event.button !== 2;
    const menuHeight = 204;
    providerMenu = {
      id: providerId,
      x: Math.max(6, Math.min(event.clientX, window.innerWidth - 196)),
      y: Math.max(6, Math.min(event.clientY, window.innerHeight - menuHeight)),
    };
    queueMicrotask(() => focusContextMenu(focusFirstItem));
  }
  function openMetricMenu(event: MouseEvent, providerId: string, metricId: string) {
    event.preventDefault();
    event.stopPropagation();
    providerMenu = null;
    const focusFirstItem = event.button !== 2;
    metricMenu = {
      providerId,
      metricId,
      x: Math.max(4, Math.min(event.clientX, window.innerWidth - 192)),
      y: Math.max(4, Math.min(event.clientY, window.innerHeight - 152)),
    };
    queueMicrotask(() => focusContextMenu(focusFirstItem));
  }
  function focusContextMenu(focusFirstItem: boolean) {
    const menu = document.querySelector<HTMLElement>('.context-menu');
    if (focusFirstItem) menu?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    else menu?.focus({ preventScroll: true });
  }
  function handleContextMenuKey(event: KeyboardEvent) {
    const menu = event.currentTarget as HTMLElement;
    const items = [...menu.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      providerMenu = null;
      metricMenu = null;
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || items.length === 0) return;
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : event.key === 'ArrowDown'
            ? current < 0
              ? 0
              : (current + 1) % items.length
            : current < 0
              ? items.length - 1
              : (current - 1 + items.length) % items.length;
    items[next].focus();
  }
  function patchMetric(providerId: string, metricId: string, patch: Partial<MetricLayout>) {
    const provider = settings.providers.find((item) => item.id === providerId);
    if (!provider) return;
    updateProvider({
      ...provider,
      metrics: provider.metrics.map((metric) =>
        metric.id === metricId ? { ...metric, ...patch } : metric,
      ),
    });
    metricMenu = null;
  }
  function hideProvider(providerId: string) {
    const provider = settings.providers.find((item) => item.id === providerId);
    if (provider) updateProvider({ ...provider, enabled: false });
    providerMenu = null;
  }
  function dismissDetection() {
    onSettingsChange({ ...settings, detectionNoticeDismissed: true });
  }
  function stalenessTooltip(refreshedAt: string) {
    const elapsedSeconds = Math.max(0, Math.floor((now - Date.parse(refreshedAt)) / 1000));
    if (!Number.isFinite(elapsedSeconds)) return 'Last update time unavailable';
    if (elapsedSeconds < 60) return 'Last updated moments ago';
    const minutes = Math.floor(elapsedSeconds / 60);
    if (minutes < 60) return `Last updated ${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `Last updated ${hours}h${remainingMinutes ? ` ${remainingMinutes}m` : ''} ago`;
  }
  function providerErrorPresentation(
    error: string,
    kind: ProviderViewState['errorKind'],
    displayName: string,
  ) {
    if (kind !== 'network') return { message: error, detail: null };
    return {
      message: `Couldn't reach ${displayName}. Retrying.`,
      detail: error,
    };
  }
</script>

<svelte:window
  onclick={() => {
    providerMenu = null;
    metricMenu = null;
  }}
/>

{#if heroSelection}
  <HeroGauge selection={heroSelection} {reducedMotion} projectionText={heroProjectionText} />
{/if}

{#if updateStatus?.available && updateStatus.version !== settings.dismissedUpdateVersion}
  <section class="hint-card update-banner" aria-label="New build ready">
    <span class="hint-card__icon"><Icon name="refresh" size={16} strokeWidth={2} /></span>
    <div>
      <strong>New build ready.</strong>
      <span>Restart to switch.</span>
      {#if updateStatus.body}<details class="update-notes">
          <summary>What’s new</summary>
          <p>{updateStatus.body}</p>
        </details>{/if}
      {#if installingUpdate && updateProgress}
        <div
          class="update-progress"
          role="progressbar"
          aria-label="Update download"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={updateProgress.phase === 'installing'
            ? 100
            : (updateProgress.percent ?? undefined)}
        >
          <span
            style:width={`${updateProgress.phase === 'installing' ? 100 : (updateProgress.percent ?? 8)}%`}
          ></span>
        </div>
        <small>
          {updateProgress.phase === 'installing'
            ? 'Installing update…'
            : updateProgress.phase === 'retrying'
              ? 'Download interrupted. Retrying…'
              : updateProgress.percent === null
                ? 'Downloading update…'
                : `Downloading update… ${updateProgress.percent}%`}
        </small>
      {/if}
      {#if updateError}<div class="update-error" role="alert">
          <strong>{updateError.message}</strong><small>{updateError.action}</small>
        </div>{/if}
    </div>
    <div class="update-actions">
      <button
        type="button"
        class="update-primary-action"
        data-cta="primary"
        onclick={updateStatus.installable ? onInstallUpdate : onOpenUpdatePage}
        disabled={installingUpdate}
        >{updateStatus.installable
          ? installingUpdate
            ? 'Updating…'
            : updateError?.retryable
              ? 'Try again'
              : 'Install update'
          : 'Download from GitHub'}</button
      >
      {#if updateStatus.installable && !installingUpdate}
        <button type="button" class="update-release-action" onclick={onOpenUpdatePage}
          >View release</button
        >
      {/if}
    </div>
    <button
      class="hint-card__dismiss"
      type="button"
      aria-label="Dismiss"
      onclick={() =>
        onSettingsChange({
          ...settings,
          dismissedUpdateVersion: updateStatus?.version ?? null,
        })}><Icon name="close" size={12} strokeWidth={2} /></button
    >
  </section>
{/if}

{#if !settings.detectionNoticeDismissed}
  <section class="detection-card" out:measuredReveal={{ reducedMotion }}>
    <div>
      <strong>Welcome to Overcap</strong><span
        >We set you up with the AI tools found on your computer. Add or hide providers any time.</span
      >
    </div>
    <button
      type="button"
      class:pill-cta={!(
        updateStatus?.available && updateStatus.version !== settings.dismissedUpdateVersion
      )}
      onclick={onCustomize}>Open customise</button
    >
    <button class="dismiss" type="button" aria-label="Dismiss" onclick={dismissDetection}
      ><Icon name="close" size={12} strokeWidth={2} /></button
    >
  </section>
{/if}

{#if settings.showTotalSpend && providerUsage.length > 0}
  <TotalSpend
    providers={providerUsage}
    {now}
    {settings}
    {catalog}
    onChange={onSettingsChange}
    onShare={onShareTotal}
  />
{/if}

{#each dashboardProviders as { provider, state, snapshot, alwaysMetrics, demandMetrics, links } (provider.id)}
  <div
    class="provider-reorder-shell"
    class:provider-reorder-shell--content-morph={demandMorphing}
    animate:flip={measuredMotion(reducedMotion || demandMorphing)}
  >
    <section
      class="provider-section"
      data-provider-id={provider.id}
      data-reorder-group="dashboard-providers"
      data-reorder-id={provider.id}
      role="group"
      aria-label={`${providerDisplayName(provider.id)} provider`}
      use:pointerReorder={{
        id: provider.id,
        group: 'dashboard-providers',
        label: providerDisplayName(provider.id),
        gripOnly: true,
        touchGripOnly: true,
        onReorder: (targetId) => reorderProvider(provider.id, targetId),
        onStart: onReorderStart,
        onEnd: onReorderEnd,
      }}
      oncontextmenu={(event) => openProviderMenu(event, provider.id)}
    >
      <header
        class="provider-header"
        data-reorder-handle
        role="group"
        aria-label={`Drag ${providerDisplayName(provider.id)} to reorder`}
      >
        <span
          class="drag-grip"
          data-reorder-handle
          data-reorder-touch-handle
          role="button"
          tabindex="0"
          aria-label={`Move ${providerDisplayName(provider.id)}`}
          aria-describedby="reorder-instructions"
          aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"><Icon name="grip-dots" size={12} /></span
        >
        <h1 class="section-label">{providerDisplayName(provider.id)}</h1>
        <ProviderSparkline daily={snapshot.usage.daily} {now} />
        {#if snapshot.plan}<span class="plan">{snapshot.plan}</span>{/if}
        {#if state?.snapshot && state.stale}<span
            class="status-badge"
            data-tooltip={stalenessTooltip(snapshot.refreshedAt)}>Outdated</span
          >{/if}
        <span
          class="provider-status-slot"
          class:active={Boolean(state?.refreshing || state?.error || snapshot.warnings.length > 0)}
        >
          {#if state?.refreshing}
            <span class="provider-refreshing" aria-label="Refreshing"
              ><Icon name="refresh" size={12} strokeWidth={2} /></span
            >
          {:else if state?.error}
            {@const errorPresentation = providerErrorPresentation(
              state.error,
              state.errorKind,
              providerDisplayName(provider.id),
            )}
            {@const errorDetailId = `provider-error-detail-${provider.id}`}
            <span
              class="provider-warning"
              role="alert"
              data-tooltip={errorPresentation.message}
              aria-label={errorPresentation.message}
              aria-describedby={errorPresentation.detail ? errorDetailId : undefined}
              ><Icon name="warning" size={12} strokeWidth={2} /><span class="sr-only"
                >{errorPresentation.message}</span
              ></span
            >
            {#if errorPresentation.detail}
              <span id={errorDetailId} class="sr-only">Details: {errorPresentation.detail}</span>
            {/if}
          {:else if snapshot.warnings.length > 0}
            <span
              class="provider-warning"
              role="status"
              data-tooltip={snapshot.warnings.join('\n')}
              aria-label={snapshot.warnings.join(' ')}
              ><Icon name="warning" size={12} strokeWidth={2} /><span class="sr-only"
                >{snapshot.warnings.join(' ')}</span
              ></span
            >
          {/if}
        </span>
        <span class="provider-mark"><ProviderIcon providerId={provider.id} size={16} /></span>
      </header>
      <section
        class="provider-card"
        aria-label={`${providerDisplayName(provider.id)} usage`}
        aria-busy={state?.refreshing ? 'true' : undefined}
      >
        {#each snapshot.notices as notice (notice.id)}
          <ProviderNoticeRow {notice} />
        {/each}
        {#each alwaysMetrics as metric (metric.id)}
          <div
            class="metric-context-target"
            class:metric-context-target--content-morph={demandMorphing}
            data-reorder-group={`dashboard-metrics:${provider.id}`}
            data-reorder-id={metric.id}
            role="group"
            aria-label={`${metricDefinition(metric.id)?.label ?? metric.id} options`}
            use:pointerReorder={{
              id: metric.id,
              group: `dashboard-metrics:${provider.id}`,
              label: metricDefinition(metric.id)?.label ?? metric.id,
              touchGripOnly: true,
              onReorder: (targetId) => reorderMetricToTarget(metric.id, provider.id, targetId),
              onStart: onReorderStart,
              onEnd: onReorderEnd,
            }}
            animate:flip={measuredMotion(reducedMotion || demandMorphing)}
            oncontextmenu={(event) => openMetricMenu(event, provider.id, metric.id)}
          >
            <button
              class="metric-reorder-handle"
              data-reorder-handle
              data-reorder-touch-handle
              type="button"
              aria-label={`Move ${metricDefinition(metric.id)?.label ?? metric.id}`}
              aria-describedby="reorder-instructions"
              aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
              ><Icon name="grip-lines" size={12} strokeWidth={2} /></button
            >
            <MetricRenderer
              layout={metric}
              {snapshot}
              {settings}
              {now}
              {catalog}
              {onSettingsChange}
            />
          </div>
        {/each}
        {#if demandMetrics.length > 0 || links.length > 0}
          <button
            class="demand-divider"
            data-reorder-group={`dashboard-metrics:${provider.id}`}
            data-reorder-id="section:onDemand"
            type="button"
            aria-expanded={provider.expanded}
            aria-label={provider.expanded ? 'Show less' : 'Show more'}
            onclick={() => toggleDemandMetrics(provider)}
          >
            <Icon
              name={provider.expanded ? 'chevron-up' : 'chevron-down'}
              size={12}
              strokeWidth={2}
            />
          </button>
          {#if provider.expanded}
            <div class="demand-metrics" transition:measuredReveal={{ reducedMotion }}>
              {#each demandMetrics as metric (metric.id)}
                <div
                  class="metric-context-target"
                  class:metric-context-target--content-morph={demandMorphing}
                  data-reorder-group={`dashboard-metrics:${provider.id}`}
                  data-reorder-id={metric.id}
                  role="group"
                  aria-label={`${metricDefinition(metric.id)?.label ?? metric.id} options`}
                  use:pointerReorder={{
                    id: metric.id,
                    group: `dashboard-metrics:${provider.id}`,
                    label: metricDefinition(metric.id)?.label ?? metric.id,
                    touchGripOnly: true,
                    onReorder: (targetId) =>
                      reorderMetricToTarget(metric.id, provider.id, targetId),
                    onStart: onReorderStart,
                    onEnd: onReorderEnd,
                  }}
                  animate:flip={measuredMotion(reducedMotion || demandMorphing)}
                  oncontextmenu={(event) => openMetricMenu(event, provider.id, metric.id)}
                >
                  <button
                    class="metric-reorder-handle"
                    data-reorder-handle
                    data-reorder-touch-handle
                    type="button"
                    aria-label={`Move ${metricDefinition(metric.id)?.label ?? metric.id}`}
                    aria-describedby="reorder-instructions"
                    aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
                    ><Icon name="grip-lines" size={12} strokeWidth={2} /></button
                  >
                  <MetricRenderer
                    layout={metric}
                    {snapshot}
                    {settings}
                    {now}
                    {catalog}
                    {onSettingsChange}
                  />
                </div>
              {/each}
              {#if links.length > 0}
                <ProviderLinks
                  {links}
                  onOpen={(linkIndex) => onOpenProviderLink(provider.id, linkIndex)}
                />
              {/if}
            </div>
          {/if}
        {/if}
      </section>
    </section>
  </div>
{/each}

{#if providerMenu}
  {@const menuProvider = settings.providers.find((provider) => provider.id === providerMenu?.id)}
  {#if menuProvider}
    <div
      class="context-menu"
      style={`left:${providerMenu.x}px;top:${providerMenu.y}px`}
      role="menu"
      tabindex="-1"
      onkeydown={handleContextMenuKey}
    >
      <button
        class="danger"
        type="button"
        role="menuitem"
        onclick={() => hideProvider(menuProvider.id)}
        ><Icon name="power" size={16} />Hide {providerDisplayName(menuProvider.id)}</button
      >
      <hr />
      <button type="button" role="menuitem" onclick={() => onRefresh(menuProvider.id)}
        ><Icon name="refresh" size={16} />Refresh {providerDisplayName(menuProvider.id)}</button
      >
      <button type="button" role="menuitem" onclick={() => onRenameProvider(menuProvider.id)}
        ><Icon name="edit" size={16} />Rename…</button
      >
      <button type="button" role="menuitem" onclick={() => onOpenProviderCustomize(menuProvider.id)}
        ><Icon name="sliders" size={16} />Customise…</button
      >
      <hr />
      <button type="button" role="menuitem" onclick={() => onShare(menuProvider.id)}
        ><Icon name="share" size={16} />Share receipt</button
      >
    </div>
  {/if}
{/if}

{#if metricMenu}
  {@const metricProvider = settings.providers.find(
    (provider) => provider.id === metricMenu?.providerId,
  )}
  {@const menuMetric = metricProvider?.metrics.find((metric) => metric.id === metricMenu?.metricId)}
  {#if metricProvider && menuMetric}
    <div
      class="context-menu"
      style={`left:${metricMenu.x}px;top:${metricMenu.y}px`}
      role="menu"
      tabindex="-1"
      onkeydown={handleContextMenuKey}
    >
      <button
        class="danger"
        type="button"
        role="menuitem"
        onclick={() => patchMetric(metricProvider.id, menuMetric.id, { enabled: false })}
        ><Icon name="power" size={16} />Hide</button
      >
      {#if metricDefinition(menuMetric.id)?.pinnable}
        <button
          type="button"
          role="menuitem"
          disabled={!menuMetric.pinned &&
            metricProvider.metrics.filter((metric) => metric.pinned).length >= 2}
          onclick={() =>
            patchMetric(metricProvider.id, menuMetric.id, {
              pinned: !menuMetric.pinned,
            })}
          ><Icon name={menuMetric.pinned ? 'star-filled' : 'star'} size={16} />{menuMetric.pinned
            ? 'Unstar'
            : 'Star for menu bar'}</button
        >
      {/if}
      <hr />
      <button type="button" role="menuitem" onclick={() => onRefresh(metricProvider.id)}
        ><Icon name="refresh" size={16} />Refresh {providerDisplayName(metricProvider.id)}</button
      >
      <button
        type="button"
        role="menuitem"
        onclick={() => onOpenProviderCustomize(metricProvider.id)}
        ><Icon name="sliders" size={16} />Customise…</button
      >
    </div>
  {/if}
{/if}

{#if enabledProviders.length === 0}
  <section class="empty-dashboard">
    <span>Nothing connected yet. Add a provider in customise.</span>
  </section>
{/if}

<style>
  :global {
    .provider-section {
      position: relative;
      min-width: 0;
    }

    .provider-header {
      display: flex;
      width: 100%;
      height: 36px;
      align-items: center;
      gap: 12px;
      padding: 0;
      cursor: grab;
    }

    .provider-header:active {
      cursor: grabbing;
    }

    .provider-header .section-label {
      min-width: 0;
      flex: 1;
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .provider-header .provider-sparkline {
      margin-left: auto;
    }

    .plan,
    .status-badge {
      flex: 0 0 auto;
      color: var(--muted);
      font-size: 11px;
      font-weight: 400;
      line-height: 16px;
      white-space: nowrap;
      font-variant-numeric: tabular-nums lining-nums;
    }

    .provider-mark,
    .provider-status-slot,
    .provider-warning,
    .provider-refreshing,
    .drag-grip {
      display: grid;
      width: 16px;
      height: 16px;
      flex: 0 0 16px;
      color: var(--muted);
      place-items: center;
    }

    .provider-status-slot {
      opacity: 0;
    }

    .provider-status-slot.active {
      opacity: 1;
    }

    .provider-warning {
      color: var(--warning);
      cursor: help;
    }

    .provider-refreshing {
      animation: spin 800ms linear infinite;
    }

    .provider-card {
      padding: 0;
    }

    .provider-reorder-shell--content-morph,
    .metric-context-target--content-morph {
      transform: none !important;
    }

    .metric-context-target {
      position: relative;
      cursor: grab;
    }

    .metric-context-target:active {
      cursor: grabbing;
    }

    .metric-reorder-handle {
      position: absolute;
      top: 50%;
      left: -8px;
      z-index: 2;
      display: grid;
      width: 24px;
      height: 24px;
      padding: 0;
      border: 0;
      color: var(--muted);
      cursor: grab;
      opacity: 0;
      transform: translateY(-50%);
      place-items: center;
      transition: opacity var(--motion-measured);
    }

    .metric-context-target:hover > .metric-reorder-handle,
    .metric-reorder-handle:focus-visible {
      opacity: 0.64;
    }

    .demand-divider {
      display: grid;
      width: 100%;
      height: 36px;
      padding: 0;
      border: 0;
      border-top: 0.5px solid var(--rule);
      color: var(--muted);
      cursor: pointer;
      place-items: center;
    }

    .demand-metrics {
      overflow: hidden;
    }

    .hint-card,
    .detection-card {
      position: relative;
      display: grid;
      grid-template-columns: 24px minmax(0, 1fr) auto;
      align-items: start;
      gap: 12px;
      margin: 0 0 24px;
      padding: 12px 0;
      border-top: 0.5px solid var(--rule);
      border-bottom: 0.5px solid var(--rule);
    }

    .hint-card__icon {
      display: grid;
      width: 24px;
      height: 24px;
      color: var(--ink);
      place-items: center;
    }

    .hint-card > div,
    .detection-card > div {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 4px;
    }

    .hint-card strong,
    .detection-card strong {
      color: var(--ink);
      font-size: 13px;
      font-weight: 500;
      line-height: 20px;
    }

    .hint-card span,
    .detection-card span {
      color: var(--body);
      font-size: 13px;
      font-weight: 400;
      line-height: 20px;
    }

    .update-actions {
      display: flex;
      grid-column: 2 / -1;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 8px;
    }

    .update-release-action,
    .detection-card button:not(.dismiss) {
      padding: 0;
      border: 0;
      color: var(--ink);
      font-size: 12px;
      font-weight: 500;
      text-decoration: none;
    }

    .update-release-action:hover,
    .detection-card button:not(.dismiss):hover {
      text-decoration: underline;
      text-underline-offset: 4px;
    }

    .hint-card__dismiss,
    .detection-card .dismiss {
      display: grid;
      width: 24px;
      height: 24px;
      padding: 0;
      border: 0;
      color: var(--muted);
      cursor: pointer;
      place-items: center;
    }

    .update-notes {
      margin-top: 8px;
      color: var(--muted);
      font-size: 11px;
      font-weight: 400;
      line-height: 16px;
      font-variant-numeric: tabular-nums lining-nums;
    }

    .update-notes summary {
      width: fit-content;
      color: var(--ink);
      cursor: pointer;
    }

    .update-notes p {
      max-height: 80px;
      margin: 8px 0 0;
      overflow-y: auto;
      white-space: pre-line;
    }

    .update-error {
      display: flex;
      gap: 4px;
      margin-top: 8px;
      padding: 8px 0 0;
      border-top: 0.5px solid var(--rule);
      color: var(--critical);
      flex-direction: column;
    }

    .update-error strong,
    .update-error small {
      color: inherit;
      font-size: 11px;
      font-weight: 400;
      line-height: 16px;
    }

    .update-progress {
      height: 4px;
      margin-top: 8px;
      overflow: hidden;
      background: var(--rule-faint);
    }

    .update-progress span {
      display: block;
      min-width: 8%;
      height: 100%;
      background: var(--ink);
      transition: width var(--motion-measured);
    }

    .detection-card {
      grid-template-columns: minmax(0, 1fr) auto 24px;
    }

    .empty-dashboard {
      display: flex;
      min-height: 80px;
      align-items: center;
      justify-content: center;
      padding: 24px 0;
      border-top: 0.5px solid var(--rule);
      border-bottom: 0.5px solid var(--rule);
      color: var(--body);
      font-size: 13px;
      line-height: 20px;
      text-align: center;
    }

    .context-menu {
      position: fixed;
      z-index: 80;
      width: 192px;
      padding: 8px 0;
      border-top: 0.5px solid var(--rule);
      border-bottom: 0.5px solid var(--rule);
    }

    .context-menu:focus {
      outline: none;
    }

    .context-menu button {
      display: flex;
      width: 100%;
      height: 36px;
      align-items: center;
      gap: 8px;
      padding: 0;
      border: 0;
      color: var(--ink);
      font-size: 12px;
      font-weight: 400;
      text-align: left;
    }

    .context-menu button.danger {
      color: var(--critical);
    }

    .context-menu button:disabled {
      opacity: 0.4;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .provider-refreshing {
        animation: none;
      }
    }
  }
</style>
