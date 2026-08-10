<script lang="ts">
  import Icon from './Icon.svelte';
  import {
    formatLimit,
    formatReset,
    isFreshSessionWindow,
    paceProjectionLine,
    paceTooltip,
    projectPace,
  } from './pacing';
  import type { QuotaWindow } from './types';

  interface Props {
    quota: QuotaWindow;
    now: number;
    usageDisplay: 'used' | 'left';
    resetDisplay: 'countdown' | 'exact';
    timeFormat: 'system' | 'twelveHour' | 'twentyFourHour';
    alwaysShowPacing: boolean;
    isSessionWindow?: boolean;
    onToggleUsage: () => void;
    onToggleReset: () => void;
  }

  let {
    quota,
    now,
    usageDisplay,
    resetDisplay,
    timeFormat,
    alwaysShowPacing,
    isSessionWindow = false,
    onToggleUsage,
    onToggleReset,
  }: Props = $props();
  const used = $derived(Math.min(100, Math.max(0, quota.usedPercent)));
  const remaining = $derived(Math.max(0, 100 - used));
  const countUnit = $derived(quota.unit?.trim() || 'requests');
  const estimateNote = $derived(
    quota.sourceNote?.trim() || 'Estimated from local usage data and may differ from billed usage.',
  );
  const reading = $derived.by(() => {
    if (quota.format === 'count' && quota.usedValue !== null && quota.limitValue !== null) {
      const value =
        usageDisplay === 'left' ? Math.max(0, quota.limitValue - quota.usedValue) : quota.usedValue;
      return `${value.toFixed(0)} ${countUnit} ${usageDisplay}`;
    }
    if (quota.format === 'dollars' && quota.usedValue !== null) {
      if (usageDisplay === 'left' && quota.limitValue !== null) {
        return `$${Math.max(0, quota.limitValue - quota.usedValue).toFixed(2)} left`;
      }
      return `$${quota.usedValue.toFixed(2)} spent`;
    }
    return `${(usageDisplay === 'used' ? used : remaining).toFixed(0)}% ${usageDisplay}`;
  });
  const readingTooltip = $derived.by(() => {
    if (quota.format === 'count' && quota.usedValue !== null && quota.limitValue !== null) {
      const opposite =
        usageDisplay === 'left' ? quota.usedValue : Math.max(0, quota.limitValue - quota.usedValue);
      return `${opposite.toFixed(0)} ${countUnit} ${usageDisplay === 'left' ? 'used' : 'left'}`;
    }
    if (quota.format === 'dollars' && quota.usedValue !== null) {
      if (usageDisplay === 'left') return `$${quota.usedValue.toFixed(2)} spent`;
      if (quota.limitValue !== null)
        return `$${Math.max(0, quota.limitValue - quota.usedValue).toFixed(2)} left`;
      return null;
    }
    return usageDisplay === 'left' ? `${used.toFixed(0)}% used` : `${remaining.toFixed(0)}% left`;
  });
  const fillPercent = $derived.by(() => {
    if (
      quota.format === 'dollars' &&
      quota.usedValue !== null &&
      quota.limitValue !== null &&
      quota.limitValue > 0
    ) {
      const displayed =
        usageDisplay === 'left' ? Math.max(0, quota.limitValue - quota.usedValue) : quota.usedValue;
      return Math.min(
        100,
        Math.max(0, ((Math.round(displayed * 100) / 100) * 100) / quota.limitValue),
      );
    }
    return Math.min(100, Math.max(0, Math.round(usageDisplay === 'used' ? used : remaining)));
  });
  const freshSession = $derived(isFreshSessionWindow(quota, now, isSessionWindow));
  const pace = $derived(projectPace(quota, now, isSessionWindow));
  const paceDetail = $derived(paceTooltip(pace));
  const projectionLine = $derived(paceProjectionLine(pace, now));
  const paceTooltipDetail = $derived(
    [paceDetail, projectionLine].filter((line): line is string => Boolean(line)).join('\n') || null,
  );
  const roundedUsed = $derived(Math.round(used));
  const severity = $derived(
    pace.severity === 'level'
      ? roundedUsed >= 90
        ? 'critical'
        : roundedUsed >= 80
          ? 'warning'
          : 'normal'
      : pace.severity === 'healthy'
        ? 'normal'
        : pace.severity === 'close'
          ? 'warning'
          : 'critical',
  );
  const showPace = $derived(
    pace.severity === 'close' ||
      pace.severity === 'runningOut' ||
      pace.severity === 'spent' ||
      (alwaysShowPacing && pace.severity === 'healthy'),
  );
  const paceLabel = $derived.by(() => {
    if (pace.severity === 'spent') return 'Limit reached';
    if (pace.severity === 'runningOut')
      return pace.runOutAt === null
        ? null
        : formatLimit(pace.runOutAt, now, resetDisplay, timeFormat);
    if (pace.projectedUsedPercent === null) return null;
    const left = Math.max(0, 100 - pace.projectedUsedPercent);
    return pace.severity === 'close' ? `~${Math.max(1, Math.round(left))}% spare` : paceDetail;
  });
  const resetTooltip = $derived(
    quota.resetsAt
      ? formatReset(
          quota.resetsAt,
          now,
          resetDisplay === 'countdown' ? 'exact' : 'countdown',
          timeFormat,
        )
      : null,
  );
