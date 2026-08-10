<script lang="ts">
  import { SvelteMap } from 'svelte/reactivity';
  import { claimCodexResetCredit } from './backend';
  import { formatReset } from './pacing';
  import type { ResetClaimOutcome } from './types';

  interface Props {
    title: string;
    count: number;
    expiries: string[];
    now: number;
    timeFormat: 'system' | 'twelveHour' | 'twentyFourHour';
    top: number;
    onEnter: () => void;
    onLeave: () => void;
    onDismiss: () => void;
  }

  let { title, count, expiries, now, timeFormat, top, onEnter, onLeave, onDismiss }: Props =
    $props();
  let confirmingExpiry = $state<string | null>(null);
  let pendingExpiry = $state<string | null>(null);
  let result = $state<{ expiry: string; outcome: ResetClaimOutcome } | null>(null);
  let dialogElement: HTMLDivElement | undefined;
  const requestIds = new SvelteMap<string, string>();

  const entries = $derived(
    [...expiries].sort().map((expiry, index) => {
      const timestamp = new Date(expiry).getTime();
      const remaining = timestamp - now;
      const severity =
        remaining <= 48 * 60 * 60 * 1000
          ? 'critical'
          : remaining <= 7 * 24 * 60 * 60 * 1000
            ? 'warning'
            : 'normal';
      const relative = formatReset(expiry, now, 'countdown', timeFormat).replace(
        /^Resets(?: in)?\s*/,
        '',
      );
      const exact = formatReset(expiry, now, 'exact', timeFormat).replace(/^Resets\s*/, '');
      const imminent = relative === 'soon';
      return {
        id: `${expiry}:${index}`,
        expiry,
        number: index + 1,
        severity,
        exact: imminent ? 'Expiring soon' : exact,
        relative: imminent ? null : relative,
      };
    }),
  );

  const resultMessage = $derived(
    result?.outcome === 'success'
      ? 'Reset applied.'
      : result?.outcome === 'nothingToReset'
        ? 'No active limit needs resetting.'
        : result?.outcome === 'noCredit'
          ? 'This reset is no longer available.'
          : result?.outcome === 'failed'
            ? "Couldn't use this reset. Try again."
            : null,
  );

  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    if (confirmingExpiry) {
      dialogElement?.focus();
      confirmingExpiry = null;
      return;
    }
    if (!pendingExpiry) onDismiss();
  }

  function beginClaim(expiry: string) {
    confirmingExpiry = expiry;
    result = null;
    if (!requestIds.has(expiry)) {
      requestIds.set(
        expiry,
        globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      );
    }
  }

  async function confirmClaim(expiry: string) {
    const requestId = requestIds.get(expiry);
    if (!requestId || pendingExpiry) return;
    pendingExpiry = expiry;
    let outcome: ResetClaimOutcome;
    try {
      outcome = await claimCodexResetCredit(expiry, requestId);
    } catch {
      outcome = 'failed';
    }
    result = { expiry, outcome };
    pendingExpiry = null;
    confirmingExpiry = null;
    if (outcome !== 'failed') requestIds.delete(expiry);
  }
</script>

<svelte:window onkeydowncapture={handleKeydown} />

<div
  bind:this={dialogElement}
  class="reset-credits-detail"
  style={`top:${top}px`}
  role="dialog"
  tabindex="-1"
  aria-label={`${title} details`}
  onmouseenter={onEnter}
  onfocusin={onEnter}
  onmouseleave={() => {
    if (!confirmingExpiry && !pendingExpiry) onLeave();
  }}
