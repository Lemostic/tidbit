import { useEffect, useState } from "react";
import { ChatCircleDots, City, Leaf, MoonStars, Notebook, SunDim } from "@phosphor-icons/react";
import { applyTheme, themes, type Theme } from "../../ui/theme";
import { broadcastAppearance, loadAppearance } from "../../ui/appearance";

const labels: Record<Theme, string> = {
  light: "浅色",
  dark: "深色",
  sepia: "护眼",
  "tokyo-night": "Tokyo Night",
  wechat: "微信风格",
  evernote: "印象笔记",
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
  const Icon = t === "dark"
    ? MoonStars
    : t === "sepia"
      ? Leaf
      : t === "tokyo-night"
        ? City
        : t === "wechat"
          ? ChatCircleDots
          : t === "evernote"
            ? Notebook
            : SunDim;
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
