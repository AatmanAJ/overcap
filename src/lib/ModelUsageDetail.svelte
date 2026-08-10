<script lang="ts">
  import { formatMetricNumber, formatMetricValue } from './metricFormat';
  import type { ModelUsageBreakdown } from './types';

  interface Props {
    title: string;
    breakdown: ModelUsageBreakdown;
    top: number;
    onEnter: () => void;
    onLeave: () => void;
  }

  let { title, breakdown, top, onEnter, onLeave }: Props = $props();

  const shares = $derived.by(() => {
    const allPriced = breakdown.models.every((model) => model.costUsd !== null);
    const costTotal = breakdown.models.reduce((sum, model) => sum + (model.costUsd ?? 0), 0);
    const tokenTotal = breakdown.models.reduce((sum, model) => sum + model.totalTokens, 0);
    if (allPriced && costTotal > 0) {
      return breakdown.models.map((model) => Math.max(0, (model.costUsd ?? 0) / costTotal));
    }
    return breakdown.models.map((model) =>
      tokenTotal > 0 ? Math.max(0, model.totalTokens / tokenTotal) : 0,
    );
  });

  const percents = $derived.by(() => {
    if (!shares.some((share) => share > 0)) return shares.map(() => 0);
    const raw = shares.map((share) => share * 100);
    const result = raw.map(Math.floor);
    let remaining = 100 - result.reduce((sum, value) => sum + value, 0);
    const order = raw
      .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
      .sort((left, right) => right.remainder - left.remainder || left.index - right.index);
    for (const item of order) {
      if (remaining <= 0) break;
      result[item.index] += 1;
      remaining -= 1;
    }
    return result;
  });
</script>

<div
  class="model-usage-detail"
  style={`top:${top}px`}
  role="tooltip"
  aria-label={`${title} model usage`}
  onmouseenter={onEnter}
  onmouseleave={onLeave}
>
  <h3>{title}</h3>
  <div class="model-usage-list">
    {#each breakdown.models as model, index (model.model)}
      <div class="model-usage-row">
        <div class="model-usage-primary">
          <strong title={model.model}>{model.model}</strong>
          <span
            >{model.costUsd === null
              ? '—'
              : formatMetricNumber(model.costUsd, 'dollars', 'row')}</span
          >
        </div>
        <div class="model-usage-secondary">
          <span>{percents[index]}%</span><span
            >{formatMetricValue(model.totalTokens, 'count', 'row', 'tokens')}</span
          >
        </div>
        <div class="model-usage-meter" aria-hidden="true">
          <i style={`width:${Math.min(shares[index] * 100, 100)}%`}></i>
        </div>
      </div>
    {/each}
  </div>
  <p>{breakdown.sourceNote}</p>
</div>

<style>
  :global {
    .model-usage-detail {
      position: fixed;
      right: 8px;
      z-index: 100;
      box-sizing: border-box;
      width: 280px;
      max-height: calc(100vh - 16px);
      padding: 16px 0;
      overflow-y: auto;
      border-top: 0.5px solid var(--rule);
      border-bottom: 0.5px solid var(--rule);
      color: var(--ink);
      animation: model-detail-in var(--motion-measured) both;
    }

    .model-usage-detail h3 {
      margin: 0 0 8px;
      font-size: 13px;
      font-weight: 500;
      line-height: 1.5;
    }

    .model-usage-list {
      display: grid;
    }

    .model-usage-row {
      position: relative;
      display: grid;
      min-height: 36px;
      gap: 0;
      padding: 4px 0;
      border-top: 0.5px solid var(--rule);
    }

    .model-usage-row:first-child {
      border-top: 0;
    }

    .model-usage-primary,
    .model-usage-secondary {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
      font-size: 11px;
      line-height: 16px;
    }

    .model-usage-primary strong {
      overflow: hidden;
      color: var(--ink);
      font-weight: 500;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .model-usage-primary span,
    .model-usage-secondary span {
      font-family: var(--font-ui);
      font-variant-numeric: tabular-nums lining-nums;
      white-space: nowrap;
    }

    .model-usage-secondary {
      color: var(--muted);
    }

    .model-usage-meter {
      height: 2px;
      margin-top: 4px;
      overflow: hidden;
      background: var(--rule-faint);
    }

    .model-usage-meter i {
      display: block;
      height: 100%;
      background: var(--muted);
    }

    .model-usage-detail > p {
      margin: 8px 0 0;
      color: var(--muted);
      font-family: var(--font-ui);
      font-size: 11px;
      font-variant-numeric: tabular-nums lining-nums;
      line-height: 1.5;
      text-align: center;
    }

    @keyframes model-detail-in {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
    }
  }
</style>
