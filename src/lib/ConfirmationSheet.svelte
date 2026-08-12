<script lang="ts">
  import { onMount, tick } from 'svelte';
  import Icon from './Icon.svelte';

  interface Props {
    title: string;
    message: string;
    confirmLabel: string;
    pending?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  }

  let { title, message, confirmLabel, pending = false, onConfirm, onCancel }: Props = $props();
  let sheet = $state<HTMLElement>();
  let cancelButton = $state<HTMLButtonElement>();

  onMount(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    void tick().then(() => cancelButton?.focus());
    return () => previousFocus?.focus();
  });

  function handleKeydown(event: KeyboardEvent) {
    event.stopPropagation();
    if (event.key === 'Escape' && !pending) {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key !== 'Tab' || !sheet) return;
    const controls = [...sheet.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
    if (controls.length === 0) return;
    const first = controls[0];
    const last = controls.at(-1)!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
</script>

<div
  class="confirmation-backdrop"
  role="presentation"
  onpointerdown={(event) => event.stopPropagation()}
  onkeydown={handleKeydown}
>
  <div
    class="confirmation-sheet"
    bind:this={sheet}
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="confirmation-title"
    aria-describedby="confirmation-message"
  >
    <span class="confirmation-sheet__icon"><Icon name="warning" size={18} strokeWidth={1.9} /></span
    >
    <div class="confirmation-sheet__copy">
      <h1 id="confirmation-title">{title}</h1>
      <p id="confirmation-message">{message}</p>
    </div>
    <div class="confirmation-sheet__actions">
      <button bind:this={cancelButton} type="button" disabled={pending} onclick={onCancel}
        >Cancel</button
      >
      <button
        class="confirmation-sheet__confirm"
        type="button"
        disabled={pending}
        onclick={onConfirm}><span>{pending ? 'Resetting…' : confirmLabel}</span></button
      >
    </div>
  </div>
</div>

<style>
  .confirmation-backdrop {
    position: absolute;
    z-index: 120;
    display: grid;
    padding: 48px 18px 18px;
    background: color-mix(in srgb, var(--ink) 24%, transparent);
    inset: 0;
    place-items: start center;
  }

  .confirmation-sheet {
    display: grid;
    width: min(252px, 100%);
    box-sizing: border-box;
    grid-template-columns: 30px 1fr;
    gap: 0 10px;
    padding: 17px;
    border: 1px solid color-mix(in srgb, var(--text) 24%, transparent);
    border-radius: 15px;
    color: var(--text);
    background: var(--tray);
    box-shadow: var(--hard-shadow);
    animation: confirmation-sheet-in var(--motion-snap) both;
  }

  .confirmation-sheet__icon {
    display: grid;
    width: 30px;
    height: 30px;
    border-radius: 9px;
    color: var(--meter-critical);
    background: color-mix(in srgb, var(--meter-critical) 13%, transparent);
    place-items: center;
  }

  .confirmation-sheet__copy {
    min-width: 0;
    padding-top: 1px;
  }

  .confirmation-sheet h1 {
    margin: 0 0 5px;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .confirmation-sheet p {
    margin: 0;
    color: var(--secondary);
    font-size: 11px;
    line-height: 15px;
  }

  .confirmation-sheet__actions {
    display: flex;
    grid-column: 1 / -1;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
  }

  .confirmation-sheet__actions button {
    min-width: 76px;
    min-height: 31px;
    padding: 6px 12px;
    border: 1px solid color-mix(in srgb, var(--text) 9%, transparent);
    border-radius: 999px;
    color: var(--text);
    background: color-mix(in srgb, var(--text) 7%, var(--tray));
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition:
      background-color 120ms ease,
      border-color 120ms ease,
      transform var(--motion-switch);
  }

  .confirmation-sheet__actions button:hover:not(:disabled) {
    background: color-mix(in srgb, var(--text) 11%, var(--tray));
  }

  .confirmation-sheet__actions button:active:not(:disabled) {
    transform: scale(0.97);
  }

  .confirmation-sheet__actions button:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--text) 65%, transparent);
    outline-offset: 2px;
  }

  .confirmation-sheet__actions .confirmation-sheet__confirm {
    position: relative;
    overflow: hidden;
    border-color: color-mix(in srgb, var(--action-text) 24%, transparent);
    color: var(--action-text);
    background: var(--action-fill);
  }

  .confirmation-sheet__confirm::before {
    position: absolute;
    background: var(--action-hover);
    content: '';
    inset: 0;
    transform: scaleX(0);
    transform-origin: left;
    transition: transform var(--motion-switch);
  }

  .confirmation-sheet__confirm > span {
    position: relative;
  }

  .confirmation-sheet__actions .confirmation-sheet__confirm:hover:not(:disabled)::before {
    transform: scaleX(1);
  }

  .confirmation-sheet__actions button:disabled {
    cursor: default;
    opacity: 0.58;
  }

  @keyframes confirmation-sheet-in {
    from {
      transform: translateY(-6px);
    }
  }

  :global(:root[data-reduced-motion]) .confirmation-sheet__confirm::before {
    transition: none;
  }
</style>
