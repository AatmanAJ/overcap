<script lang="ts">
  import { onMount, tick } from 'svelte';

  interface Props {
    initialValue: string;
    onRename: (name: string) => void;
    onCancel: () => void;
  }

  let { initialValue, onRename, onCancel }: Props = $props();
  let draft = $state('');
  let sheet = $state<HTMLElement>();
  let input = $state<HTMLInputElement>();

  onMount(() => {
    draft = initialValue;
    void tick().then(() => {
      input?.focus();
      input?.select();
    });
  });

  function handleKeydown(event: KeyboardEvent) {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key !== 'Tab' || !sheet) return;
    const controls = [
      ...sheet.querySelectorAll<HTMLElement>('input:not(:disabled), button:not(:disabled)'),
    ];
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
  class="rename-backdrop"
  role="presentation"
  onpointerdown={(event) => event.stopPropagation()}
  onclick={(event) => event.stopPropagation()}
  onkeydown={handleKeydown}
>
  <div
    class="rename-sheet"
    bind:this={sheet}
    role="dialog"
    aria-modal="true"
    aria-labelledby="rename-title"
    aria-describedby="rename-message"
  >
    <form
      onsubmit={(event) => {
        event.preventDefault();
        onRename(draft);
      }}
    >
      <h1 id="rename-title">Rename Card</h1>
      <input
        bind:this={input}
        bind:value={draft}
        type="text"
        maxlength="48"
        placeholder="Name"
        aria-label="Name"
      />
      <p id="rename-message">Leave the name empty to go back to the default.</p>
      <div class="rename-sheet__actions">
        <button type="button" onclick={onCancel}>Cancel</button>
        <button class="rename-sheet__confirm" type="submit"><span>Rename</span></button>
      </div>
    </form>
  </div>
</div>

<style>
  .rename-backdrop {
    position: absolute;
    z-index: 120;
    display: grid;
    padding: 48px 18px 18px;
    background: color-mix(in srgb, var(--ink) 24%, transparent);
    inset: 0;
    place-items: start center;
  }

  .rename-sheet {
    width: min(252px, 100%);
    box-sizing: border-box;
    padding: 17px;
    border: 1px solid color-mix(in srgb, var(--text) 24%, transparent);
    border-radius: 15px;
    color: var(--text);
    background: var(--tray);
    box-shadow: var(--hard-shadow);
    animation: rename-sheet-in var(--motion-snap) both;
  }

  form {
    display: grid;
    gap: 10px;
  }

  h1 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  input {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding: 7px 9px;
    border: 1px solid var(--separator);
    border-radius: 8px;
    outline: none;
    color: var(--text);
    background: var(--card);
    font: inherit;
    font-size: 12px;
  }

  input:focus {
    border-color: color-mix(in srgb, var(--text) 65%, transparent);
    outline: 1px solid color-mix(in srgb, var(--text) 24%, transparent);
    outline-offset: 1px;
  }

  p {
    margin: -2px 0 0;
    color: var(--secondary);
    font-size: 11px;
    line-height: 15px;
  }

  .rename-sheet__actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 6px;
  }

  .rename-sheet__actions button {
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
  }

  .rename-sheet__actions button:hover {
    background: color-mix(in srgb, var(--text) 11%, var(--tray));
  }

  .rename-sheet__actions button:active {
    transform: scale(0.97);
  }

  .rename-sheet__actions button:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--text) 65%, transparent);
    outline-offset: 2px;
  }

  .rename-sheet__actions .rename-sheet__confirm {
    position: relative;
    overflow: hidden;
    border-color: color-mix(in srgb, var(--action-text) 24%, transparent);
    color: var(--action-text);
    background: var(--action-fill);
  }

  .rename-sheet__confirm::before {
    position: absolute;
    background: var(--action-hover);
    content: '';
    inset: 0;
    transform: scaleX(0);
    transform-origin: left;
    transition: transform var(--motion-switch);
  }

  .rename-sheet__confirm > span {
    position: relative;
  }

  .rename-sheet__actions .rename-sheet__confirm:hover::before {
    transform: scaleX(1);
  }

  @keyframes rename-sheet-in {
    from {
      transform: translateY(-6px);
    }
  }

  :global(:root[data-reduced-motion]) .rename-sheet__confirm::before {
    transition: none;
  }
</style>
