import catalog from "./registry.json";

export type PluginCategory = "export" | "appearance" | "analysis" | "productivity" | "sync";

export interface PluginCommandSpec {
  id: string;
  title: string;
  hint?: string;
}

export interface PluginCatalogEntry {
  id: string;
  name: string;
  author: string;
  version: string;
  summary: string;
  category: PluginCategory;
  /** Phosphor icon name; resolved by the UI to a real component. */
  icon: string;
  commands: PluginCommandSpec[];
}

export interface InstalledPlugin {
  id: string;
  enabled: boolean;
  installedAt: number;
}

const CATEGORY_LABELS: Record<PluginCategory, string> = {
  export: "导出",
  appearance: "外观",
  analysis: "分析",
  productivity: "效率",
  sync: "同步",
};

export function categoryLabel(category: PluginCategory): string {
  return CATEGORY_LABELS[category] ?? category;
}

/**
 * Static local catalog. Today this is loaded from `registry.json` at
 * build-time; tomorrow this will be replaced by a fetch against a hosted
 * index (e.g. `https://plugins.tidbit.app/v1/index.json`) without any other
 * code change.
 */
export function loadCatalog(): PluginCatalogEntry[] {
  return catalog as PluginCatalogEntry[];
}

export function findCatalogEntry(id: string): PluginCatalogEntry | undefined {
  return loadCatalog().find((p) => p.id === id);
}