import { useEffect, useState } from "react";
import { Leaf, MoonStars, SunDim } from "@phosphor-icons/react";
import { applyTheme, type Theme } from "../../ui/theme";
import { broadcastAppearance } from "../../ui/appearance";

const labels: Record<Theme, string> = { light: "浅色", dark: "深色", sepia: "护眼" };
const themes: Theme[] = ["light", "dark", "sepia"];

export function ThemeSwitcher({ expanded = false }: { expanded?: boolean }) {
  const [t, setT] = useState<Theme>((localStorage.getItem("theme") as Theme) ?? "light");
  useEffect(() => {
    applyTheme(t);
    localStorage.setItem("theme", t);
    window.dispatchEvent(new Event("tidbit-theme"));
    void broadcastAppearance().catch(() => undefined);
  }, [t]);
  useEffect(() => {
    const sync = () => setT((localStorage.getItem("theme") as Theme) ?? "light");
    window.addEventListener("tidbit-theme", sync);
    return () => window.removeEventListener("tidbit-theme", sync);
  }, []);
  if (expanded) {
    return <select className="select" value={t} onChange={(e) => setT(e.target.value as Theme)} aria-label="主题">
      <option value="light">浅色</option><option value="dark">深色</option><option value="sepia">护眼</option>
    </select>;
  }
  const Icon = t === "dark" ? MoonStars : t === "sepia" ? Leaf : SunDim;
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
