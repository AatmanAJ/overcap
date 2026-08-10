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
  <path d="M3.5 16.5A9 9 0 0 1 20.5 15" stroke-width="2.25" />
  <path d="m12 16 3.15-9.15" stroke-width="2" />
  <circle cx="12" cy="16" r="1.75" fill="currentColor" stroke="none" />
</svg>

<style>
  .overcap-mark {
    display: block;
    flex: 0 0 auto;
  }
</style>
