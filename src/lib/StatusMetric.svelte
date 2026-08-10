<script lang="ts">
  import type { StatusMetric as StatusMetricValue } from './types';

  interface Props {
    label: string;
    metric: StatusMetricValue | null;
  }

  let { label, metric }: Props = $props();
</script>

<div class="status-row">
  <span>{label}</span>
  {#if metric}
    <span
      class="status-badge status-badge--{metric.tone}"
      data-tooltip={metric.subtitle ?? undefined}
    >
      {metric.text}
    </span>
  {:else}
    <span class="status-reading">No data</span>
  {/if}
</div>

<style>
  :global {
    .status-row {
      font-variant-numeric: tabular-nums lining-nums;
    }

    .status-badge {
      max-width: 60%;
      overflow: hidden;
      padding: 0;
      color: var(--muted);
      font-weight: 400;
      text-align: right;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .status-badge--positive {
      color: var(--ink);
    }

    .status-badge--warning {
      color: var(--warning);
    }

    .status-badge--danger {
      color: var(--critical);
    }

    .status-reading {
      color: var(--muted);
    }
  }
</style>
