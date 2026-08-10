<script lang="ts">
  import type { ProviderCatalogIndex } from './metrics';
  import { withProviderName } from './providerNames';
  import type { AppSettings, ProviderLayout } from './types';

  interface Props {
    settings: AppSettings;
    provider: ProviderLayout;
    catalog: ProviderCatalogIndex;
    onChange: (settings: AppSettings) => void;
  }

  let { settings, provider, catalog, onChange }: Props = $props();
  let draft = $state('');
  let focused = $state(false);
  const defaultName = $derived(catalog.displayName(provider.id));

  $effect(() => {
    if (!focused) draft = settings.providerNames[provider.id] ?? '';
  });

  function commit() {
    const changed = withProviderName(settings, provider.id, draft);
    if (changed !== settings) onChange(changed);
  }

  function cancel(input: HTMLInputElement) {
    draft = settings.providerNames[provider.id] ?? '';
    input.blur();
  }
</script>

<section class="provider-name-section" aria-labelledby={`provider-name-title-${provider.id}`}>
  <h2 class="section-label" id={`provider-name-title-${provider.id}`}>Name</h2>
  <div class="provider-name-card">
    <input
      type="text"
      maxlength="48"
      bind:value={draft}
      placeholder={defaultName}
      aria-label={`Name for ${defaultName}`}
      autocomplete="off"
      onfocus={() => (focused = true)}
      onblur={() => {
        commit();
        focused = false;
      }}
      onkeydown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          cancel(event.currentTarget);
        }
      }}
    />
  </div>
</section>

<style>
  .provider-name-section {
    margin-bottom: 24px;
  }

  input {
    display: block;
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
    font-family: var(--font-ui);
    font-size: 13px;
  }

  input::placeholder {
    color: var(--muted);
    opacity: 1;
  }

  input:focus {
    border-color: var(--ink);
  }
</style>
