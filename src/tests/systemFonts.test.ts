import { describe, expect, it, vi } from "vitest";
import { loadSystemFonts, normalizeFontFamilies } from "../ui/systemFonts";

describe("system font loading", () => {
  it("normalizes, de-duplicates, and sorts font families", () => {
    expect(normalizeFontFamilies([" Segoe UI ", "Arial", "segoe ui", "", null])).toEqual([
      "Arial",
      "Segoe UI",
    ]);
  });

  it("uses Local Font Access when WebView2 exposes it", async () => {
    const nativeList = vi.fn(async () => ["Native Font"]);
    const fonts = await loadSystemFonts({
      queryLocalFonts: async () => [{ family: "Consolas" }, { family: "Arial" }, { family: "Consolas" }],
      nativeList,
    });

    expect(fonts).toEqual(["Arial", "Consolas"]);
    expect(nativeList).not.toHaveBeenCalled();
  });

  it("falls back to the native Windows list when browser access is denied", async () => {
    const fonts = await loadSystemFonts({
      queryLocalFonts: async () => { throw new Error("permission denied"); },
      nativeList: async () => ["Microsoft YaHei UI", "Arial"],
    });

    expect(fonts).toEqual(["Arial", "Microsoft YaHei UI"]);
  });
});
