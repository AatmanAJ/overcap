<script lang="ts">
  import { onMount } from 'svelte';
  import { deleteProviderApiKey, getProviderApiKeyState, saveProviderApiKey } from './backend';
  import Icon from './Icon.svelte';
  import ProviderIcon from './ProviderIcon.svelte';
  import type { ApiKeyStatus, ProviderApiKeyState } from './types';

  interface Props {
    providerId: string;
    providerName: string;
  }

  let { providerId, providerName }: Props = $props();
  let credentialState = $state<ProviderApiKeyState | null>(null);
  let supported = $state<boolean | null>(null);
  let open = $state(false);
  let overrideExternal = $state(false);
  let apiKey = $state('');
  let revealInput = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);
  let availabilityError = $state<string | null>(null);
  const status = $derived<ApiKeyStatus>(credentialState?.status ?? 'notSet');
  const editable = $derived(status === 'notSet' || overrideExternal);
  const canClear = $derived(status === 'saved' || status === 'overrideActive');
  const sourceLabel = $derived(
    status === 'fromEnvironment'
      ? 'From Your Environment'
      : status === 'fromConfig'
        ? 'From Config File'
        : status === 'saved'
          ? 'Saved securely'
          : status === 'overrideActive'
            ? 'Custom Key'
            : '',
  );

  function errorMessage(cause: unknown, fallback: string) {
    if (typeof cause === 'string') return cause;
    if (cause instanceof Error && cause.message) return cause.message;
    return fallback;
  }

  function displayValue(node: HTMLInputElement, value: string) {
    node.value = value;
    return {
      update(next: string) {
        node.value = next;
      },
    };
  }

  function resetEditor() {
    overrideExternal = false;
    apiKey = '';
    revealInput = false;
    error = null;
  }

  function toggleOpen() {
    open = !open;
    if (open) resetEditor();
  }

  async function save() {
    const value = apiKey.trim();
    if (!value || saving) return;
    saving = true;
    error = null;
    try {
      credentialState = await saveProviderApiKey(providerId, value);
      availabilityError = null;
      resetEditor();
    } catch (cause) {
      error = errorMessage(cause, "Couldn't save that API key.");
    } finally {
      saving = false;
    }
  }

  async function remove() {
    if (saving) return;
    saving = true;
    error = null;
    try {
      credentialState = await deleteProviderApiKey(providerId);
      availabilityError = null;
      resetEditor();
    } catch (cause) {
      error = errorMessage(cause, "Couldn't remove that API key.");
    } finally {
      saving = false;
    }
  }

  onMount(() => {
    void getProviderApiKeyState(providerId)
      .then((next) => {
        supported = next !== null;
        credentialState = next;
      })
      .catch((cause) => {
        supported = true;
        availabilityError = errorMessage(cause, "Couldn't reach the system credential store.");
      });
  });
</script>

