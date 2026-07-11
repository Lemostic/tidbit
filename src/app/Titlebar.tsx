import { getCurrentWindow } from "@tauri-apps/api/window";
import { ThemeSwitcher } from "../features/settings/ThemeSwitcher";

interface TitlebarProps {
  onOpenPalette?: () => void;
}

export function Titlebar({ onOpenPalette }: TitlebarProps) {
  const win = getCurrentWindow();

  return (
    <header data-tauri-drag-region className="titlebar">
      <strong className="titlebar__brand">tidbit</strong>
      <button
        onClick={onOpenPalette}
        className="titlebar__search"
        title="搜索 (Ctrl+K)"
      >
        <span>搜索便签</span>
        <span className="titlebar__kbd">Ctrl K</span>
      </button>
      <div className="titlebar__spacer" />
      <div className="titlebar__actions">
        <ThemeSwitcher />
        <button className="btn-icon" aria-label="最小化" title="最小化" onClick={() => win.minimize()}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
        </button>
        <button className="btn-icon" aria-label="最大化" title="最大化" onClick={() => win.toggleMaximize()}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2.5" y="2.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/></svg>
        </button>
        <button className="btn-icon is-danger" aria-label="关闭" title="关闭" onClick={() => win.close()}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
        </button>
      </div>
    </header>
  );
}
