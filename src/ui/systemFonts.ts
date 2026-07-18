import { invoke } from "@tauri-apps/api/core";

export const commonSystemFonts = [
  "Microsoft YaHei UI",
  "Microsoft YaHei",
  "Segoe UI Variable",
  "Segoe UI",
  "SimHei",
  "KaiTi",
  "FangSong",
] as const;

interface LocalFontMetadata {
  family?: unknown;
}

type QueryLocalFonts = () => Promise<readonly LocalFontMetadata[]>;

declare global {
  interface Window {
    queryLocalFonts?: QueryLocalFonts;
  }
}

export function normalizeFontFamilies(fonts: readonly unknown[]): string[] {
  const unique = new Map<string, string>();
  for (const value of fonts) {
    if (typeof value !== "string") continue;
    const family = value.trim();
    if (!family) continue;
    const key = family.toLocaleLowerCase();
    if (!unique.has(key)) unique.set(key, family);
  }
  return [...unique.values()].sort((left, right) => left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base",
  }));
}

interface LoadSystemFontsOptions {
  queryLocalFonts?: QueryLocalFonts;
  nativeList?: () => Promise<readonly string[]>;
}

export async function loadSystemFonts(options: LoadSystemFontsOptions = {}): Promise<string[]> {
  const browserQuery = options.queryLocalFonts
    ?? (typeof window !== "undefined" ? window.queryLocalFonts?.bind(window) : undefined);

  if (browserQuery) {
    try {
      const localFonts = await browserQuery();
      const families = normalizeFontFamilies(localFonts.map((font) => font.family));
      if (families.length > 0) return families;
    } catch {
      // Local Font Access can be unavailable or denied; the native registry is the fallback.
    }
  }

  try {
    const nativeList = options.nativeList ?? (() => invoke<string[]>("system_fonts_list"));
    const families = normalizeFontFamilies(await nativeList());
    if (families.length > 0) return families;
  } catch {
    // Keep the settings usable in browsers and on systems where font enumeration is unavailable.
  }

  return normalizeFontFamilies(commonSystemFonts);
}