{#if supported}
  <section class="api-key-section" aria-label={`${providerName} API Key`}>
    <h2 class="section-label">API key</h2>
    <div class="api-key-card">
      <div class="api-key-summary">
        <ProviderIcon {providerId} size={20} />
        <span class="api-key-provider">{providerName}</span>
        <i class:missing={status === 'notSet'} aria-hidden="true"></i>
        <button type="button" onclick={toggleOpen}
          >{open ? 'Done' : status === 'notSet' ? 'Add' : 'Edit'}</button
        >
      </div>
      {#if availabilityError}
        <div class="api-key-error availability-error" role="alert">{availabilityError}</div>
      {/if}
      {#if open}
        <div class="api-key-editor">
          {#key `${status}:${editable}`}
            {#if editable}
              <div class="api-key-input">
                <input
                  type={revealInput ? 'text' : 'password'}
                  bind:value={apiKey}
                  autocomplete="off"
                  spellcheck="false"
                  placeholder="Paste API key"
                  aria-label={`${providerName} API key`}
                  disabled={saving}
                />
                <button
                  class="field-icon"
                  type="button"
                  aria-label={revealInput ? 'Hide API key' : 'Show API key'}
                  onclick={() => (revealInput = !revealInput)}
                >
                  <Icon name={revealInput ? 'eye-off' : 'eye'} size={16} />
                </button>
              </div>
              <div class="api-key-actions">
                <button
                  data-cta="primary"
                  class="primary"
                  type="button"
                  disabled={!apiKey.trim() || saving}
                  onclick={save}><span>{saving ? 'Saving…' : 'Save'}</span></button
                >
                {#if overrideExternal}
                  <button type="button" disabled={saving} onclick={resetEditor}>Cancel</button>
                {/if}
              </div>
            {:else}
              <div class="api-key-input api-key-readonly">
                {#if canClear}
                  <button
                    class="field-icon clear-icon"
                    type="button"
                    disabled={saving}
                    aria-label={saving ? 'Removing saved API key…' : 'Remove saved API key'}
                    title="Remove saved API key"
                    onclick={remove}
                  >
                    <Icon name="clear-filled" size={16} strokeWidth={1.8} />
                  </button>
                {/if}
                <input
                  class="api-key-source-field"
                  type="text"
                  use:displayValue={sourceLabel}
                  aria-label={`${providerName} API key source`}
                  disabled
                />
              </div>
              {#if status === 'fromEnvironment' || status === 'fromConfig'}
                <label class="api-key-override">
                  <input type="checkbox" bind:checked={overrideExternal} disabled={saving} />
                  Override With a Custom Key
                </label>
              {/if}
            {/if}
          {/key}
          {#if error}<div class="api-key-error" role="alert">{error}</div>{/if}
        </div>
      {/if}
    </div>
  </section>
{/if}

<style>
  .api-key-section {
    margin-bottom: 24px;
  }

  .api-key-summary {
    display: flex;
    min-height: 36px;
    align-items: center;
    gap: 8px;
    padding: 0;
  }

  .api-key-provider {
    min-width: 0;
    flex: 1;
    color: var(--ink);
    font-size: 12px;
    font-weight: 400;
  }

  .api-key-summary i {
    width: 0;
    height: 8px;
    border-left: 2px solid var(--ink);
  }

  .api-key-summary i.missing {
    border-color: var(--critical);
  }

  button {
    padding: 0;
    border: 0;
    color: var(--ink);
    font-size: 12px;
    font-weight: 500;
    text-decoration: none;
  }

  button:not([data-cta='primary']):hover {
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  .api-key-editor {
    display: grid;
    gap: 12px;
    padding: 12px 0;
    border-top: 0.5px solid var(--rule);
  }

  .api-key-input {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .api-key-input input {
    min-width: 0;
    height: 36px;
    flex: 1;
    padding: 0;
    border: 0;
    border-bottom: 0.5px solid var(--rule);
    color: var(--ink);
    font: inherit;
    font-size: 11px;
    outline: none;
  }

  .api-key-source-field:disabled {
    opacity: 1;
    color: var(--muted);
    -webkit-text-fill-color: var(--muted);
  }

  .api-key-input input:focus {
    border-color: var(--ink);
    outline: 0;
  }

  .api-key-input .field-icon {
    display: grid;
    width: 28px;
    height: 28px;
    padding: 0;
    color: var(--muted);
    place-items: center;
  }

  .api-key-actions {
    display: flex;
    justify-self: start;
    align-items: center;
    gap: 8px;
  }

  .api-key-actions button {
    min-height: 28px;
    padding: 0;
  }

  .api-key-readonly {
    gap: 4px;
  }

  .api-key-actions .primary {
    min-width: 56px;
    padding-inline: 12px;
  }

  .api-key-readonly .clear-icon {
    width: 20px;
    height: 20px;
    flex: 0 0 20px;
    padding: 0;
  }

  .api-key-override {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--muted);
    font-size: 11px;
  }

  .api-key-error {
    padding: 8px 0;
    border-top: 0.5px solid var(--rule);
    color: var(--critical);
    font-size: 11px;
  }

  .availability-error {
    margin: 0 0 12px;
  }
</style>
