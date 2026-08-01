export type Theme = "light" | "dark" | "sepia" | "tokyo-night" | "wechat";
export function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
}
