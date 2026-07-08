import { useEffect, useState } from "react";
import { applyTheme, type Theme } from "../../ui/theme";

export function ThemeSwitcher() {
  const [t, setT] = useState<Theme>((localStorage.getItem("theme") as Theme) ?? "light");
  useEffect(() => { applyTheme(t); localStorage.setItem("theme", t); }, [t]);
  return <select value={t} onChange={(e) => setT(e.target.value as Theme)} aria-label="主题">
    <option value="light">Light</option><option value="dark">Dark</option><option value="sepia">Sepia</option>
  </select>;
}