>
  <div class="reset-detail-body">
    {#if resultMessage}
      <div
        class:reset-result-error={result?.outcome === 'failed'}
        class="reset-result"
        role="status"
      >
        {resultMessage}
      </div>
    {/if}
    {#if entries.length > 0}
      <div class="reset-timeline">
        {#each entries as entry, index (entry.id)}
          <div class="reset-entry-shell">
            <div class="reset-rail" aria-hidden="true">
              <i class:reset-rail-hidden={index === 0}></i>
              <b class="reset-node reset-node--{entry.severity}">{entry.number}</b>
              <i class:reset-rail-hidden={index === entries.length - 1}></i>
            </div>
            <div class="reset-entry-content">
              {#if confirmingExpiry === entry.expiry}
                <div class="reset-confirm">
                  <strong>Use this reset?</strong>
                  <span>Immediately reset your usage limits. This can't be undone.</span>
                  <div>
                    <button
                      data-cta="primary"
                      class="reset-confirm-primary"
                      type="button"
                      disabled={pendingExpiry !== null}
                      onclick={() => confirmClaim(entry.expiry)}
                      ><span>{pendingExpiry === entry.expiry ? 'Resetting…' : 'Use reset'}</span
                      ></button
                    >
                    <button
                      type="button"
                      disabled={pendingExpiry !== null}
                      onclick={() => (confirmingExpiry = null)}>Cancel</button
                    >
                  </div>
                </div>
              {:else}
                <div class="reset-entry">
                  <span>{entry.exact}</span>
                  <div class="reset-trailing">
                    {#if entry.relative}<small>{entry.relative}</small>{/if}
                    <button
                      class="reset-use"
                      type="button"
                      aria-label={`Use reset expiring ${entry.exact}`}
                      disabled={pendingExpiry !== null}
                      onclick={() => beginClaim(entry.expiry)}>Use</button
                    >
                  </div>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {:else if count > 0}
      <div class="reset-empty">
        <strong>{count} available</strong>
        <span>Expiry times unavailable</span>
      </div>
    {:else}
      <div class="reset-empty"><span>No rate limit resets available</span></div>
    {/if}
  </div>
</div>

<style>
  :global {
    .reset-credits-detail {
      position: fixed;
      right: 8px;
      z-index: 100;
      box-sizing: border-box;
      width: 252px;
      max-height: calc(100vh - 16px);
      overflow: hidden;
      border-top: 0.5px solid var(--rule);
      border-bottom: 0.5px solid var(--rule);
      color: var(--ink);
      animation: reset-detail-in var(--motion-measured) both;
    }

    .reset-detail-body {
      max-height: calc(100vh - 16px);
      padding: 12px 0;
      overflow-y: auto;
    }

    .reset-timeline {
      display: grid;
    }

    .reset-result {
      margin-bottom: 8px;
      padding: 8px 0;
      border-bottom: 0.5px solid var(--rule);
      color: var(--ink);
      font-size: 11px;
    }

    .reset-result-error {
      color: var(--critical);
    }

    .reset-entry-shell {
      display: grid;
      grid-template-columns: 16px minmax(0, 1fr);
      gap: 8px;
    }

    .reset-entry-content {
      min-width: 0;
      padding: 4px 0;
    }

    .reset-entry {
      display: flex;
      height: 36px;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 11px;
      line-height: 16px;
      font-variant-numeric: tabular-nums lining-nums;
    }

    .reset-entry > span {
      overflow: hidden;
      color: var(--ink);
      font-weight: 500;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .reset-trailing {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
    }

    .reset-trailing > small {
      color: var(--muted);
      font: inherit;
      font-family: var(--font-ui);
      font-variant-numeric: tabular-nums lining-nums;
      white-space: nowrap;
    }

    .reset-use,
    .reset-confirm button {
      min-height: 28px;
      padding: 0;
      border: 0;
      color: var(--ink);
      font: inherit;
      font-size: 12px;
      font-weight: 500;
      cursor: default;
      text-decoration: none;
    }

    .reset-use {
      position: static;
    }

    .reset-use:hover,
    .reset-confirm button:not([data-cta='primary']):hover {
      text-decoration: underline;
      text-underline-offset: 4px;
    }

    .reset-use:disabled,
    .reset-confirm button:disabled {
      opacity: 0.55;
    }

    .reset-confirm {
      display: grid;
      gap: 8px;
      margin: 4px 0;
      padding: 8px 0;
      border-top: 0.5px solid var(--rule);
      border-bottom: 0.5px solid var(--rule);
      font-size: 11px;
      animation: reset-confirm-in var(--motion-measured) both;
    }

    .reset-confirm > span {
      color: var(--body);
      line-height: 1.5;
    }

    .reset-confirm > div {
      display: flex;
      gap: 8px;
    }

    .reset-confirm > div > button {
      flex: 1;
    }

    .reset-confirm .reset-confirm-primary {
      padding: 0 12px;
    }

    .reset-rail {
      display: grid;
      height: 100%;
      grid-template-rows: 8px 16px 1fr;
      justify-items: center;
      align-items: center;
    }

    .reset-rail > i {
      width: 0;
      height: 100%;
      border-left: 0.5px solid var(--rule);
    }

    .reset-rail > .reset-rail-hidden {
      visibility: hidden;
    }

    .reset-node {
      display: grid;
      width: 16px;
      height: 16px;
      place-items: center;
      color: var(--muted);
      font-family: var(--font-ui);
      font-size: 11px;
      font-weight: 500;
      line-height: 1;
      font-variant-numeric: tabular-nums lining-nums;
    }

    .reset-node--warning {
      color: var(--warning);
    }

    .reset-node--critical {
      color: var(--critical);
    }

    .reset-empty {
      display: grid;
      justify-items: center;
      gap: 4px;
      padding: 12px 4px 8px;
      color: var(--muted);
      font-size: 11px;
      line-height: 1.5;
      text-align: center;
    }

    .reset-empty strong {
      color: var(--ink);
      font-weight: 500;
    }

    @keyframes reset-detail-in {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
    }

    @keyframes reset-confirm-in {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
    }
  }
</style>
