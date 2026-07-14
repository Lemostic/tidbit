import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { GearSix, MagnifyingGlass, Minus, PushPin, Square, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { ThemeSwitcher } from "../features/settings/ThemeSwitcher";
import { useI18n } from "../i18n";

interface TitlebarProps {
  onOpenPalette?: () => void;
  onOpenSettings?: () => void;
  onDragStart?: () => void;
}

export function Titlebar({ onOpenPalette, onOpenSettings, onDragStart }: TitlebarProps) {
  const { t } = useI18n();
  const win = getCurrentWindow();
  const dragStarted = useRef(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(() => localStorage.getItem("window-always-on-top") === "true");
  const initialAlwaysOnTop = useRef(alwaysOnTop);

  useEffect(() => {
    void invoke("window_set_always_on_top", { pinned: initialAlwaysOnTop.current }).catch(() => undefined);
  }, []);

  const toggleAlwaysOnTop = async () => {
    const pinned = !alwaysOnTop;
    try {
      await invoke("window_set_always_on_top", { pinned });
      setAlwaysOnTop(pinned);
      localStorage.setItem("window-always-on-top", String(pinned));
    } catch {
      // Keep the visible state aligned with the native window state.
    }
  };

  const startWindowDrag = async () => {
    if (dragStarted.current) return;
    dragStarted.current = true;
    onDragStart?.();
    try {
      await win.startDragging();
    } finally {
      dragStarted.current = false;
    }
  };

  return (
    <header
      className="titlebar"
      onPointerDown={(event) => {
        const interactive = (event.target as HTMLElement).closest("button, input, select, textarea, a, [role='button']");
        if (event.button !== 0 || interactive) return;
        event.preventDefault();
        void startWindowDrag();
      }}
    >
      <strong className="titlebar__brand">tidbit</strong>
      <button
        onClick={onOpenPalette}
        className="titlebar__search"
        title={t("titlebar.searchTitle")}
      >
        <MagnifyingGlass size={13} aria-hidden="true" />
        <span>{t("titlebar.search")}</span>
        <span className="titlebar__kbd">Ctrl K</span>
      </button>
      <div className="titlebar__spacer" />
      <div className="titlebar__actions">
        <ThemeSwitcher />
        <button className="btn-icon" aria-label={t("common.settings")} title={t("common.settings")} onClick={onOpenSettings}>
          <GearSix size={15} weight="duotone" />
        </button>
        <button
          className={`btn-icon${alwaysOnTop ? " is-active" : ""}`}
          aria-label={alwaysOnTop ? t("titlebar.unpin") : t("titlebar.pin")}
          aria-pressed={alwaysOnTop}
          title={alwaysOnTop ? t("titlebar.unpin") : t("titlebar.pin")}
          onClick={() => void toggleAlwaysOnTop()}
        >
          <PushPin size={14} weight={alwaysOnTop ? "fill" : "regular"} />
        </button>
        <button className="btn-icon" aria-label={t("titlebar.minimize")} title={t("titlebar.minimizeTitle")} onClick={() => void invoke("window_hide_to_tray")}>
          <Minus size={14} weight="bold" />
        </button>
        <button className="btn-icon" aria-label={t("titlebar.maximize")} title={t("titlebar.maximize")} onClick={() => win.toggleMaximize()}>
          <Square size={12} weight="bold" />
        </button>
        <button
          className="btn-icon is-danger"
          aria-label={t("common.close")}
          title={t("titlebar.exit")}
          onClick={() => void invoke("app_quit")}
        >
          <X size={14} weight="bold" />
        </button>
      </div>
    </header>
  );
}
