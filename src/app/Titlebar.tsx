import { getCurrentWindow } from "@tauri-apps/api/window";
import { ThemeSwitcher } from "../features/settings/ThemeSwitcher";

interface TitlebarProps {
  onOpenPalette?: () => void;
}

export function Titlebar({ onOpenPalette }: TitlebarProps) {
  const win = getCurrentWindow();

  return (
    <header data-tauri-drag-region style={{
      height: "var(--titlebar-h)", display: "flex", alignItems: "center",
      padding: "0 8px", background: "var(--bg)", color: "var(--fg)", userSelect: "none",
    }}>
      <strong>tidbit</strong>
      <button
        onClick={onOpenPalette}
        title="Search (Ctrl+K)"
        style={{
          marginLeft: 12, padding: "2px 10px", borderRadius: 12,
          border: "1px solid #888", background: "var(--surface)", cursor: "pointer",
          fontSize: 12, color: "var(--fg)",
        }}
      >
        search ⌘K
      </button>
      <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
        <ThemeSwitcher />
        <button aria-label="Minimize" onClick={() => win.minimize()}>—</button>
        <button aria-label="Maximize" onClick={() => win.toggleMaximize()}>◻</button>
        <button aria-label="Close" onClick={() => win.close()}>✕</button>
      </div>
    </header>
  );
}
