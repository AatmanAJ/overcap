import type { EasingFunction, TransitionConfig } from 'svelte/transition';

interface PageTransitionOptions {
  direction: number;
  duration: number;
  easing: EasingFunction;
}

type AppScreen = 'dashboard' | 'customize' | 'settings' | `provider:${string}`;
const PAGE_SLIDE_DISTANCE_PX = 6;

export function shouldSlideBetweenScreens(from: AppScreen, to: AppScreen) {
  return from !== to;
}

export function horizontalPageTransition(
  _node: Element,
  { direction, duration, easing }: PageTransitionOptions,
): TransitionConfig {
  const distance = PAGE_SLIDE_DISTANCE_PX * direction;
  return {
    duration,
    easing,
    css: (progress) => {
      const settledProgress = duration === 0 ? 1 : progress;
      return `transform: translate3d(${(1 - settledProgress) * distance}px, 0, 0);`;
    },
  };
}
