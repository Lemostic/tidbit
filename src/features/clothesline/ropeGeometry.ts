/**
 * Pure geometry for the clothesline scene.
 *
 * The rope is modelled as a real catenary: two fixed ends at the same height,
 * sagging under its own weight. Hanging cards are treated as point loads, so
 * the sag grows slightly with the number of hung notes, and every card is
 * parked on the *curve* rather than on a straight line.
 *
 * Everything here is deterministic and framework-free so the visual physics
 * can be unit-tested without a DOM.
 */

export interface Catenary {
  /** Horizontal distance between the two fixed ends, in px. */
  readonly span: number;
  /** Vertical drop at the middle of the rope, in px. */
  readonly sag: number;
  /** Catenary parameter `a` (px). `Infinity` means a perfectly straight rope. */
  readonly a: number;
}

const CURVE_CACHE_LIMIT = 48;
const curveCache = new Map<string, Catenary>();

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * `f(k) = a * (cosh(k) - 1)` with `a = span / (2k)`, i.e. the sag produced by
 * a catenary parameter `k = span / (2a)`. Solving for `k` keeps the numbers
 * well-conditioned (`cosh` never sees a huge argument).
 */
function sagFromK(span: number, k: number): number {
  return (span / (2 * k)) * (Math.cosh(k) - 1);
}

export function catenary(span: number, sag: number): Catenary {
  const safeSpan = Math.max(1, span);
  const safeSag = Math.max(0, sag);
  const key = `${safeSpan.toFixed(2)}:${safeSag.toFixed(2)}`;
  const cached = curveCache.get(key);
  if (cached) return cached;

  let curve: Catenary;
  if (safeSag <= 0.01) {
    curve = { span: safeSpan, sag: 0, a: Number.POSITIVE_INFINITY };
  } else {
    // `sagFromK` is monotonically increasing in k; bracket and bisect.
    let lo = 1e-4;
    let hi = 40;
    for (let i = 0; i < 64; i += 1) {
      const mid = (lo + hi) / 2;
      if (sagFromK(safeSpan, mid) < safeSag) lo = mid;
      else hi = mid;
    }
    const k = (lo + hi) / 2;
    curve = { span: safeSpan, sag: safeSag, a: safeSpan / (2 * k) };
  }

  if (curveCache.size >= CURVE_CACHE_LIMIT) {
    const oldest = curveCache.keys().next();
    if (!oldest.done) curveCache.delete(oldest.value);
  }
  curveCache.set(key, curve);
  return curve;
}

/** Downward displacement from the fixed ends at local x ∈ [0, span]. */
export function catenaryDroop(curve: Catenary, xLocal: number): number {
  if (!Number.isFinite(curve.a) || curve.sag <= 0.01) return 0;
  const half = curve.span / 2;
  const local = clamp(xLocal, 0, curve.span);
  return curve.a * (Math.cosh(half / curve.a) - Math.cosh((local - half) / curve.a));
}

/** dy/dx of the rope at local x. Positive = descending to the right. */
export function catenarySlope(curve: Catenary, xLocal: number): number {
  if (!Number.isFinite(curve.a) || curve.sag <= 0.01) return 0;
  const half = curve.span / 2;
  const local = clamp(xLocal, 0, curve.span);
  return -Math.sinh((local - half) / curve.a);
}

/** Tangent angle in degrees; positive = clockwise (CSS `rotate()` convention). */
export function catenaryAngleDeg(curve: Catenary, xLocal: number): number {
  return (Math.atan(catenarySlope(curve, xLocal)) * 180) / Math.PI;
}

/**
 * SVG path for the rope, sampled finely enough that the curve reads as smooth
 * at monitor widths. `originX` is where the left anchor sits in scene px.
 */
export function buildRopePath(
  curve: Catenary,
  endpointY: number,
  originX = 0,
  samples = 72,
): string {
  const steps = Math.max(8, Math.round(samples));
  const points: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const local = (curve.span * i) / steps;
    const x = originX + local;
    const y = endpointY + catenaryDroop(curve, local);
    points.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return points.join(" ");
}

/**
 * A rope with more clothes on it sags deeper. The relationship is linear in
 * the total load for small deflections, which is all a UI needs.
 */
