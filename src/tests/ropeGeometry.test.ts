import { describe, expect, it } from "vitest";
import {
  buildRopePath,
  cardJitter,
  catenary,
  catenaryAngleDeg,
  catenaryDroop,
  catenarySlope,
  clamp,
  hashUnit,
  layoutCards,
  partingOffsets,
  sagForLoad,
} from "../features/clothesline/ropeGeometry";

describe("catenary", () => {
  const curve = catenary(1600, 42);

  it("is pinned at both ends and reaches the requested sag in the middle", () => {
    expect(catenaryDroop(curve, 0)).toBeCloseTo(0, 5);
    expect(catenaryDroop(curve, 1600)).toBeCloseTo(0, 5);
    expect(catenaryDroop(curve, 800)).toBeCloseTo(42, 4);
  });

  it("is symmetric and monotonically deeper towards the middle", () => {
    const quarter = catenaryDroop(curve, 400);
    const threeQuarter = catenaryDroop(curve, 1200);
    expect(quarter).toBeCloseTo(threeQuarter, 6);
    expect(quarter).toBeGreaterThan(0);
    expect(quarter).toBeLessThan(42);
    let previous = -1;
    for (let x = 0; x <= 800; x += 50) {
      const droop = catenaryDroop(curve, x);
      expect(droop).toBeGreaterThanOrEqual(previous);
      previous = droop;
    }
  });

  it("leans along the tangent: descending on the left, flat at the middle, ascending on the right", () => {
    expect(catenarySlope(curve, 0)).toBeGreaterThan(0);
    expect(catenarySlope(curve, 800)).toBeCloseTo(0, 6);
    expect(catenarySlope(curve, 1600)).toBeLessThan(0);
    // Within a few degrees at the anchors, which keeps the cards believable.
    expect(Math.abs(catenaryAngleDeg(curve, 0))).toBeLessThan(10);
    expect(catenaryAngleDeg(curve, 0)).toBeCloseTo(-catenaryAngleDeg(curve, 1600), 6);
  });

  it("clamps sampling outside the span so rubber-band overshoot cannot bend the rope", () => {
    expect(catenaryDroop(curve, -50)).toBeCloseTo(0, 6);
    expect(catenaryDroop(curve, 1700)).toBeCloseTo(0, 6);
  });

  it("degrades to a straight line when there is no sag", () => {
    const flat = catenary(900, 0);
    expect(catenaryDroop(flat, 450)).toBe(0);
    expect(catenarySlope(flat, 100)).toBe(0);
  });

  it("builds a path anchored at originX with one move plus the sampled segments", () => {
    const path = buildRopePath(curve, 22, 18, 8);
    expect(path.startsWith("M18.00 22.00")).toBe(true);
    expect(path.split("L")).toHaveLength(9);
  });

  it("sags more as more notes are hung, capped", () => {
    expect(sagForLoad(20, 0, 52)).toBe(20);
    expect(sagForLoad(20, 5, 52)).toBeCloseTo(32, 6);
    expect(sagForLoad(20, 100, 52)).toBe(52);
  });
});

describe("layoutCards", () => {
  it("returns an empty layout for an empty rope", () => {
    expect(layoutCards(1600, 0, 210, 26, 300)).toEqual([]);
  });

  it("centres a single card", () => {
    const [left] = layoutCards(1600, 1, 210, 26, 300);
    expect(left).toBeCloseTo((1600 - 210) / 2, 6);
  });

  it("spreads cards with gaps when there is room", () => {
    const lefts = layoutCards(1920, 6, 210, 26, 300);
    expect(lefts).toHaveLength(6);
    const step = (lefts[1] ?? 0) - (lefts[0] ?? 0);
    expect(step).toBeCloseTo(300, 6);
    // Group is centred: equal margin on both sides.
    const first = lefts[0] ?? 0;
    const last = lefts[lefts.length - 1] ?? 0;
    expect(first).toBeCloseTo(1920 - (last + 210), 6);
  });

  it("overlaps instead of overflowing when the rope gets crowded", () => {
    const width = 1200;
    const lefts = layoutCards(width, 12, 210, 26, 300);
    const step = (lefts[1] ?? 0) - (lefts[0] ?? 0);
    expect(step).toBeLessThan(210); // overlapping
    const first = lefts[0] ?? 0;
    const last = lefts[lefts.length - 1] ?? 0;
    expect(first).toBeGreaterThanOrEqual(26);
    expect(last + 210).toBeLessThanOrEqual(width - 26 + 1e-6);
  });

  it("keeps every card on screen even with absurd counts", () => {
    const width = 800;
    const lefts = layoutCards(width, 40, 210, 26, 300);
    for (const left of lefts) {
      expect(left).toBeGreaterThanOrEqual(26);
      expect(left + 210).toBeLessThanOrEqual(width - 26 + 1e-6);
    }
  });
});

describe("partingOffsets", () => {
  const lefts = layoutCards(1200, 6, 210, 26, 300);
  const centers = lefts.map((left) => left + 105);

  it("pushes neighbours away from the focused card and clamps them to the rope", () => {
    const focusIndex = 2;
    const offsets = partingOffsets({
      lefts,
      cardWidth: 210,
      focusIndex,
      focusCenter: centers[focusIndex] ?? 0,
      minLeft: 26,
      maxLeft: 1200 - 26 - 210,
      maxPush: 70,
      radius: 300,
    });
    expect(offsets[focusIndex]).toBe(0);
    expect(offsets[1] ?? 0).toBeLessThan(0);
    expect(offsets[3] ?? 0).toBeGreaterThan(0);
    // Cards farther than the parting radius stay put.
    expect(offsets[0] ?? 0).toBe(0);
    expect(offsets[5] ?? 0).toBe(0);
    // Symmetric push around the focused card.
    expect(offsets[1] ?? 0).toBeCloseTo(-(offsets[3] ?? 0), 6);
    // Nothing leaves the rope.
    offsets.forEach((offset, index) => {
      const nextLeft = (lefts[index] ?? 0) + offset;
      expect(nextLeft).toBeGreaterThanOrEqual(26);
      expect(nextLeft).toBeLessThanOrEqual(1200 - 26 - 210 + 1e-6);
    });
  });

  it("does nothing when there is no focus or no overlap", () => {
    const noFocus = partingOffsets({
      lefts,
      cardWidth: 210,
      focusIndex: -1,
      focusCenter: 0,
      minLeft: 26,
      maxLeft: 964,
      maxPush: 70,
      radius: 300,
    });
    expect(noFocus.every((offset) => offset === 0)).toBe(true);

    const noPush = partingOffsets({
      lefts,
      cardWidth: 210,
      focusIndex: 0,
      focusCenter: centers[0] ?? 0,
      minLeft: 26,
      maxLeft: 964,
      maxPush: 0,
      radius: 300,
    });
    expect(noPush.every((offset) => offset === 0)).toBe(true);
  });
});

describe("deterministic jitter", () => {
  it("stays stable for a given note and inside the intended envelope", () => {
    const first = cardJitter(42);
    expect(cardJitter(42)).toEqual(first);
    expect(Math.abs(first.tilt)).toBeLessThanOrEqual(1.3);
    expect(Math.abs(first.offsetY)).toBeLessThanOrEqual(1.1);
    expect(hashUnit(42)).toBeGreaterThanOrEqual(0);
    expect(hashUnit(42)).toBeLessThan(1);
    expect(hashUnit(7)).not.toBe(hashUnit(8));
  });

  it("clamps bad input instead of producing NaN", () => {
    expect(clamp(Number.NaN, 5, 10)).toBe(5);
  });
});
