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
  fill="none"
  stroke="currentColor"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden={decorative}
  aria-label={decorative ? undefined : 'Overcap'}
  role={decorative ? undefined : 'img'}
  focusable="false"
>
  <path d="M17.6 8.2a7.4 7.4 0 1 0 1.1 5.8" stroke-width="2.4" />
  <path class="overcap-mark__cap" d="M15.8 4.7h4.9" stroke-width="2.4" />
</svg>

<style>
  .overcap-mark {
    display: block;
    flex: 0 0 auto;
  }
</style>