export function sagForLoad(baseSag: number, count: number, maxSag: number): number {
  const load = Math.max(0, Math.round(count)) * 2.4;
  return clamp(baseSag + load, 0, Math.max(0, maxSag));
}

/**
 * Left offsets for `count` cards of `cardWidth`, evenly distributed over the
 * rope and centred. When the cards are too many for the available width the
 * step simply shrinks, so cards overlap (a crowded line) instead of running
 * off the screen.
 */
export function layoutCards(
  sceneWidth: number,
  count: number,
  cardWidth: number,
  edgeInset: number,
  maxStep: number,
): number[] {
  if (count <= 0) return [];
  const maxLeft = Math.max(edgeInset, sceneWidth - edgeInset - cardWidth);
  if (count === 1) return [clamp((sceneWidth - cardWidth) / 2, edgeInset, maxLeft)];

  const usable = Math.max(0, sceneWidth - edgeInset * 2 - cardWidth);
  const step = Math.min(Math.max(0, maxStep), usable / (count - 1));
  const total = step * (count - 1);
  const left = clamp((sceneWidth - cardWidth - total) / 2, edgeInset, maxLeft);
  return Array.from({ length: count }, (_, index) => left + index * step);
}

/**
 * Position one note's clip on the rope, given the scene width and a free
 * horizontal position that the user has dragged the card to. The value is
 * clamped so the clip stays between the two nail anchors. `fallback` is
 * used when the card was never dragged; it normally points at the evenly
 * distributed slot.
 */
export function clampCardX(
  candidate: number | null | undefined,
  fallback: number,
  sceneWidth: number,
  cardWidth: number,
  edgeInset: number,
): number {
  const maxLeft = Math.max(edgeInset, sceneWidth - edgeInset - cardWidth);
  if (typeof candidate !== "number" || !Number.isFinite(candidate)) {
    return clamp(fallback, edgeInset, maxLeft);
  }
  return clamp(candidate, edgeInset, maxLeft);
}

export interface PartingInput {
  /** Base left offsets of every card, in scene px. */
  lefts: readonly number[];
  cardWidth: number;
  /** Index of the card under the pointer (excluded from the push). */
  focusIndex: number;
  /** Centre x of the focused card (its dragged position while dragging). */
  focusCenter: number;
  minLeft: number;
  maxLeft: number;
  /** Strongest lateral push, applied to a card directly next to the focus. */
  maxPush: number;
  /** Distance at which the push fades out completely. */
  radius: number;
}

/**
 * "Parts the curtains": cards close to the focused one slide away from it so
 * the pointer can always reach the focused card, while cards stay clamped to
 * the rope (they can never be pushed off screen).
 */
export function partingOffsets(input: PartingInput): number[] {
  const { lefts, cardWidth, focusIndex, focusCenter, minLeft, maxLeft, maxPush, radius } = input;
  if (focusIndex < 0 || focusIndex >= lefts.length) return lefts.map(() => 0);
  return lefts.map((left, index) => {
    if (index === focusIndex || maxPush <= 0 || radius <= 0) return 0;
    const center = left + cardWidth / 2;
    const delta = center - focusCenter;
    const distance = Math.abs(delta);
    if (distance < 0.5 || distance >= radius) return 0;
    const influence = 1 - distance / radius;
    const target = clamp(left + Math.sign(delta) * maxPush * influence, minLeft, maxLeft);
    return target - left;
  });
}

/** Deterministic 0..1 hash so a note always jitters the same way. */
export function hashUnit(seed: number): number {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export interface CardJitter {
  /** Degrees of extra tilt, roughly ±1.3°. */
  readonly tilt: number;
  /** Vertical offset in px, roughly ±1.1px. */
  readonly offsetY: number;
}

/**
 * Notes are hung by hand, not by a machine: a small deterministic wobble keeps
 * a row of cards from looking stamped out while staying stable across renders.
 */
export function cardJitter(seed: number): CardJitter {
  const a = hashUnit(seed);
  const b = hashUnit(seed * 31 + 7);
  return { tilt: (a - 0.5) * 2.6, offsetY: (b - 0.5) * 2.2 };
}
