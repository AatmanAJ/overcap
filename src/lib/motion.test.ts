import { describe, expect, it } from 'vitest';
import { measuredEasing, measuredMotion, measuredReveal, MEASURED_DURATION_MS } from './motion';

describe('shared motion profile', () => {
  it('matches cubic-bezier(0.4, 0, 0.2, 1) without overshoot', () => {
    expect(measuredEasing(0)).toBe(0);
    expect(measuredEasing(0.25)).toBeCloseTo(0.236587, 5);
    expect(measuredEasing(0.5)).toBeCloseTo(0.775561, 5);
    expect(measuredEasing(1)).toBe(1);

    let previous = 0;
    for (let step = 0; step <= 100; step += 1) {
      const value = measuredEasing(step / 100);
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(previous);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
      previous = value;
    }
  });

  it('uses the 200ms measured profile and jumps immediately for reduced motion', () => {
    expect(measuredMotion(false)).toEqual({
      duration: MEASURED_DURATION_MS,
      easing: measuredEasing,
    });
    expect(measuredMotion(true)).toEqual({ duration: 0, easing: measuredEasing });
    expect(MEASURED_DURATION_MS).toBe(200);
  });

  it('reveals height without Svelte slide opacity and settles reduced motion immediately', () => {
    const element = document.createElement('div');
    Object.assign(element.style, {
      height: '40px',
      paddingTop: '4px',
      paddingBottom: '6px',
      marginTop: '2px',
      marginBottom: '3px',
      borderTopWidth: '1px',
      borderBottomWidth: '2px',
    });

    const animated = measuredReveal(element, { reducedMotion: false });
    expect(animated.css?.(0, 1)).toContain('height: 0px');
    expect(animated.css?.(1, 0)).toContain('height: 40px');
    expect(animated.css?.(0.5, 0.5)).not.toContain('opacity');

    const reduced = measuredReveal(element, { reducedMotion: true });
    expect(reduced.duration).toBe(0);
    expect(reduced.css?.(0, 1)).toContain('height: 40px');
  });
});
