import { describe, expect, it } from 'vitest';
import {
  defaultNotificationThresholds,
  normalizeNotificationThresholds,
  patchNotificationThreshold,
} from './notificationThresholds';

describe('notification thresholds', () => {
  it('defaults to the Overcap 80/95/100 redline', () => {
    expect(defaultNotificationThresholds).toEqual({ warning: 80, critical: 95, capped: 100 });
  });

  it('clamps, sorts, rounds, and keeps thresholds distinct', () => {
    expect(normalizeNotificationThresholds({ warning: 100.4, critical: -2, capped: 100 })).toEqual({
      warning: 1,
      critical: 99,
      capped: 100,
    });
    expect(normalizeNotificationThresholds({ warning: 100, critical: 100, capped: 100 })).toEqual({
      warning: 98,
      critical: 99,
      capped: 100,
    });
  });

  it('normalizes edits as one ordered threshold set', () => {
    expect(patchNotificationThreshold(defaultNotificationThresholds, 'warning', 96)).toEqual({
      warning: 94,
      critical: 95,
      capped: 100,
    });
  });
});
