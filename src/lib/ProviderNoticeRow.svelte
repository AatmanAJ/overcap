<script lang="ts">
  import Icon from './Icon.svelte';
  import type { ProviderNotice } from './types';

  interface Props {
    notice: ProviderNotice;
  }

  let { notice }: Props = $props();
</script>

<div
  class="provider-notice-row provider-notice-row--{notice.tone}"
  role={notice.tone === 'warning' ? 'status' : undefined}
>
  <span class="provider-notice-icon"><Icon name="warning" size={12} strokeWidth={2} /></span>
  <span class="provider-notice-copy"
    ><strong>{notice.title}</strong><small>{notice.message}</small></span
  >
</div>

<style>
  :global {
    .provider-notice-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      padding: 12px 0;
      border-top: 0.5px solid var(--rule);
      color: var(--warning);
    }

    .provider-notice-icon {
      display: grid;
      width: 24px;
      height: 24px;
      flex: 0 0 24px;
      place-items: center;
    }

    .provider-notice-copy {
      display: grid;
      min-width: 0;
      gap: 4px;
    }

    .provider-notice-copy strong {
      color: var(--ink);
      font-size: 12px;
      font-weight: 500;
      line-height: 16px;
    }

    .provider-notice-copy small {
      color: var(--body);
      font-size: 11px;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }
  }
</style>
