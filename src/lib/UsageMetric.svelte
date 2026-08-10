<script lang="ts">
  import { onDestroy } from 'svelte';
  import Icon from './Icon.svelte';
  import { formatMetricNumber, formatMetricValue } from './metricFormat';
  import ModelUsageDetail from './ModelUsageDetail.svelte';
  import type { UsagePeriod } from './types';

  interface Props {
    label: string;
    period: UsagePeriod | null;
  }
  let { label, period }: Props = $props();
  let open = $state(false);
  let detailTop = $state(8);
  let showTimer: ReturnType<typeof setTimeout> | undefined;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;

  function reading(value: UsagePeriod | null) {
    if (!value) return 'No data';
    const tokens = formatMetricValue(value.tokens, 'count', 'row', 'tokens');
    if (value.estimatedCostUsd === null) return tokens;
    return `${formatMetricNumber(value.estimatedCostUsd, 'dollars', 'row')} · ${tokens}`;
  }
  function valueTooltip(value: UsagePeriod | null) {
    if (!value) return undefined;
    if (value.modelBreakdown?.models.length) return undefined;
    const note =
      value.estimatedCostUsd !== null && value.costEstimated
        ? 'Estimated locally, so it may be off'
        : undefined;
    const abbreviated =
      Math.abs(value.tokens) >= 1000 || Math.abs(value.estimatedCostUsd ?? 0) >= 1000;
    if (!abbreviated && !note) return undefined;
    const figures = [
      value.estimatedCostUsd === null
        ? undefined
        : formatMetricNumber(value.estimatedCostUsd, 'dollars', 'full'),
      formatMetricValue(value.tokens, 'count', 'full', 'tokens'),
    ].filter(Boolean);
    return [...figures, note].filter(Boolean).join('\n');
  }
  function unknownModelTooltip(models: string[]) {
    const heading = models.length === 1 ? 'Unknown model found' : 'Unknown models found';
    return [heading, ...models.map((model) => `- ${model}`)].join('\n');
  }
  function scheduleShow(event: Event) {
    if (!period?.modelBreakdown?.models.length || open || showTimer) return;
    if (hideTimer) clearTimeout(hideTimer);
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const estimatedHeight = Math.min(86 + period.modelBreakdown.models.length * 52, 360);
    detailTop = Math.max(8, Math.min(rect.bottom + 7, window.innerHeight - estimatedHeight - 8));
    showTimer = setTimeout(() => {
      open = true;
      showTimer = undefined;
    }, 400);
  }
  function scheduleHide() {
    if (showTimer) clearTimeout(showTimer);
    showTimer = undefined;
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      open = false;
      hideTimer = undefined;
    }, 180);
  }
  function keepOpen() {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = undefined;
  }
  onDestroy(() => {
    if (showTimer) clearTimeout(showTimer);
    if (hideTimer) clearTimeout(hideTimer);
  });
</script>

<div class="usage-row">
  <span
    >{label}{#if period?.unknownModels?.length}<i
        class="usage-label-warning"
        data-tooltip={unknownModelTooltip(period.unknownModels)}
        aria-label="This period used a model with unknown pricing"
        ><Icon name="warning" size={12} strokeWidth={2} /></i
      >{/if}</span
  >
  <button
    type="button"
    data-figure
    class:usage-reading-interactive={period?.modelBreakdown?.models.length}
    data-tooltip={valueTooltip(period)}
    disabled={!period?.modelBreakdown?.models.length}
    onmouseenter={scheduleShow}
    onmouseleave={scheduleHide}
    onfocus={scheduleShow}
    onblur={scheduleHide}>{reading(period)}</button
  >
</div>

{#if open && period?.modelBreakdown}
  <ModelUsageDetail
    title={label}
    breakdown={period.modelBreakdown}
    top={detailTop}
    onEnter={keepOpen}
    onLeave={scheduleHide}
  />
{/if}

<style>
  :global {
    .usage-row span {
      color: var(--ink);
      font-weight: 400;
    }

    .usage-row > button {
      padding: 0;
      border: 0;
      color: var(--muted);
      font: inherit;
      font-family: var(--font-ui);
      font-variant-numeric: tabular-nums lining-nums;
      text-align: right;
    }

    .usage-row > button:disabled {
      opacity: 1;
    }

    .usage-reading-interactive {
      padding: 0;
      outline: none;
      cursor: default;
    }

    .usage-reading-interactive:focus-visible {
      outline: 1px solid color-mix(in srgb, var(--ink) 64%, transparent);
      outline-offset: 4px;
    }

    .usage-label-warning {
      display: inline-block;
      margin-left: 4px;
      color: var(--warning);
      font-size: 11px;
    }

    .usage-divider {
      height: 0;
      margin: 4px 0;
      border-top: 0.5px solid var(--rule);
    }
  }
</style>
