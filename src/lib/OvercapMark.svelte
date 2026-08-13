<script lang="ts">
  interface Props {
    size?: number;
    decorative?: boolean;
  }

  let { size = 18, decorative = true }: Props = $props();
</script>

<svg
  class="overcap-mark"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  aria-hidden={decorative}
  aria-label={decorative ? undefined : 'Overcap'}
  role={decorative ? undefined : 'img'}
  focusable="false"
>
  <path
    class="overcap-mark__ring"
    fill="currentColor"
    fill-rule="evenodd"
    d="M10.5 3.75a7.25 7.25 0 1 0 0 14.5a7.25 7.25 0 1 0 0-14.5Zm0 2.45a4.8 4.8 0 1 1 0 9.6a4.8 4.8 0 1 1 0-9.6Z"
  />
  <rect class="overcap-mark__cap" x="13.2" y="4" width="5.8" height="2.25" rx="1.125" />
</svg>

<style>
  .overcap-mark {
    display: block;
    flex: 0 0 auto;
  }

  .overcap-mark__cap {
    fill: var(--signal);
  }
</style>
