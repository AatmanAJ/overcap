<script lang="ts">
  import { patchNotificationThreshold } from './notificationThresholds';
  import type { NotificationThresholds } from './types';

  interface Props {
    thresholds: NotificationThresholds;
    label: string;
    onChange: (thresholds: NotificationThresholds) => void;
  }

  let { thresholds, label, onChange }: Props = $props();

  function change(key: keyof NotificationThresholds, value: number) {
    if (Number.isFinite(value)) onChange(patchNotificationThreshold(thresholds, key, value));
  }
</script>

<div class="threshold-controls" role="group" aria-label={label}>
  <label>
    <span>First</span>
    <span class="threshold-input">
      <input
        type="number"
        min="1"
        max={thresholds.critical - 1}
        value={thresholds.warning}
        aria-label={`${label} first threshold`}
        onchange={(event) => change('warning', event.currentTarget.valueAsNumber)}
      /><span aria-hidden="true">%</span>
    </span>
  </label>
  <label>
    <span>Redline</span>
    <span class="threshold-input">
      <input
        type="number"
        min={thresholds.warning + 1}
        max={thresholds.capped - 1}
        value={thresholds.critical}
        aria-label={`${label} redline threshold`}
        onchange={(event) => change('critical', event.currentTarget.valueAsNumber)}
      /><span aria-hidden="true">%</span>
    </span>
  </label>
  <label>
    <span>Cap</span>
    <span class="threshold-input">
      <input
        type="number"
        min={thresholds.critical + 1}
        max="100"
        value={thresholds.capped}
        aria-label={`${label} cap threshold`}
        onchange={(event) => change('capped', event.currentTarget.valueAsNumber)}
      /><span aria-hidden="true">%</span>
    </span>
  </label>
</div>

<style>
  .threshold-controls {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    padding: 12px 0;
    border-top: 0.5px solid var(--rule);
  }

  label {
    display: grid;
    gap: 4px;
    color: var(--muted);
    font-family: var(--font-ui);
    font-size: 11px;
    font-variant-numeric: tabular-nums lining-nums;
  }

  .threshold-input {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    border-bottom: 0.5px solid var(--rule);
    color: var(--muted);
    font-variant-numeric: tabular-nums lining-nums;
  }

  input {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    height: 28px;
    padding: 4px 0;
    border: 0;
    outline: none;
    color: var(--ink);
    font: inherit;
    font-size: 12px;
    font-variant-numeric: tabular-nums lining-nums;
  }

  .threshold-input > span {
    padding-right: 4px;
  }

  .threshold-input:focus-within {
    border-color: var(--ink);
    outline: 0;
  }
</style>
