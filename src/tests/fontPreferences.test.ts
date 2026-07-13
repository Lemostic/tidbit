import { describe, expect, test, vi } from "vitest";
import { applyFontPreferences, loadFontPreferences, saveFontPreferences } from "../ui/fontPreferences";

describe("font preferences", () => {
  test("stores and independently applies group, title and body fonts", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    };
    const preferences = { group: "KaiTi", noteTitle: "SimHei", noteBody: "FangSong" };

    saveFontPreferences(preferences, storage);
    applyFontPreferences(preferences);

    expect(loadFontPreferences(storage)).toEqual(preferences);
    expect(document.documentElement.style.getPropertyValue("--font-group")).toContain("KaiTi");
    expect(document.documentElement.style.getPropertyValue("--font-note-title")).toContain("SimHei");
    expect(document.documentElement.style.getPropertyValue("--font-note-body")).toContain("FangSong");
  });
});
