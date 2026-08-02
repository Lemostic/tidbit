import {
  Archive,
  ArrowsOut,
  Eye,
  FolderOpen,
  HardDrive,
  LockKey,
  Power,
  PushPin,
  Cloud,
  Drop,
  Export,
  ShieldCheck,
  TextT,
  X,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { FontPreferences } from "../../ui/fontPreferences";
import { commonSystemFonts, normalizeFontFamilies } from "../../ui/systemFonts";
import { defaultMainWindowSize, maximumMainWindowSize, minimumMainWindowSize } from "../../ui/windowSizePreferences";
import { ThemeSwitcher } from "./ThemeSwitcher";

interface SettingsPanelProps {
  open: boolean;
  dockingEnabled: boolean;
  autostartEnabled: boolean;
  autostartBusy: boolean;
  lockPin: string;
  busy: boolean;
  fonts: FontPreferences;
  availableFonts: readonly string[];
  fontsLoading: boolean;
  wanderOpacity: number;
  glassEnabled: boolean;
  glassOpacity: number;
  windowWidth: number;
  windowHeight: number;
  windowSizeBusy: boolean;
  onClose: () => void;
  onDockingChange: (enabled: boolean) => void;
  onAutostartChange: (enabled: boolean) => void;
  onLockPinChange: (pin: string) => void;
  onFontsChange: (fonts: FontPreferences) => void;
  onWanderOpacityChange: (opacity: number) => void;
  onGlassChange: (enabled: boolean) => void;
  onGlassOpacityChange: (opacity: number) => void;
  onApplyWindowSize: (width: number, height: number) => void;
  onResetWindowSize: () => void;
  onBackup: () => void;
  onRestore: () => void;
  onOpenBackups: () => void;
  onShowHidden: () => void;
  onExport?: () => void;
  dataDirectory: string;
  defaultDataDirectory: string;
  dataDirectoryBusy: boolean;
  onDataDirectoryChange: (path: string) => void;
  onPickDataDirectory: () => void;
  onSaveDataDirectory: () => void;
  onResetDataDirectory: () => void;
}

const settingsSectionIds = [
  "settings-appearance",
  "settings-window",
  "settings-type",
  "settings-wander",
  "settings-privacy",
  "settings-maintenance",
] as const;

type SettingsSectionId = (typeof settingsSectionIds)[number];

function wheelDeltaInPixels(event: WheelEvent, pageHeight: number) {
  if (event.deltaMode === 1) return event.deltaY * 16;
  if (event.deltaMode === 2) return event.deltaY * pageHeight;
  return event.deltaY;
}

export function SettingsPanel(props: SettingsPanelProps) {
  const [widthDraft, setWidthDraft] = useState(String(props.windowWidth));
  const [heightDraft, setHeightDraft] = useState(String(props.windowHeight));
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("settings-appearance");
  const panelRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const fontOptions = useMemo(() => normalizeFontFamilies([
    ...props.availableFonts,
    ...commonSystemFonts,
    props.fonts.group,
    props.fonts.noteTitle,
    props.fonts.noteBody,
  ]), [props.availableFonts, props.fonts.group, props.fonts.noteBody, props.fonts.noteTitle]);

  const updateActiveSection = useCallback(() => {
    const body = bodyRef.current;
    if (!body) return;
    const maxScrollTop = Math.max(0, body.scrollHeight - body.clientHeight);
    if (maxScrollTop > 0 && body.scrollTop >= maxScrollTop - 2) {
      setActiveSection("settings-maintenance");
      return;
    }

    const activationLine = body.scrollTop + Math.min(160, body.clientHeight * 0.28);
    let nextSection: SettingsSectionId = settingsSectionIds[0];
    for (const sectionId of settingsSectionIds) {
      const section = body.querySelector<HTMLElement>(`[aria-labelledby="${sectionId}"]`);
      if (section && section.offsetTop <= activationLine) nextSection = sectionId;
    }
    setActiveSection(nextSection);
  }, []);

  useEffect(() => setWidthDraft(String(props.windowWidth)), [props.windowWidth]);
  useEffect(() => setHeightDraft(String(props.windowHeight)), [props.windowHeight]);
  useEffect(() => {
    if (!props.open) return;
    setActiveSection("settings-appearance");
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [props.open]);

  useEffect(() => {
    if (!props.open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus({ preventScroll: true });
    return () => {
      const previous = previousFocusRef.current;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
      previousFocusRef.current = null;
    };
  }, [props.open]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!props.open || !panel) return;

    const handleWheel = (event: WheelEvent) => {
      const body = bodyRef.current;
      if (!body || event.ctrlKey) return;

      const maxScrollTop = Math.max(0, body.scrollHeight - body.clientHeight);
      const delta = wheelDeltaInPixels(event, body.clientHeight);
      const nextScrollTop = Math.max(0, Math.min(maxScrollTop, body.scrollTop + delta));
      if (nextScrollTop === body.scrollTop) return;

      event.preventDefault();
      body.scrollTop = nextScrollTop;
      updateActiveSection();
    };

    panel.addEventListener("wheel", handleWheel, { passive: false });
    return () => panel.removeEventListener("wheel", handleWheel);
  }, [props.open, updateActiveSection]);

  const scrollToSection = (sectionId: SettingsSectionId) => {
    setActiveSection(sectionId);
    const body = bodyRef.current;
    const section = body?.querySelector<HTMLElement>(`[aria-labelledby="${sectionId}"]`);
    if (!body || !section) return;
    if (typeof body.scrollTo === "function") body.scrollTo({ top: section.offsetTop, behavior: "smooth" });
    else body.scrollTop = section.offsetTop;
  };

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      props.onClose();
      return;
    }
    if (event.key !== "Tab") return;

    const panel = panelRef.current;
    if (!panel) return;
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )).filter((element) => !element.hidden && element.getAttribute("aria-hidden") !== "true");
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    const active = document.activeElement;
    if (event.shiftKey && (active === first || !panel.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const widthValue = Number(widthDraft);
  const heightValue = Number(heightDraft);
  const widthValid = widthDraft.trim() !== "" && Number.isFinite(widthValue)
    && widthValue >= minimumMainWindowSize.width && widthValue <= maximumMainWindowSize.width;
  const heightValid = heightDraft.trim() !== "" && Number.isFinite(heightValue)
    && heightValue >= minimumMainWindowSize.height && heightValue <= maximumMainWindowSize.height;
  const windowSizeValid = widthValid && heightValid;
  const windowSizeMessage = !widthValid
    ? `宽度需在 ${minimumMainWindowSize.width}-${maximumMainWindowSize.width} 之间。`
    : !heightValid
      ? `高度需在 ${minimumMainWindowSize.height}-${maximumMainWindowSize.height} 之间。`
      : "拖动窗口边缘后，这里的宽高会自动更新。";

  if (!props.open) return null;
  return (
    <div className="modal-scrim" onKeyDown={handleDialogKeyDown} onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) props.onClose(); }}>
      <section ref={panelRef} className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={(event) => event.stopPropagation()}>
        <header className="settings-panel__head">
          <div>
            <span className="settings-panel__eyebrow">TIDBIT</span>
            <h2 id="settings-title">设置</h2>
          </div>
          <button ref={closeButtonRef} className="btn-icon" onClick={props.onClose} aria-label="关闭设置" title="关闭设置">
            <X size={16} weight="bold" />
          </button>
        </header>

        <div className="settings-panel__workspace">
          <nav className="settings-panel__nav" aria-label="设置分类">
            <button type="button" className={activeSection === "settings-appearance" ? "is-active" : ""} aria-current={activeSection === "settings-appearance" ? "page" : undefined} onClick={() => scrollToSection("settings-appearance")}><Eye size={16} /><span>外观</span></button>
            <button type="button" className={activeSection === "settings-window" ? "is-active" : ""} aria-current={activeSection === "settings-window" ? "page" : undefined} onClick={() => scrollToSection("settings-window")}><ArrowsOut size={16} /><span>窗口</span></button>
            <button type="button" className={activeSection === "settings-type" ? "is-active" : ""} aria-current={activeSection === "settings-type" ? "page" : undefined} onClick={() => scrollToSection("settings-type")}><TextT size={16} /><span>文字</span></button>
            <button type="button" className={activeSection === "settings-wander" ? "is-active" : ""} aria-current={activeSection === "settings-wander" ? "page" : undefined} onClick={() => scrollToSection("settings-wander")}><Cloud size={16} /><span>云游便签</span></button>
            <button type="button" className={activeSection === "settings-privacy" ? "is-active" : ""} aria-current={activeSection === "settings-privacy" ? "page" : undefined} onClick={() => scrollToSection("settings-privacy")}><ShieldCheck size={16} /><span>数据与隐私</span></button>
            <button type="button" className={activeSection === "settings-maintenance" ? "is-active" : ""} aria-current={activeSection === "settings-maintenance" ? "page" : undefined} onClick={() => scrollToSection("settings-maintenance")}><Archive size={16} /><span>维护</span></button>
          </nav>

          <div
            ref={bodyRef}
            className="settings-panel__body"
            tabIndex={0}
            aria-label="设置内容"
            onScroll={updateActiveSection}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return;
              const body = event.currentTarget;
              const pageStep = Math.max(40, body.clientHeight - 48);
              const nextScrollTop = {
                ArrowDown: body.scrollTop + 40,
                ArrowUp: body.scrollTop - 40,
                PageDown: body.scrollTop + pageStep,
                PageUp: body.scrollTop - pageStep,
                Home: 0,
                End: body.scrollHeight,
              }[event.key];
              if (nextScrollTop === undefined) return;
              event.preventDefault();
              body.scrollTop = nextScrollTop;
              updateActiveSection();
            }}
          >
          <section className="settings-section" aria-labelledby="settings-appearance">
            <header className="settings-section__head">
              <div><span id="settings-appearance">外观</span><small>主题、材质与界面清晰度</small></div>
            </header>
          <div className="settings-row">
            <div className="settings-row__icon"><Eye size={17} /></div>
            <div className="settings-row__copy">
              <strong>界面主题</strong>
              <span>浅色、深色、护眼、Tokyo Night 与微信风格</span>
            </div>
            <ThemeSwitcher expanded />
          </div>

          <div className="settings-row">
            <div className="settings-row__icon settings-row__icon--glass"><Drop size={17} weight="duotone" /></div>
            <div className="settings-row__copy">
              <strong>液态玻璃</strong>
              <span>与当前主题组合使用</span>
            </div>
            <input
              type="checkbox"
              className="switch"
              checked={props.glassEnabled}
              onChange={(event) => props.onGlassChange(event.target.checked)}
              aria-label="液态玻璃"
            />
          </div>

          <div className="settings-field settings-opacity">
            <label htmlFor="glass-opacity"><Drop size={16} weight="duotone" /> 液态玻璃模糊强度 <span>{props.glassOpacity}%</span></label>
            <input id="glass-opacity" type="range" min="55" max="100" step="1" value={props.glassOpacity} onChange={(event) => props.onGlassOpacityChange(Number(event.target.value))} aria-label="液态玻璃不透明度" />
            <div className="settings-opacity__scale"><span>更通透</span><span>更清晰</span></div>
          </div>
          </section>

          <section className="settings-section" aria-labelledby="settings-window">
            <header className="settings-section__head">
              <div><span id="settings-window">窗口</span><small>尺寸、吸附与启动行为</small></div>
            </header>
          <div className="settings-field settings-window-size">
            <label><ArrowsOut size={16} /> 软件主体尺寸</label>
            <div className="settings-window-size__grid">
              <label>
                <span>宽度</span>
                <input
                  className="field"
                  type="number"
                  min={minimumMainWindowSize.width}
                  max="3840"
                   step="10"
                   value={widthDraft}
                   onChange={(event) => setWidthDraft(event.target.value)}
                   aria-label="软件主体宽度"
                   aria-invalid={!widthValid}
                   aria-describedby="settings-window-size-status"
                />
              </label>
              <span className="settings-window-size__times" aria-hidden="true">×</span>
              <label>
                <span>高度</span>
                <input
                  className="field"
                  type="number"
                  min={minimumMainWindowSize.height}
                  max="2160"
                   step="10"
                   value={heightDraft}
                   onChange={(event) => setHeightDraft(event.target.value)}
                   aria-label="软件主体高度"
                   aria-invalid={!heightValid}
                   aria-describedby="settings-window-size-status"
                />
              </label>
            </div>
            <div className="settings-window-size__actions">
              <small id="settings-window-size-status" aria-live="polite" data-error={!windowSizeValid}>{windowSizeMessage}</small>
              <button
                type="button"
                className="btn btn-ghost"
                aria-label="恢复默认窗口尺寸"
                disabled={props.windowSizeBusy}
                onClick={() => {
                  setWidthDraft(String(defaultMainWindowSize.width));
                  setHeightDraft(String(defaultMainWindowSize.height));
                  props.onResetWindowSize();
                }}
              >恢复默认</button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={props.windowSizeBusy || !windowSizeValid}
                onClick={() => { if (windowSizeValid) props.onApplyWindowSize(widthValue, heightValue); }}
              >{props.windowSizeBusy ? "正在调整" : "应用尺寸"}</button>
            </div>
          </div>

          <div className="settings-row">
            <div className="settings-row__icon"><PushPin size={17} /></div>
            <div className="settings-row__copy">
              <strong>边缘吸附</strong>
              <span>拖动标题栏结束时靠齐屏幕边缘</span>
            </div>
            <input
              type="checkbox"
              className="switch"
              checked={props.dockingEnabled}
              onChange={(e) => props.onDockingChange(e.target.checked)}
              aria-label="边缘吸附"
            />
          </div>

          <div className="settings-row">
            <div className="settings-row__icon"><Power size={17} /></div>
            <div className="settings-row__copy">
              <strong>开机自动启动</strong>
              <span>登录 Windows 后自动启动 tidbit</span>
            </div>
            <input
              type="checkbox"
              className="switch"
              checked={props.autostartEnabled}
              disabled={props.autostartBusy}
              onChange={(event) => props.onAutostartChange(event.target.checked)}
              aria-label="开机自动启动"
            />
          </div>
          </section>

          <section className="settings-section" aria-labelledby="settings-type">
            <header className="settings-section__head">
              <div><span id="settings-type">文字</span><small>让分组与正文更符合阅读习惯</small></div>
            </header>
          <div className="settings-field settings-fonts">
            <label><TextT size={16} /> 字体设置</label>
            <div className="settings-fonts__grid">
              <label>
                <span>左侧分组</span>
                <select className="select" aria-label="左侧分组字体" value={props.fonts.group} onChange={(e) => props.onFontsChange({ ...props.fonts, group: e.target.value })}>
                  {fontOptions.map((font) => <option key={font} value={font}>{font}</option>)}
                </select>
              </label>
              <label>
                <span>便签标题</span>
                <select className="select" aria-label="便签标题字体" value={props.fonts.noteTitle} onChange={(e) => props.onFontsChange({ ...props.fonts, noteTitle: e.target.value })}>
                  {fontOptions.map((font) => <option key={font} value={font}>{font}</option>)}
                </select>
              </label>
              <label>
                <span>便签正文</span>
                <select className="select" aria-label="便签正文字体" value={props.fonts.noteBody} onChange={(e) => props.onFontsChange({ ...props.fonts, noteBody: e.target.value })}>
                  {fontOptions.map((font) => <option key={font} value={font}>{font}</option>)}
                </select>
              </label>
            </div>
            <small className="settings-fonts__status" aria-live="polite">
              {props.fontsLoading ? "正在读取 Windows 系统字体…" : `已加载 ${fontOptions.length} 种可用字体。`}
            </small>
          </div>
          </section>

          <section className="settings-section" aria-labelledby="settings-wander">
            <header className="settings-section__head">
              <div><span id="settings-wander">云游便签</span><small>桌面悬浮卡片的可见程度</small></div>
            </header>
          <div className="settings-field settings-opacity">
            <label htmlFor="wander-opacity"><Cloud size={16} /> 云游便签透明度 <span>{props.wanderOpacity}%</span></label>
            <input id="wander-opacity" type="range" min="45" max="100" step="1" value={props.wanderOpacity} onChange={(event) => props.onWanderOpacityChange(Number(event.target.value))} />
            <div className="settings-opacity__scale"><span>轻透</span><span>不透明</span></div>
          </div>
          </section>

          <section className="settings-section" aria-labelledby="settings-privacy">
            <header className="settings-section__head">
              <div><span id="settings-privacy">数据与隐私</span><small>存储位置和本地界面锁定</small></div>
            </header>
          <div className="settings-field settings-data-directory">
            <label htmlFor="data-directory"><HardDrive size={16} /> 数据目录</label>
            <div className="settings-data-directory__control">
              <input
                id="data-directory"
                className="field"
                value={props.dataDirectory}
                onChange={(event) => props.onDataDirectoryChange(event.target.value)}
                spellCheck={false}
              />
              <button type="button" className="btn" onClick={props.onPickDataDirectory} disabled={props.dataDirectoryBusy}>选择</button>
            </div>
            <div className="settings-data-directory__actions">
              <small>修改后将迁移数据库和备份，并自动重启。</small>
              <button type="button" className="btn btn-ghost" onClick={props.onResetDataDirectory} disabled={props.dataDirectoryBusy || props.dataDirectory === props.defaultDataDirectory}>恢复默认</button>
              <button type="button" className="btn btn-primary" onClick={props.onSaveDataDirectory} disabled={props.dataDirectoryBusy || !props.dataDirectory.trim()}>迁移并重启</button>
            </div>
          </div>

          <div className="settings-field">
            <label htmlFor="privacy-pin"><LockKey size={16} /> 隐私锁定密码</label>
            <input
              id="privacy-pin"
              className="field"
              type="password"
              inputMode="numeric"
              maxLength={12}
              value={props.lockPin}
              placeholder="留空则无需密码"
              onChange={(e) => props.onLockPinChange(e.target.value.replace(/\D/g, ""))}
            />
            <small>用于遮挡当前界面，不改变数据库加密密钥。</small>
          </div>
          </section>

          <section className="settings-section" aria-labelledby="settings-maintenance">
            <header className="settings-section__head">
              <div><span id="settings-maintenance">维护</span><small>备份、恢复与窗口找回</small></div>
            </header>
          <div className="settings-actions" aria-label="备份与恢复">
            <button className="settings-action" disabled={props.busy} onClick={props.onBackup}>
              <Archive size={18} />
              <span><strong>立即备份</strong><small>创建加密快照</small></span>
            </button>
            <button className="settings-action" disabled={props.busy} onClick={props.onRestore}>
              <ShieldCheck size={18} />
              <span><strong>恢复备份</strong><small>重启后替换数据</small></span>
            </button>
            <button className="settings-action" onClick={props.onOpenBackups}>
              <FolderOpen size={18} />
              <span><strong>打开目录</strong><small>查看备份文件</small></span>
            </button>
            <button type="button" className="settings-action" onClick={() => props.onExport?.()}>
              <Export size={18} />
              <span><strong>导出便签</strong><small>Markdown 或 PDF</small></span>
            </button>
            <button className="settings-action" onClick={props.onShowHidden}>
              <Eye size={18} />
              <span><strong>显示窗口</strong><small>找回已隐藏便签</small></span>
            </button>
          </div>
          </section>
          </div>
        </div>
      </section>
    </div>
  );
}
