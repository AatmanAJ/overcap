import { describe, expect, it } from 'vitest';
import appSource from '../App.svelte?raw';
import { snapMotion } from './motion';
import { horizontalPageTransition, shouldSlideBetweenScreens } from './pageTransition';

describe('page transition', () => {
  function page() {
    return document.createElement('div');
  }

  it('moves the incoming page by exactly 6px without fading content', () => {
    const transition = horizontalPageTransition(page(), {
      direction: 1,
      ...snapMotion(false),
    });
    expect(transition.duration).toBe(160);
    expect(transition.css?.(0, 1)).toContain('translate3d(6px, 0, 0)');
    expect(transition.css?.(1, 0)).toContain('translate3d(0px, 0, 0)');
    expect(transition.css?.(0.5, 0.5)).not.toContain('opacity');
  });

  it('honors reverse navigation direction', () => {
    const transition = horizontalPageTransition(page(), {
      direction: -1,
      ...snapMotion(false),
    });
    expect(transition.css?.(0, 1)).toContain('translate3d(-6px, 0, 0)');
  });

  it('jumps to the settled transform under reduced motion', () => {
    const transition = horizontalPageTransition(page(), {
      direction: 1,
      ...snapMotion(true),
    });
    expect(transition.duration).toBe(0);
    expect(transition.css?.(0, 1)).toContain('translate3d(0px, 0, 0)');
  });

  it('hard-cuts the outgoing keyed screen instead of retaining it for an outro', () => {
    expect(appSource).toContain('in:horizontalPageTransition');
    expect(appSource).not.toContain('out:horizontalPageTransition');
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
