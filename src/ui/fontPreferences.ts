export interface FontPreferences {
  group: string;
  noteTitle: string;
  noteBody: string;
}

export const defaultFontPreferences: FontPreferences = {
  group: "Microsoft YaHei UI",
  noteTitle: "Microsoft YaHei UI",
  noteBody: "Microsoft YaHei UI",
};

const storageKey = "font-preferences-v1";
const fallback = '"Segoe UI Variable", "Segoe UI", "Microsoft YaHei UI", sans-serif';

function fontStack(font: string) {
  const clean = font.trim().replace(/["'`;{}]/g, "");
  return clean ? `"${clean}", ${fallback}` : fallback;
}

export function loadFontPreferences(storage: Pick<Storage, "getItem"> = localStorage): FontPreferences {
  try {
    const saved = JSON.parse(storage.getItem(storageKey) ?? "{}") as Partial<FontPreferences>;
    return { ...defaultFontPreferences, ...saved };
  } catch {
    return defaultFontPreferences;
  }
}

export function applyFontPreferences(preferences: FontPreferences, root = document.documentElement) {
  root.style.setProperty("--font-group", fontStack(preferences.group));
  root.style.setProperty("--font-note-title", fontStack(preferences.noteTitle));
  root.style.setProperty("--font-note-body", fontStack(preferences.noteBody));
}

export function saveFontPreferences(
  preferences: FontPreferences,
  storage: Pick<Storage, "setItem"> = localStorage,
) {
  storage.setItem(storageKey, JSON.stringify(preferences));
  applyFontPreferences(preferences);
}
