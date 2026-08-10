import type { TransitionConfig } from 'svelte/transition';

export const MEASURED_DURATION_MS = 200;

const MEASURED_X1 = 0.4;
const MEASURED_Y1 = 0;
const MEASURED_X2 = 0.2;
const MEASURED_Y2 = 1;
const NEWTON_ITERATIONS = 8;
const BISECTION_ITERATIONS = 14;
const SOLVER_EPSILON = 1e-7;

function cubicCoordinate(progress: number, firstControl: number, secondControl: number) {
  const inverse = 1 - progress;
  return (
    3 * inverse * inverse * progress * firstControl +
    3 * inverse * progress * progress * secondControl +
    progress * progress * progress
  );
}

function cubicDerivative(progress: number, firstControl: number, secondControl: number) {
  const inverse = 1 - progress;
  return (
    3 * inverse * inverse * firstControl +
    6 * inverse * progress * (secondControl - firstControl) +
    3 * progress * progress * (1 - secondControl)
  );
}

function curveProgressForTime(time: number) {
  let progress = time;

  for (let iteration = 0; iteration < NEWTON_ITERATIONS; iteration += 1) {
    const error = cubicCoordinate(progress, MEASURED_X1, MEASURED_X2) - time;
    if (Math.abs(error) <= SOLVER_EPSILON) return progress;
    const derivative = cubicDerivative(progress, MEASURED_X1, MEASURED_X2);
    if (Math.abs(derivative) <= SOLVER_EPSILON) break;
    const candidate = progress - error / derivative;
    if (candidate < 0 || candidate > 1) break;
    progress = candidate;
  }

  let lower = 0;
  let upper = 1;
  progress = time;
  for (let iteration = 0; iteration < BISECTION_ITERATIONS; iteration += 1) {
    const position = cubicCoordinate(progress, MEASURED_X1, MEASURED_X2);
    if (Math.abs(position - time) <= SOLVER_EPSILON) break;
    if (position < time) lower = progress;
    else upper = progress;
    progress = (lower + upper) / 2;
  }
  return progress;
}

/** JavaScript equivalent of CSS cubic-bezier(0.4, 0, 0.2, 1). */
export function measuredEasing(progress: number) {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;
  return cubicCoordinate(curveProgressForTime(progress), MEASURED_Y1, MEASURED_Y2);
}

export function measuredMotion(reducedMotion: boolean) {
  return {
    duration: reducedMotion ? 0 : MEASURED_DURATION_MS,
    easing: measuredEasing,
  };
}

interface MeasuredRevealOptions {
  reducedMotion: boolean;
}

/** Expands supporting detail using the same measured profile, with no scale or colour tween. */
export function measuredReveal(
  node: Element,
  { reducedMotion }: MeasuredRevealOptions,
): TransitionConfig {
  const style = getComputedStyle(node);
  const height = Number.parseFloat(style.height);
  const paddingTop = Number.parseFloat(style.paddingTop);
  const paddingBottom = Number.parseFloat(style.paddingBottom);
  const marginTop = Number.parseFloat(style.marginTop);
  const marginBottom = Number.parseFloat(style.marginBottom);
  const borderTopWidth = Number.parseFloat(style.borderTopWidth);
  const borderBottomWidth = Number.parseFloat(style.borderBottomWidth);
  const motion = measuredMotion(reducedMotion);

  return {
    ...motion,
    css: (progress) => {
      const settledProgress = reducedMotion ? 1 : progress;
      return (
        'overflow: hidden;' +
        `height: ${settledProgress * height}px;` +
        `padding-top: ${settledProgress * paddingTop}px;` +
        `padding-bottom: ${settledProgress * paddingBottom}px;` +
        `margin-top: ${settledProgress * marginTop}px;` +
        `margin-bottom: ${settledProgress * marginBottom}px;` +
        `border-top-width: ${settledProgress * borderTopWidth}px;` +
        `border-bottom-width: ${settledProgress * borderBottomWidth}px;` +
        'min-height: 0;'
      );
    },
  };
}
