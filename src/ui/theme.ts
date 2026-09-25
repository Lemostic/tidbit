export type Theme =
  | "light"
  | "dark"
  | "sepia"
  | "tokyo-night"
  | "wechat"
  | "evernote"
  | "one-dark"
  | "dracula"
  | "nord"
  | "solarized-dark"
  | "gruvbox-dark"
  | "monokai";

export const themes: Theme[] = [
  "light",
  "dark",
  "sepia",
  "tokyo-night",
  "wechat",
  "evernote",
  "one-dark",
  "dracula",
  "nord",
  "solarized-dark",
  "gruvbox-dark",
  "monokai",
];

export function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = themes.includes(t) ? t : "light";
}
