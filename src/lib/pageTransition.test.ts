import { describe, expect, it } from 'vitest';
import appSource from '../App.svelte?raw';
import { measuredMotion } from './motion';
import { horizontalPageTransition, shouldSlideBetweenScreens } from './pageTransition';

describe('page transition', () => {
  function page() {
    return document.createElement('div');
  }

  it('moves the incoming page by exactly 4px while fading it in', () => {
    const transition = horizontalPageTransition(page(), {
      direction: 1,
      ...measuredMotion(false),
    });
    expect(transition.duration).toBe(200);
    expect(transition.css?.(0, 1)).toContain('translate3d(4px, 0, 0)');
    expect(transition.css?.(0, 1)).toContain('opacity: 0');
    expect(transition.css?.(1, 0)).toContain('translate3d(0px, 0, 0)');
    expect(transition.css?.(1, 0)).toContain('opacity: 1');
  });

  it('honors reverse navigation direction', () => {
    const transition = horizontalPageTransition(page(), {
      direction: -1,
      ...measuredMotion(false),
    });
    expect(transition.css?.(0, 1)).toContain('translate3d(-4px, 0, 0)');
  });

  it('jumps to the settled transform under reduced motion', () => {
    const transition = horizontalPageTransition(page(), {
      direction: 1,
      ...measuredMotion(true),
    });
    expect(transition.duration).toBe(0);
    expect(transition.css?.(0, 1)).toContain('translate3d(0px, 0, 0)');
    expect(transition.css?.(0, 1)).toContain('opacity: 1');
  });

  it('uses the same measured translate-and-opacity profile for incoming and outgoing screens', () => {
    expect(appSource).toContain('in:horizontalPageTransition');
    expect(appSource).toContain('out:horizontalPageTransition');
    expect(appSource).toContain('direction: -slideDirection');
  });

  it('slides every navigation inside the stable user-sized panel', () => {
    expect(shouldSlideBetweenScreens('dashboard', 'settings')).toBe(true);
    expect(shouldSlideBetweenScreens('settings', 'dashboard')).toBe(true);
    expect(shouldSlideBetweenScreens('dashboard', 'customize')).toBe(true);
    expect(shouldSlideBetweenScreens('customize', 'provider:codex')).toBe(true);
    expect(shouldSlideBetweenScreens('provider:codex', 'dashboard')).toBe(true);
    expect(shouldSlideBetweenScreens('dashboard', 'dashboard')).toBe(false);
  });
});