</script>

<section class="metric" aria-label={`${quota.label} quota`}>
  <div class="metric__heading">
    <h2>
      {quota.label}
      {#if quota.estimated}
        <span
          class="metric-estimate"
          data-tooltip={estimateNote}
          aria-label="Estimated quota"
          role="img"><Icon name="about" size={12} strokeWidth={2} /></span
        >
      {/if}
    </h2>
    {#if showPace}
      {#if pace.severity === 'spent' || pace.severity === 'runningOut'}
        {#if pace.severity === 'runningOut' && paceLabel}
          <button
            type="button"
            class="pace-warning"
            data-tooltip={paceTooltipDetail ?? undefined}
            aria-label={paceLabel}
            onclick={onToggleReset}
            ><span class="pace-warning__icon"
              ><Icon name="flame-filled" size={12} strokeWidth={2} /></span
            >{paceLabel}</button
          >
        {:else}
          <span
            class="pace-warning"
            data-tooltip={paceTooltipDetail ?? undefined}
            aria-label={pace.severity === 'spent' ? 'Limit reached' : 'Will reach limit'}
            ><span class="pace-warning__icon"
              ><Icon name="flame-filled" size={12} strokeWidth={2} /></span
            >{paceLabel ?? ''}</span
          >
        {/if}
      {:else if paceLabel}
        <span
          data-tooltip={pace.severity === 'close' ? (paceTooltipDetail ?? undefined) : undefined}
          >{paceLabel}</span
        >
      {/if}
    {/if}
  </div>

  <div class="meter-shell" data-tooltip={paceTooltipDetail ?? undefined}>
    <div
      class="meter meter--{severity}"
      role="progressbar"
      aria-label={`${quota.label} used`}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={used}
    >
      <span
        class="meter__fill"
        class:meter__fill--visible={fillPercent > 0}
        style={`--fill-percent: ${fillPercent}%`}
      ></span>
    </div>
  </div>

  <div class="metric__reading">
    <button type="button" data-tooltip={readingTooltip ?? undefined} onclick={onToggleUsage}>
      {reading}
    </button>
    {#if freshSession}
      <span data-tooltip="Sessions start after you send your first message.">Not started</span>
    {:else}
      <button type="button" data-tooltip={resetTooltip ?? undefined} onclick={onToggleReset}>
        {formatReset(quota.resetsAt, now, resetDisplay, timeFormat)}
      </button>
    {/if}
  </div>
</section>

<style>
  :global {
    .metric__heading .pace-warning {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin: 0;
      padding: 0;
      border: 0;
      color: var(--muted);
      font: inherit;
      font-size: 11px;
      line-height: 16px;
    }

    .metric__heading .metric-estimate {
      display: inline-flex;
      margin-left: 4px;
      color: var(--muted);
    }

    .metric__heading .pace-warning__icon {
      color: var(--critical);
    }

    .meter__fill {
      position: absolute;
      inset: 0 auto 0 0;
      width: 0;
      background: var(--muted);
      transition: width var(--motion-measured);
    }

    .meter__fill--visible {
      width: var(--fill-percent);
    }

    .metric__reading strong {
      color: var(--ink);
      font-family: var(--font-ui);
      font-weight: 400;
    }

    .metric__reading button {
      padding: 0;
      border: 0;
      color: inherit;
      cursor: pointer;
      font-variant-numeric: tabular-nums lining-nums;
      transition: opacity var(--motion-measured);
    }

    .metric__reading button:first-child {
      color: var(--ink);
      font-weight: 500;
    }

    .metric__reading button:focus-visible {
      outline: 1px solid color-mix(in srgb, var(--ink) 64%, transparent);
      outline-offset: 4px;
    }
  }
</style>
