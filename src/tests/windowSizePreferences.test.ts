import { beforeEach, describe, expect, it } from "vitest";
import {
  defaultMainWindowSize,
  loadMainWindowSize,
  logicalSizeFromPhysical,
  minimumMainWindowSize,
  normalizeMainWindowSize,
  saveMainWindowSize,
} from "../ui/windowSizePreferences";

beforeEach(() => localStorage.clear());

describe("main window size preferences", () => {
  it("defaults to 780 by 1100", () => {
    expect(loadMainWindowSize()).toEqual(defaultMainWindowSize);
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
    expect(logicalSizeFromPhysical({ width: 1170, height: 1650 }, 1.5)).toEqual(defaultMainWindowSize);
  });
});
