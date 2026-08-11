<script lang="ts">
  import { mapSparklineData, SPARKLINE_HEIGHT, SPARKLINE_WIDTH } from './sparkline';
  import type { DailyUsage } from './types';

  interface Props {
    daily: DailyUsage[];
    now: number;
  }

  let { daily, now }: Props = $props();
  const chart = $derived(mapSparklineData(daily, now));
</script>

{#if chart}
  <svg
    class="provider-sparkline"
    viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
    width={SPARKLINE_WIDTH}
    height={SPARKLINE_HEIGHT}
    role="img"
    aria-label="Token usage over the last 7 days"
  >
    <polyline class="provider-sparkline__line" points={chart.polyline} fill="none"></polyline>
    <circle class="provider-sparkline__current" cx={chart.current.x} cy={chart.current.y} r="1.5"
    ></circle>
  </svg>
{/if}

<style>
  .provider-sparkline {
    display: block;
    width: 56px;
    height: 16px;
    flex: 0 0 56px;
    overflow: visible;
  }

  .provider-sparkline__line {
    fill: none;
    stroke: var(--secondary);
    stroke-width: 1.5px;
    stroke-linecap: round;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }

  .provider-sparkline__current {
    fill: var(--spark-current);
  }
</style>
