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
    gap: 6px;
    padding: 9px 10px;
    border-top: 1px solid var(--separator);
  }

  label {
    display: grid;
    gap: 4px;
    color: var(--secondary);
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.2px;
  }

  .threshold-input {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    border: 1px solid var(--surface-border);
    border-radius: 7px;
    color: var(--secondary);
    background: var(--tray);
  }

  input {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding: 6px 2px 6px 7px;
    border: 0;
    outline: none;
    color: var(--text);
    background: transparent;
    font: inherit;
    font-size: 10px;
    font-variant-numeric: tabular-nums;
  }

  .threshold-input > span {
    padding-right: 7px;
  }

  .threshold-input:focus-within {
    outline: 1px solid var(--text);
    outline-offset: 1px;
  }
</style>
