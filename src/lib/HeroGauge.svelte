<script lang="ts">
  import { heroGaugeStatus, type HeroGaugeSelection } from './heroGauge';

  interface Props {
    selection: HeroGaugeSelection;
    reducedMotion: boolean;
    /** Undefined uses the Phase 3a status copy; null deliberately hides the projection line. */
    projectionText?: string | null;
  }

  let { selection, reducedMotion, projectionText }: Props = $props();

  const centreX = 110;
  const centreY = 94;
  const radius = 78;
  const startAngle = 160;
  const sweepAngle = 220;
  const arcLength = radius * ((sweepAngle * Math.PI) / 180);
  const gapFraction = 1 / arcLength;
  const regularEndFraction = 0.85 - gapFraction;
  const trackPath = arcPath(0, regularEndFraction);
  const redlinePath = arcPath(0.85, 1);

  const targetPercent = $derived(Math.round(clamp(selection.usedPercent, 0, 100)));
  const fillPercent = $derived(
    clamp(selection.usedPercent / (regularEndFraction * 100), 0, 1) * 100,
  );
  const needleAngle = $derived(startAngle + clamp(selection.usedPercent, 0, 100) * 2.2 + 90);
  const caption = $derived(
    truncate(`${selection.providerName} / ${selection.metricName}`.toUpperCase(), 42),
  );
  const detailText = $derived(
    projectionText === undefined ? heroGaugeStatus(selection) : projectionText,
  );

  let displayedPercent = $state('');
  let previousTarget: number | null = null;
  let scrambleTimer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    const target = targetPercent;
    window.clearTimeout(scrambleTimer);

    if (previousTarget === null || target === previousTarget || reducedMotion) {
      previousTarget = target;
      displayedPercent = String(target);
      return;
    }

    previousTarget = target;
    let frame = 0;
    const tick = () => {
      if (frame >= 3) {
        displayedPercent = String(target);
        return;
      }
      displayedPercent = scrambleDigits(target, frame);
      frame += 1;
      scrambleTimer = window.setTimeout(tick, 40);
    };
    tick();

    return () => window.clearTimeout(scrambleTimer);
  });

  function arcPath(fromFraction: number, toFraction: number) {
    const from = polarPoint(startAngle + sweepAngle * fromFraction);
    const to = polarPoint(startAngle + sweepAngle * toFraction);
    const degrees = sweepAngle * (toFraction - fromFraction);
    return `M ${from.x.toFixed(3)} ${from.y.toFixed(3)} A ${radius} ${radius} 0 ${degrees > 180 ? 1 : 0} 1 ${to.x.toFixed(3)} ${to.y.toFixed(3)}`;
  }

  function polarPoint(angle: number) {
    const radians = (angle * Math.PI) / 180;
    return {
      x: centreX + radius * Math.cos(radians),
      y: centreY + radius * Math.sin(radians),
    };
  }

  function scrambleDigits(value: number, frame: number) {
    return String(value)
      .split('')
      .map((digit, index) => (Number(digit) + (frame + 1) * 3 + index * 2) % 10)
      .join('');
  }

  function truncate(value: string, limit: number) {
    return value.length <= limit ? value : `${value.slice(0, limit - 1)}…`;
  }

  function clamp(value: number, minimum: number, maximum: number) {
    return Math.min(maximum, Math.max(minimum, value));
  }
</script>

<!-- The product spec requires the read-only meter itself to be keyboard focusable. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<section
  class="hero-gauge"
  class:hero-gauge--reduced-motion={reducedMotion}
  role="meter"
  tabindex="0"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-valuenow={targetPercent}
  aria-valuetext={`${targetPercent}% used`}
  aria-label={`${selection.providerName} ${selection.metricName} usage`}
