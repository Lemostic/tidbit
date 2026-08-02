export const motionDur = 0.26;
export const motionDurFast = 0.13;
export const motionDurSpring = 0.28;
export const motionEase = "power3.out";
export const motionEaseSpring = "back.out(1.6)";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function motionDurFor(prefersReduced: boolean, base: number): number {
  return prefersReduced ? 0 : base;
}

export function motionStagger(index: number, base = 0.028): number {
  return index * base;
}