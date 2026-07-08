import { getCurrentWindow } from "@tauri-apps/api/window";
import { ThemeSwitcher } from "../features/settings/ThemeSwitcher";

export function Titlebar() {
  const win = getCurrentWindow();
  return (
    <header data-tauri-drag-region style={{
      height: "var(--titlebar-h)", display: "flex", alignItems: "center",
      padding: "0 8px", background: "var(--bg)", color: "var(--fg)", userSelect: "none",
    }}>
      <strong>tidbit</strong>
      <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
        <ThemeSwitcher />
        <button aria-label="Minimize" onClick={() => win.minimize()}>—</button>
        <button aria-label="Maximize" onClick={() => win.toggleMaximize()}>◻</button>
        <button aria-label="Close" onClick={() => win.close()}>✕</button>
      </div>
    </header>
  );
}
