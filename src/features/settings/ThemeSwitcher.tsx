import { useEffect, useState } from "react";
import { Leaf, MoonStars, SunDim } from "@phosphor-icons/react";
import { applyTheme, type Theme } from "../../ui/theme";
import { broadcastAppearance } from "../../ui/appearance";
import { useI18n } from "../../i18n";

const themes: Theme[] = ["light", "dark", "sepia"];

export function ThemeSwitcher({ expanded = false }: { expanded?: boolean }) {
  const { t: translate } = useI18n();
  const [theme, setTheme] = useState<Theme>((localStorage.getItem("theme") as Theme) ?? "light");
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("theme", theme);
    window.dispatchEvent(new Event("tidbit-theme"));
    void broadcastAppearance().catch(() => undefined);
  }, [theme]);
  useEffect(() => {
    const sync = () => setTheme((localStorage.getItem("theme") as Theme) ?? "light");
    window.addEventListener("tidbit-theme", sync);
    return () => window.removeEventListener("tidbit-theme", sync);
  }, []);
  if (expanded) {
    return <select className="select" value={theme} onChange={(e) => setTheme(e.target.value as Theme)} aria-label={translate("theme.label")}>
      <option value="light">{translate("theme.light")}</option><option value="dark">{translate("theme.dark")}</option><option value="sepia">{translate("theme.sepia")}</option>
    </select>;
  }
  const Icon = theme === "dark" ? MoonStars : theme === "sepia" ? Leaf : SunDim;
  return (
    <button
      className="btn-icon"
      aria-label={translate("theme.label")}
      title={`${translate("theme.label")} · ${translate(`theme.${theme}`)}`}
      onClick={() => setTheme(themes[(themes.indexOf(theme) + 1) % themes.length] ?? "light")}
    >
      <Icon size={15} weight="duotone" />
    </button>
  );
}
