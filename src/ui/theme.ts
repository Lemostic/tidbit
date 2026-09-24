export type Theme = "light" | "dark" | "sepia" | "tokyo-night" | "wechat" | "evernote";

export const themes: Theme[] = ["light", "dark", "sepia", "tokyo-night", "wechat", "evernote"];

export function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = themes.includes(t) ? t : "light";
}
