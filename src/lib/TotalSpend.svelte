<script lang="ts">
  import { onDestroy } from 'svelte';
  import Icon from './Icon.svelte';
  import { formatSpendValue } from './metricFormat';
  import SelectMenu from './SelectMenu.svelte';
  import type { ProviderCatalogIndex } from './metrics';
  import {
    emptySpendMessage,
    projectMonthlySpend,
    projectSpend,
    type SpendProjection,
  } from './totalSpend';
  import type { AppSettings, UsageHistory } from './types';

  interface Props {
    providers: Array<{ id: string; usage: UsageHistory }>;
    now: number;
    settings: AppSettings;
    catalog: ProviderCatalogIndex;
    onChange: (settings: AppSettings) => void;
    onShare: (projection: SpendProjection) => boolean | Promise<boolean>;
  }
  let { providers, now, settings, catalog, onChange, onShare }: Props = $props();
  const providerDisplayName = (id: string) => catalog.displayName(id, settings.providerNames);
  const projection = $derived(
    projectSpend(providers, settings.totalSpendPeriod, settings.totalSpendMetric),
  );
  const monthlySpend = $derived(projectMonthlySpend(providers, now));
  const providerNames = $derived(providers.map((provider) => providerDisplayName(provider.id)));
  let shareCopied = $state(false);
  let shareTimer: ReturnType<typeof setTimeout> | undefined;

  onDestroy(() => {
    if (shareTimer) clearTimeout(shareTimer);
  });

  function display(value: number | null) {
    if (value === null) return '—';
    return formatSpendValue(value, settings.totalSpendMetric);
  }
  function metricTitle() {
    if (settings.totalSpendMetric === 'tokens') return 'Tokens';
    if (settings.totalSpendMetric === 'costPerMillion') return 'Cost/MTok';
    return 'Cost';
  }
  function patch(patch: Partial<AppSettings>) {
    onChange({ ...settings, ...patch });
  }
  async function share() {
    if (!(await onShare(projection))) return;
    shareCopied = true;
    if (shareTimer) clearTimeout(shareTimer);
    shareTimer = setTimeout(() => (shareCopied = false), 1400);
  }
</script>

<section class="total-spend-section" aria-labelledby="total-spend-title" data-total-spend>
  <header class="total-spend-header">
    <h2 class="section-label" id="total-spend-title">Total spend</h2>
    <div class="total-spend-actions">
      <SelectMenu
        label="Total spend metric"
        value={settings.totalSpendMetric}
        variant="title"
        options={[
          { value: 'cost', label: 'Cost' },
          { value: 'costPerMillion', label: 'Cost/MTok' },
          { value: 'tokens', label: 'Tokens' },
        ]}
        onChange={(value) => patch({ totalSpendMetric: value as AppSettings['totalSpendMetric'] })}
      />
      <span
        class="total-spend-info"
        data-tooltip={`Only includes ${providerNames.join(' and ')}.`}
        aria-label={`Only includes ${providerNames.join(' and ')}`}
        role="img"><Icon name="about" size={12} strokeWidth={2} /></span
      >
      <button
        class="total-spend-share"
        type="button"
        aria-label={`Share ${metricTitle()} receipt`}
        data-tooltip="Share receipt"
        onclick={share}
        ><Icon name={shareCopied ? 'check' : 'share'} size={16} strokeWidth={2} /></button
      >
    </div>
  </header>

  <div class="period-switcher" aria-label="Total spend period">
    {#each [['today', 'Today'], ['yesterday', 'Yesterday'], ['last30Days', '30 days']] as option (option[0])}
      <button
        class:active={settings.totalSpendPeriod === option[0]}
        type="button"
        aria-pressed={settings.totalSpendPeriod === option[0]}
        onclick={() => patch({ totalSpendPeriod: option[0] as AppSettings['totalSpendPeriod'] })}
        >{option[1]}</button
      >
    {/each}
  </div>

  {#if projection.centerValue === null}
    <p class="total-spend-empty">{emptySpendMessage(settings.totalSpendMetric)}</p>
  {:else}
    <div class="total-spend-figure" data-figure>{display(projection.centerValue)}</div>
    <div class="spend-breakdown" aria-label={`${metricTitle()} by provider`}>
      {#each projection.slices as provider, index (provider.id)}
        <div class:first={index === 0} class="spend-row">
          <span>{providerDisplayName(provider.id)}</span>
          <strong data-figure>{display(provider.value)}</strong>
        </div>
      {/each}
    </div>
  {/if}

  {#if monthlySpend !== null}
    <p class="total-spend-projection" data-figure>
      on pace for ~{formatSpendValue(monthlySpend, 'cost')} this month
    </p>
  {/if}
</section>

<style>
  :global {
    .total-spend-section {
      display: grid;
      gap: 8px;
      margin: 0;
      color: var(--body);
      font-family: var(--font-ui);
      font-variant-numeric: tabular-nums lining-nums;
    }

    .total-spend-header,
    .total-spend-actions,
    .period-switcher,
    .spend-row {
      display: flex;
      align-items: center;
    }

    .total-spend-header {
      min-height: 24px;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 4px;
    }

    .total-spend-header .section-label {
      margin: 0;
    }

    .total-spend-actions {
      gap: 8px;
    }

    .total-spend-actions .select-menu {
      min-width: 80px;
    }

    .total-spend-actions .select-menu__trigger {
      min-height: 24px;
      padding: 0;
      border: 0;
      font-size: 12px;
    }

    .total-spend-info,
    .total-spend-share {
      display: grid;
      width: 24px;
      height: 24px;
      padding: 0;
      border: 0;
      color: var(--muted);
      place-items: center;
    }

    .total-spend-info {
      cursor: help;
    }

    .total-spend-share {
      cursor: pointer;
    }

    .period-switcher {
      height: 36px;
      gap: 12px;
      border-top: 0.5px solid var(--rule);
      border-bottom: 0.5px solid var(--rule);
    }

    .period-switcher button {
      min-height: 28px;
      padding: 0;
      border: 0;
      color: var(--muted);
      font-size: 12px;
      font-weight: 500;
      text-decoration: none;
    }

    .period-switcher button.active {
      color: var(--ink);
      text-decoration: underline;
      text-underline-offset: 4px;
    }

    .total-spend-figure {
      overflow: hidden;
      color: var(--ink);
      font-size: 52px;
      font-weight: 500;
      line-height: 1;
      letter-spacing: -0.04em;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .spend-breakdown {
      display: grid;
    }

    .spend-row {
      height: 36px;
      justify-content: space-between;
      gap: 12px;
      border-top: 0.5px solid var(--rule);
      font-size: 12px;
    }

    .spend-row.first {
      border-top: 0;
    }

    .spend-row span {
      min-width: 0;
      overflow: hidden;
      color: var(--ink);
      letter-spacing: -0.01em;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .spend-row strong {
      flex: 0 0 auto;
      color: var(--muted);
      font-weight: 400;
      text-align: right;
    }

    .total-spend-empty {
      margin: 0;
      padding: 24px 0;
      color: var(--body);
      font-size: 13px;
      line-height: 1.5;
      text-align: center;
    }

    .total-spend-projection {
      margin: 0;
      color: var(--muted);
      font-size: 11px;
      line-height: 1.5;
      font-variant-numeric: tabular-nums lining-nums;
    }
  }
</style>
