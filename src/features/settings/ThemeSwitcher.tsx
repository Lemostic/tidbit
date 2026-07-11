import { useEffect, useState } from "react";
import { applyTheme, type Theme } from "../../ui/theme";

export function ThemeSwitcher() {
  const [t, setT] = useState<Theme>((localStorage.getItem("theme") as Theme) ?? "light");
  useEffect(() => { applyTheme(t); localStorage.setItem("theme", t); }, [t]);
  return <select className="select" value={t} onChange={(e) => setT(e.target.value as Theme)} aria-label="主题">
    <option value="light">浅色</option><option value="dark">深色</option><option value="sepia">护眼</option>
  </select>;
}
