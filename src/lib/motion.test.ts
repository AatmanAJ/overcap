import { describe, expect, it } from 'vitest';
import {
  reorderFlip,
  SNAP_DURATION_MS,
  snapEasing,
  snapMotion,
  snapScale,
  snapSlide,
} from './motion';

describe('shared motion profile', () => {
  it('matches cubic-bezier(0.2, 0, 0, 1) without overshoot', () => {
    expect(snapEasing(0)).toBe(0);
    expect(snapEasing(0.25)).toBeCloseTo(0.60722, 5);
    expect(snapEasing(0.5)).toBeCloseTo(0.877834, 5);
    expect(snapEasing(1)).toBe(1);

    let previous = 0;
    for (let step = 0; step <= 100; step += 1) {
      const value = snapEasing(step / 100);
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(previous);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
      previous = value;
    }
  });

  it('uses the 160ms snap and jumps immediately for reduced motion', () => {
    expect(snapMotion(false)).toEqual({ duration: SNAP_DURATION_MS, easing: snapEasing });
    expect(snapMotion(true)).toEqual({ duration: 0, easing: snapEasing });
    expect(SNAP_DURATION_MS).toBe(160);
    expect(reorderFlip).toBe(snapMotion);
  });

  it('scales with transforms only and settles reduced motion at the final state', () => {
    const element = document.createElement('div');
    element.style.transform = 'translateX(2px)';

    const animated = snapScale(element, { reducedMotion: false, start: 0.95 });
    expect(animated.css?.(0, 1)).toContain('translateX(2px) scale(0.95)');
    expect(animated.css?.(1, 0)).toContain('translateX(2px) scale(1)');
    expect(animated.css?.(0.5, 0.5)).not.toContain('opacity');

    const reduced = snapScale(element, { reducedMotion: true, start: 0.95 });
    expect(reduced.duration).toBe(0);
    expect(reduced.css?.(0, 1)).toContain('translateX(2px) scale(1)');
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

    const animated = snapSlide(element, { reducedMotion: false });
    expect(animated.css?.(0, 1)).toContain('height: 0px');
    expect(animated.css?.(1, 0)).toContain('height: 40px');
    expect(animated.css?.(0.5, 0.5)).not.toContain('opacity');

    const reduced = snapSlide(element, { reducedMotion: true });
    expect(reduced.duration).toBe(0);
    expect(reduced.css?.(0, 1)).toContain('height: 40px');
  });
});
