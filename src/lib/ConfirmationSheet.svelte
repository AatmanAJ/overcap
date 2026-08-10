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
    <span class="confirmation-sheet__icon"><Icon name="warning" size={20} strokeWidth={2} /></span>
    <div class="confirmation-sheet__copy">
      <h1 id="confirmation-title">{title}</h1>
      <p id="confirmation-message">{message}</p>
    </div>
    <div class="confirmation-sheet__actions">
      <button bind:this={cancelButton} type="button" disabled={pending} onclick={onCancel}
        >Cancel</button
      >
      <button
        data-cta="primary"
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
    padding: 48px 20px;
    inset: 0;
    place-items: start center;
  }

  .confirmation-sheet {
    display: grid;
    width: min(256px, 100%);
    box-sizing: border-box;
    grid-template-columns: 24px 1fr;
    gap: 0 12px;
    padding: 16px 0;
    border-top: 0.5px solid var(--rule);
    border-bottom: 0.5px solid var(--rule);
    color: var(--ink);
    animation: confirmation-sheet-in var(--motion-measured) both;
  }

  .confirmation-sheet__icon {
    display: grid;
    width: 24px;
    height: 24px;
    color: var(--critical);
    place-items: center;
  }

  .confirmation-sheet__copy {
    min-width: 0;
  }

  .confirmation-sheet h1 {
    margin: 0 0 4px;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: -0.01em;
  }

  .confirmation-sheet p {
    margin: 0;
    color: var(--body);
    font-size: 13px;
    line-height: 1.5;
  }

  .confirmation-sheet__actions {
    display: flex;
    grid-column: 1 / -1;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
  }

  .confirmation-sheet__actions button {
    min-height: 28px;
    padding: 0;
    border: 0;
    color: var(--ink);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
  }

  .confirmation-sheet__actions button:not([data-cta='primary']):hover:not(:disabled) {
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  .confirmation-sheet__actions .confirmation-sheet__confirm {
    padding: 0 12px;
  }

  .confirmation-sheet__actions button:disabled {
    cursor: default;
    opacity: 0.58;
  }

  @keyframes confirmation-sheet-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
  }
</style>
