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
      <h1 id="rename-title">Rename provider</h1>
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
        <button data-cta="primary" class="rename-sheet__confirm" type="submit"
          ><span>Rename</span></button
        >
      </div>
    </form>
  </div>
</div>

<style>
  .rename-backdrop {
    position: absolute;
    z-index: 120;
    display: grid;
    padding: 48px 20px;
    inset: 0;
    place-items: start center;
  }

  .rename-sheet {
    width: min(256px, 100%);
    box-sizing: border-box;
    padding: 16px 0;
    border-top: 0.5px solid var(--rule);
    border-bottom: 0.5px solid var(--rule);
    color: var(--ink);
    animation: rename-sheet-in var(--motion-measured) both;
  }

  form {
    display: grid;
    gap: 12px;
  }

  h1 {
    margin: 0;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: -0.01em;
  }

  input {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    height: 36px;
    padding: 0;
    border: 0;
    border-bottom: 0.5px solid var(--rule);
    outline: none;
    color: var(--ink);
    font: inherit;
    font-size: 12px;
  }

  input:focus {
    border-color: var(--ink);
    outline: 0;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.5;
  }

  .rename-sheet__actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 4px;
  }

  .rename-sheet__actions button {
    min-height: 28px;
    padding: 0;
    border: 0;
    color: var(--ink);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
  }

  .rename-sheet__actions button:not([data-cta='primary']):hover {
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  .rename-sheet__actions .rename-sheet__confirm {
    padding: 0 12px;
  }

  @keyframes rename-sheet-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
  }
</style>
