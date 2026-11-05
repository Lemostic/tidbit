import { beforeEach, describe, expect, it } from "vitest";
import {
  defaultMainWindowSize,
  fitMainWindowSizeToWorkArea,
  loadMainWindowSize,
  logicalSizeFromPhysical,
  minimumMainWindowSize,
  normalizeMainWindowSize,
  saveMainWindowSize,
} from "../ui/windowSizePreferences";

beforeEach(() => localStorage.clear());

describe("main window size preferences", () => {
  it("defaults to a desktop-friendly height", () => {
    expect(loadMainWindowSize()).toEqual(defaultMainWindowSize);
    expect(defaultMainWindowSize.height).toBeLessThanOrEqual(820);
  });

  it("persists custom dimensions", () => {
    expect(saveMainWindowSize({ width: 920, height: 1280 })).toEqual({ width: 920, height: 1280 });
    expect(loadMainWindowSize()).toEqual({ width: 920, height: 1280 });
  });

  it("clamps invalid dimensions to supported bounds", () => {
    expect(normalizeMainWindowSize({ width: 100, height: 100 })).toEqual(minimumMainWindowSize);
    expect(normalizeMainWindowSize({ width: Number.NaN, height: Number.NaN })).toEqual(defaultMainWindowSize);
  });

  it("converts physical resize events into logical dimensions", () => {
    expect(logicalSizeFromPhysical({ width: 1170, height: 1230 }, 1.5)).toEqual(defaultMainWindowSize);
  });

  it("fits an oversized saved window inside the current monitor work area", () => {
    expect(fitMainWindowSizeToWorkArea(
      { width: 780, height: 1100 },
      { width: 1536, height: 864 },
    )).toEqual({ width: 780, height: 840 });
  });

  it("preserves a requested size that is already visible", () => {
    expect(fitMainWindowSizeToWorkArea(
      { width: 780, height: 760 },
      { width: 1920, height: 1040 },
    )).toEqual({ width: 780, height: 760 });
  });
});
