<script lang="ts">
  import { heroBarPresentation, heroGaugeStatus, type HeroGaugeSelection } from './heroGauge';

  interface Props {
    selection: HeroGaugeSelection;
    reducedMotion: boolean;
    /** Undefined uses the relaxed status copy; null deliberately hides the projection line. */
    projectionText?: string | null;
  }

  let { selection, reducedMotion, projectionText }: Props = $props();

  const targetPercent = $derived(Math.round(clamp(selection.usedPercent, 0, 100)));
  const presentation = $derived(heroBarPresentation(selection.usedPercent));
  const detailText = $derived(
    projectionText === undefined ? heroGaugeStatus(selection) : projectionText,
  );

  function clamp(value: number, minimum: number, maximum: number) {
    return Math.min(maximum, Math.max(minimum, value));
  }
</script>

<!-- The read-only measurement remains keyboard focusable so its value can be inspected directly. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<section
  class="hero-gauge"
  class:hero-gauge--reduced-motion={reducedMotion}
  role="progressbar"
  tabindex="0"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-valuenow={targetPercent}
  aria-valuetext={`${targetPercent}% used`}
  aria-label={`${selection.providerName} ${selection.metricName} usage`}
>
  <p class="hero-gauge__label section-label">
    {selection.providerName} / {selection.metricName}
  </p>
  <p class="hero-gauge__reading">
    <span class="hero-gauge__value hero-numeral">{targetPercent}</span><span
      class="hero-gauge__unit hero-unit">%</span
    >
  </p>
  <div class="hero-gauge__bar" aria-hidden="true">
    <span
      class="hero-gauge__fill hero-gauge__fill--{presentation.tone}"
      style:width={`${targetPercent}%`}
    ></span>
    <span class="hero-gauge__threshold" style:left={`${presentation.activeThreshold}%`}></span>
  </div>
  {#if detailText}
    <p class="hero-gauge__detail">{detailText}</p>
  {/if}
</section>

<style>
  .hero-gauge {
    display: flex;
    width: 100%;
    margin: 0 0 24px;
    padding: 0;
    flex-direction: column;
    gap: 8px;
    outline: none;
  }

  .hero-gauge:focus-visible {
    outline: 1px solid var(--ink);
    outline-offset: 4px;
  }

  .hero-gauge__label,
  .hero-gauge__reading,
  .hero-gauge__detail {
    margin: 0;
  }

  .hero-gauge__label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .hero-gauge__reading {
    display: flex;
    min-height: 52px;
    align-items: baseline;
    color: var(--ink);
    font-variant-numeric: tabular-nums lining-nums;
    line-height: 52px;
  }

  .hero-gauge__unit {
    margin-left: 4px;
  }

  .hero-gauge__bar {
    position: relative;
    width: 100%;
    height: 8px;
    background: var(--rule-faint);
  }

  .hero-gauge__fill {
    display: block;
    height: 100%;
    background: var(--accent);
    transition: width var(--motion-measured);
  }

  .hero-gauge__fill--warning {
    background: var(--warning);
  }

  .hero-gauge__fill--critical {
    background: var(--critical);
  }

  .hero-gauge__threshold {
    position: absolute;
    top: 0;
    width: 0;
    height: 8px;
    border-left: 1px solid var(--ink);
    transform: translateX(-1px);
  }

  .hero-gauge__detail {
    overflow: hidden;
    color: var(--muted);
    font-size: 11px;
    font-weight: 400;
    font-variant-numeric: tabular-nums lining-nums;
    line-height: 16px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .hero-gauge--reduced-motion .hero-gauge__fill {
    transition: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .hero-gauge__fill {
      transition: none;
    }
  }
</style>