>
  <svg viewBox="0 0 220 188" aria-hidden="true">
    <path class="hero-gauge__track" d={trackPath} pathLength="100" />
    <path
      class="hero-gauge__fill"
      d={trackPath}
      pathLength="100"
      style={`--hero-fill: ${fillPercent}`}
    />
    <path class="hero-gauge__redline" d={redlinePath} />

    <line
      class="hero-gauge__needle-shadow"
      x1={centreX}
      y1={centreY}
      x2={centreX}
      y2={centreY - 61}
      style={`--needle-angle: ${needleAngle}deg`}
    />
    <line
      class="hero-gauge__needle"
      x1={centreX}
      y1={centreY}
      x2={centreX}
      y2={centreY - 61}
      style={`--needle-angle: ${needleAngle}deg`}
    />
    <circle class="hero-gauge__pivot-shadow" cx={centreX + 2} cy={centreY + 2} r="4" />
    <circle class="hero-gauge__pivot" cx={centreX} cy={centreY} r="4" />

    <text class="hero-gauge__value" x={centreX} y="142" text-anchor="middle">
      {displayedPercent}%
    </text>
    <text class="hero-gauge__caption" x={centreX} y="158" text-anchor="middle">
      {caption}
    </text>
    {#if detailText}
      <text class="hero-gauge__detail" x={centreX} y="176" text-anchor="middle">
        {detailText}
      </text>
    {/if}
  </svg>
</section>

<style>
  .hero-gauge {
    width: 100%;
    box-sizing: border-box;
    margin: 0 0 14px;
    padding: 8px 12px 4px;
    border: 1px solid var(--surface-border);
    border-radius: 14px;
    outline: none;
    background: var(--card);
  }

  .hero-gauge:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }

  svg {
    display: block;
    width: 100%;
    height: 188px;
    overflow: visible;
  }

  .hero-gauge__track,
  .hero-gauge__fill,
  .hero-gauge__redline {
    fill: none;
    stroke-width: 8px;
    stroke-linecap: butt;
  }

  .hero-gauge__track {
    stroke: var(--meter-track);
  }

  .hero-gauge__fill {
    stroke: var(--meter-fill);
    stroke-dasharray: var(--hero-fill) 100;
    transition: stroke-dasharray 160ms ease-out;
  }

  .hero-gauge__redline {
    stroke: var(--meter-critical);
  }

  .hero-gauge__needle,
  .hero-gauge__needle-shadow {
    transform: rotate(var(--needle-angle));
    transform-box: view-box;
    transform-origin: 110px 94px;
    stroke-width: 2px;
    transition: transform 160ms ease-out;
  }

  .hero-gauge__needle-shadow {
    transform: translate(2px, 2px) rotate(var(--needle-angle));
    stroke: color-mix(in srgb, #141414 65%, transparent);
  }

  .hero-gauge__needle {
    stroke: var(--text);
  }

  .hero-gauge__pivot-shadow {
    fill: color-mix(in srgb, #141414 65%, transparent);
  }

  .hero-gauge__pivot {
    fill: var(--text);
  }

  .hero-gauge__value {
    fill: var(--text);
    font-family: var(--font-display);
    font-size: 44px;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.5px;
  }

  .hero-gauge__caption,
  .hero-gauge__detail {
    fill: var(--secondary);
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    text-transform: uppercase;
  }

  .hero-gauge__caption {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 1.25px;
  }

  .hero-gauge__detail {
    font-size: 9px;
    letter-spacing: 0.2px;
  }

  .hero-gauge--reduced-motion .hero-gauge__fill,
  .hero-gauge--reduced-motion .hero-gauge__needle,
  .hero-gauge--reduced-motion .hero-gauge__needle-shadow {
    transition: none;
  }

  :global(:root[data-density='compact']) .hero-gauge {
    margin-bottom: 10px;
  }

  @media (prefers-reduced-motion: reduce) {
    .hero-gauge__fill,
    .hero-gauge__needle,
    .hero-gauge__needle-shadow {
      transition: none;
    }
  }
</style>
