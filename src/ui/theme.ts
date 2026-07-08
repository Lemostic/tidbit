export type Theme = "light" | "dark" | "sepia";
export function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
}
