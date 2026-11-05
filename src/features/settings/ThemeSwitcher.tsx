import { useEffect, useState } from "react";
import {
  ChatCircleDots,
  City,
  Code,
  Ghost,
  Leaf,
  MoonStars,
  Notebook,
  Snowflake,
  SunDim,
  Terminal,
  Tree,
  Waveform,
} from "@phosphor-icons/react";
import { applyTheme, themes, type Theme } from "../../ui/theme";
import { broadcastAppearance, loadAppearance } from "../../ui/appearance";

const labels: Record<Theme, string> = {
  light: "浅色",
  dark: "深色",
  sepia: "护眼",
  "tokyo-night": "Tokyo Night",
  wechat: "微信风格",
  evernote: "印象笔记",
  "one-dark": "One Dark",
  dracula: "Dracula",
  nord: "Nord",
  "solarized-dark": "Solarized Dark",
  "gruvbox-dark": "Gruvbox",
  monokai: "Monokai",
};

const ICONS: Record<Theme, typeof SunDim> = {
  light: SunDim,
  dark: MoonStars,
  sepia: Leaf,
  "tokyo-night": City,
  wechat: ChatCircleDots,
  evernote: Notebook,
  "one-dark": Code,
  dracula: Ghost,
  nord: Snowflake,
  "solarized-dark": Waveform,
  "gruvbox-dark": Tree,
  monokai: Terminal,
};

export function ThemeSwitcher({ expanded = false }: { expanded?: boolean }) {
  const [t, setT] = useState<Theme>(() => loadAppearance().theme);
  useEffect(() => {
    applyTheme(t);
    localStorage.setItem("theme", t);
    window.dispatchEvent(new Event("tidbit-theme"));
    void broadcastAppearance().catch(() => undefined);
  }, [t]);
  useEffect(() => {
    const sync = () => setT(loadAppearance().theme);
    window.addEventListener("tidbit-theme", sync);
    return () => window.removeEventListener("tidbit-theme", sync);
  }, []);
  if (expanded) {
    return <select className="select" value={t} onChange={(e) => setT(e.target.value as Theme)} aria-label="主题">
      {themes.map((theme) => <option key={theme} value={theme}>{labels[theme]}</option>)}
    </select>;
  }
  const Icon = ICONS[t] ?? SunDim;
  return (
    <button
      className="btn-icon"
      aria-label="主题"
      title={`切换主题 · 当前${labels[t]}`}
      onClick={() => setT(themes[(themes.indexOf(t) + 1) % themes.length] ?? "light")}
    >
      <Icon size={15} weight="duotone" />
    </button>
  );
}
