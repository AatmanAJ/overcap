<script lang="ts">
  import overcapMark from '../assets/overcap-mark.png';

  interface Props {
    size?: number;
    decorative?: boolean;
  }

  let { size = 18, decorative = true }: Props = $props();
</script>

<img
  src={overcapMark}
  width={size}
  height={size}
  alt={decorative ? '' : 'Overcap'}
  aria-hidden={decorative}
  draggable="false"
/>

<style>
  img {
    display: block;
    object-fit: contain;
  }
</style>
