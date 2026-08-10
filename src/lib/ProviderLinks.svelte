<script lang="ts">
  import Icon from './Icon.svelte';
  import type { ProviderLink } from './types';

  interface Props {
    links: ProviderLink[];
    onOpen: (linkIndex: number) => void;
  }

  let { links, onOpen }: Props = $props();
  const columns = $derived(Math.min(3, Math.max(1, links.length)));
</script>

<div class="provider-links" style={`--provider-link-columns: ${columns}`}>
  {#each links as link, linkIndex (`${link.label}:${link.url}`)}
    <button
      type="button"
      aria-label={`${link.label}, opens in browser`}
      onclick={() => onOpen(linkIndex)}
    >
      <span>{link.label}</span><Icon name="external-link" size={12} strokeWidth={2} />
    </button>
  {/each}
</div>

<style>
  .provider-links {
    display: grid;
    grid-template-columns: repeat(var(--provider-link-columns), minmax(0, 1fr));
    gap: 0 12px;
    padding: 0;
  }

  button {
    display: flex;
    min-width: 0;
    min-height: 36px;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 0;
    border: 0;
    border-top: 0.5px solid var(--rule);
    color: var(--ink);
    font: inherit;
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
  }

  button:hover {
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  button:focus-visible {
    outline: 1px solid color-mix(in srgb, var(--ink) 64%, transparent);
    outline-offset: 4px;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
