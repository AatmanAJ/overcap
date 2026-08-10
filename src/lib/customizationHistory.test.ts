import { describe, expect, it } from 'vitest';
import { settingsState } from '../test/appFixtures';
import { restoreCustomization } from './customizationHistory';

describe('customization history', () => {
  it('restores layout and provider thresholds without reverting a later card rename', () => {
    const previous = structuredClone(settingsState.settings);
    const current = structuredClone(settingsState.settings);
    previous.providerNotificationThresholds.codex = { warning: 70, critical: 90, capped: 100 };
    current.providerNames.codex = 'Work';
    current.providers[0].metrics.reverse();

    const restored = restoreCustomization(current, previous);

    expect(restored.providerNames).toEqual({ codex: 'Work' });
    expect(restored.providers).toEqual(previous.providers);
    expect(restored.providerNotificationThresholds).toEqual(
      previous.providerNotificationThresholds,
    );
  });
});
