import { useEffect, useRef } from "react";
import type { MouseEvent } from "react";
import {
  Archive,
  Eye,
  FolderOpen,
  HardDrive,
  CoatHanger,
  LockKey,
  Power,
  PushPin,
  Cloud,
  Drop,
  ShieldCheck,
  TextT,
  X,
} from "@phosphor-icons/react";
import type { FontPreferences } from "../../ui/fontPreferences";
import { ThemeSwitcher } from "./ThemeSwitcher";

interface SettingsPanelProps {
  open: boolean;
  dockingEnabled: boolean;
  autostartEnabled: boolean;
  autostartBusy: boolean;
  lockPin: string;
  busy: boolean;
  fonts: FontPreferences;
  wanderOpacity: number;
  glassEnabled: boolean;
  glassOpacity: number;
  clotheslineAutoShow: boolean;
  onClose: () => void;
  onDockingChange: (enabled: boolean) => void;
  onAutostartChange: (enabled: boolean) => void;
  onLockPinChange: (pin: string) => void;
  onFontsChange: (fonts: FontPreferences) => void;
  onWanderOpacityChange: (opacity: number) => void;
  onGlassChange: (enabled: boolean) => void;
  onGlassOpacityChange: (opacity: number) => void;
  onClotheslineAutoShowChange: (enabled: boolean) => void;
  onBackup: () => void;
  onRestore: () => void;
  onOpenBackups: () => void;
  onShowHidden: () => void;
  dataDirectory: string;
  defaultDataDirectory: string;
  dataDirectoryBusy: boolean;
  onDataDirectoryChange: (directory: string) => void;
  onPickDataDirectory: () => void;
  onSaveDataDirectory: () => void;
  onResetDataDirectory: () => void;
}

const settingsSections = [
  { id: "settings-appearance", index: "01", label: "外观与材质", hint: "主题 / 玻璃" },
  { id: "settings-behavior", index: "02", label: "工作方式", hint: "吸附 / 启动" },
  { id: "settings-typography", index: "03", label: "字体与云游", hint: "排版 / 透明度" },
  { id: "settings-data", index: "04", label: "数据与安全", hint: "目录 / 隐私" },
  { id: "settings-backup", index: "05", label: "备份与恢复", hint: "快照 / 找回" },
] as const;

export function SettingsPanel(props: SettingsPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(props.onClose);

  useEffect(() => {
    onCloseRef.current = props.onClose;
  }, [props.onClose]);

  useEffect(() => {
    if (!props.open) return;
    const panel = panelRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    const focusableSelector = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");

    const visibleFocusable = () => {
      if (!panel) return [];
      return Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => {
        // A collapsed settings index (compact windows) still contains anchors
        // in the DOM, so walk ancestors before adding them to the Tab loop.
        let current: HTMLElement | null = element;
        while (current) {
          if (current.hidden || current.getAttribute("aria-hidden") === "true") return false;
          const style = window.getComputedStyle(current);
          if (style.display === "none" || style.visibility === "hidden") return false;
          if (current === panel) break;
          current = current.parentElement;
        }
        return true;
      });
    };

    // Other overlays (for example the lock screen) can be rendered above the
    // settings folio without closing it. Leave keyboard handling to them.
    const isTopmostDialog = () => {
      if (!panel) return false;
      const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]'));
      return dialogs[dialogs.length - 1] === panel;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopmostDialog()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = visibleFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        panel?.focus();
        return;
      }

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;
      const outsidePanel = !(active instanceof Node) || !panel?.contains(active);
      if (event.shiftKey && (active === first || outsidePanel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || outsidePanel)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      const replacedByDialog = Array.from(document.querySelectorAll('[role="dialog"]'))
        .some((dialog) => dialog !== panel);
      if (!replacedByDialog && previousFocus?.isConnected) previousFocus.focus();
    };
  }, [props.open]);

  if (!props.open) return null;

  function jumpToSection(event: MouseEvent<HTMLAnchorElement>, id: string) {
    const body = bodyRef.current;
    const target = body?.querySelector<HTMLElement>(`#${id}`);
    if (!body || !target) return;
    event.preventDefault();
    const reduceMotion = typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
    } else {
      body.scrollTop = Math.max(0, target.offsetTop - body.offsetTop);
    }
  }

  return (
    <div
      className="modal-scrim modal-scrim--settings"
      onClick={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) props.onClose();
      }}
    >
      <section className="settings-panel" role="dialog" aria-modal="true" aria-label="设置" ref={panelRef} tabIndex={-1}>
        <aside className="settings-index" aria-label="设置目录">
          <div className="settings-index__identity">
            <div className="settings-index__plate" aria-hidden="true">T</div>
            <div className="settings-index__wordmark">
              <strong>TIDBIT</strong>
              <span>INK &amp; PAPER / 纸本工作台</span>
            </div>
          </div>

          <nav className="settings-index__nav" aria-label="设置分区">
            {settingsSections.map((section) => (
              <a
                key={section.id}
                className="settings-index__link"
                href={`#${section.id}`}
                aria-controls={section.id}
                onClick={(event) => jumpToSection(event, section.id)}
              >
                <span className="settings-index__number" aria-hidden="true">{section.index}</span>
                <span className="settings-index__label">
                  <strong>{section.label}</strong>
                  <small>{section.hint}</small>
                </span>
              </a>
            ))}
          </nav>

          <div className="settings-index__foot">
            <strong>偏好即时保存</strong>
            <span>外观与行为设置立即生效；数据迁移需显式确认。</span>
          </div>
        </aside>

        <div className="settings-panel__main">
          <header className="settings-panel__head">
            <div className="settings-panel__heading">
              <span className="settings-panel__eyebrow">PREFERENCES / 偏好设置</span>
              <h2>设置</h2>
              <p className="settings-panel__lede">调整纸面、墨色与工作台的运转方式。</p>
            </div>
            <button ref={closeButtonRef} className="btn-icon settings-panel__close" onClick={props.onClose} aria-label="关闭设置" title="关闭设置">
              <X size={17} weight="bold" />
            </button>
          </header>

          <div className="settings-panel__body" ref={bodyRef}>
            <section className="settings-section" id="settings-appearance" aria-labelledby="settings-appearance-title">
              <header className="settings-section__head">
                <span className="settings-section__number" aria-hidden="true">01</span>
                <div className="settings-section__title">
                  <h3 id="settings-appearance-title">外观与材质</h3>
                  <p>选择纸面的明度、墨色语气，以及玻璃层的通透程度。</p>
                </div>
              </header>
              <div className="settings-section__content">
                <div className="settings-row settings-row--lead">
                  <div className="settings-row__icon"><Eye size={19} /></div>
                  <div className="settings-row__copy">
                    <strong>界面主题</strong>
                    <span>浅色、深色与护眼模式</span>
                  </div>
                  <ThemeSwitcher expanded />
                </div>

                <div className="settings-grid settings-grid--2">
                  <div className="settings-row">
                    <div className="settings-row__icon settings-row__icon--glass"><Drop size={19} weight="duotone" /></div>
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
                    <label htmlFor="glass-opacity">
                      <Drop size={17} weight="duotone" /> 液态玻璃不透明度 <span>{props.glassOpacity}%</span>
                    </label>
                    <input
                      id="glass-opacity"
                      type="range"
                      min="55"
                      max="100"
                      step="1"
                      value={props.glassOpacity}
                      onChange={(event) => props.onGlassOpacityChange(Number(event.target.value))}
                      aria-label="液态玻璃不透明度"
                    />
                    <div className="settings-opacity__scale"><span>更通透</span><span>更清晰</span></div>
                  </div>
                </div>
              </div>
            </section>

            <section className="settings-section" id="settings-behavior" aria-labelledby="settings-behavior-title">
              <header className="settings-section__head">
                <span className="settings-section__number" aria-hidden="true">02</span>
                <div className="settings-section__title">
                  <h3 id="settings-behavior-title">工作方式</h3>
                  <p>决定窗口如何停留在桌面，以及应用何时开始工作。</p>
                </div>
              </header>
              <div className="settings-section__content">
                <div className="settings-grid settings-grid--2">
                  <div className="settings-row">
                    <div className="settings-row__icon"><PushPin size={19} /></div>
                    <div className="settings-row__copy">
                      <strong>边缘吸附</strong>
                      <span>拖动标题栏结束时靠齐屏幕边缘</span>
                    </div>
                    <input
                      type="checkbox"
                      className="switch"
                      checked={props.dockingEnabled}
                      onChange={(event) => props.onDockingChange(event.target.checked)}
                      aria-label="边缘吸附"
                    />
                  </div>

                  <div className="settings-row">
                    <div className="settings-row__icon"><Power size={19} /></div>
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
                </div>

                <div className="settings-row">
                  <div className="settings-row__icon"><CoatHanger size={19} weight="duotone" /></div>
                  <div className="settings-row__copy">
                    <strong>启动时显示晾衣绳</strong>
                    <span>打开 App 时自动展开桌面顶部的便签绳索</span>
                  </div>
                  <input
                    type="checkbox"
                    className="switch"
                    checked={props.clotheslineAutoShow}
                    onChange={(event) => props.onClotheslineAutoShowChange(event.target.checked)}
                    aria-label="启动时显示晾衣绳"
                  />
                </div>
              </div>
            </section>

            <section className="settings-section" id="settings-typography" aria-labelledby="settings-typography-title">
              <header className="settings-section__head">
                <span className="settings-section__number" aria-hidden="true">03</span>
                <div className="settings-section__title">
                  <h3 id="settings-typography-title">字体与云游</h3>
                  <p>为分组、标题与正文指定字体，并调校桌面便签的透明度。</p>
                </div>
              </header>
              <div className="settings-section__content">
                <div className="settings-field settings-field--block settings-fonts">
                  <label><TextT size={17} /> 字体设置</label>
                  <div className="settings-fonts__grid">
                    <label>
                      <span>左侧分组</span>
                      <input className="field" list="tidbit-fonts" value={props.fonts.group} onChange={(event) => props.onFontsChange({ ...props.fonts, group: event.target.value })} />
                    </label>
                    <label>
                      <span>便签标题</span>
                      <input className="field" list="tidbit-fonts" value={props.fonts.noteTitle} onChange={(event) => props.onFontsChange({ ...props.fonts, noteTitle: event.target.value })} />
                    </label>
                    <label>
                      <span>便签正文</span>
                      <input className="field" list="tidbit-fonts" value={props.fonts.noteBody} onChange={(event) => props.onFontsChange({ ...props.fonts, noteBody: event.target.value })} />
                    </label>
                  </div>
                  <datalist id="tidbit-fonts">
                    <option value="Microsoft YaHei UI" />
                    <option value="Microsoft YaHei" />
                    <option value="Segoe UI Variable" />
                    <option value="Segoe UI" />
                    <option value="SimHei" />
                    <option value="KaiTi" />
                    <option value="FangSong" />
                  </datalist>
                  <small>可选择常用字体，也可以直接输入电脑中已安装的字体名称。</small>
                </div>

                <div className="settings-field settings-field--block settings-opacity">
                  <label htmlFor="wander-opacity"><Cloud size={17} /> 云游便签透明度 <span>{props.wanderOpacity}%</span></label>
                  <input
                    id="wander-opacity"
                    type="range"
                    min="45"
                    max="100"
                    step="1"
                    value={props.wanderOpacity}
                    onChange={(event) => props.onWanderOpacityChange(Number(event.target.value))}
                  />
                  <div className="settings-opacity__scale"><span>轻透</span><span>不透明</span></div>
                </div>
              </div>
            </section>

            <section className="settings-section" id="settings-data" aria-labelledby="settings-data-title">
              <header className="settings-section__head">
                <span className="settings-section__number" aria-hidden="true">04</span>
                <div className="settings-section__title">
                  <h3 id="settings-data-title">数据与安全</h3>
                  <p>数据目录与隐私锁定都只作用于这台电脑。</p>
                </div>
              </header>
              <div className="settings-section__content">
                <div className="settings-field settings-field--block settings-data-directory">
                  <label htmlFor="data-directory"><HardDrive size={17} /> 数据目录</label>
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
                    <button type="button" className="btn btn-primary" onClick={props.onSaveDataDirectory} disabled={props.dataDirectoryBusy}>迁移并重启</button>
                  </div>
                </div>

                <div className="settings-grid settings-grid--2">
                  <div className="settings-field">
                    <label htmlFor="privacy-pin"><LockKey size={17} /> 隐私锁定密码</label>
                    <input
                      id="privacy-pin"
                      className="field"
                      type="password"
                      inputMode="numeric"
                      maxLength={12}
                      value={props.lockPin}
                      placeholder="留空则无需密码"
                      onChange={(event) => props.onLockPinChange(event.target.value.replace(/\D/g, ""))}
                    />
                    <small>用于遮挡当前界面，不改变数据库加密密钥。</small>
                  </div>

                  <aside className="settings-ledger-note" aria-label="本地数据说明">
                    <ShieldCheck size={22} weight="duotone" />
                    <strong>本地优先</strong>
                    <p>数据目录、加密备份与锁定密码都保存在这台电脑上，不经过云端。</p>
                  </aside>
                </div>
              </div>
            </section>

            <section className="settings-section" id="settings-backup" aria-labelledby="settings-backup-title">
              <header className="settings-section__head">
                <span className="settings-section__number" aria-hidden="true">05</span>
                <div className="settings-section__title">
                  <h3 id="settings-backup-title">备份与恢复</h3>
                  <p>为当前数据创建快照、恢复旧版本，或找回隐藏的窗口。</p>
                </div>
              </header>
              <div className="settings-section__content">
                <div className="settings-actions" aria-label="备份与恢复">
                  <button className="settings-action" disabled={props.busy} onClick={props.onBackup}>
                    <Archive size={21} />
                    <span><strong>立即备份</strong><small>创建加密快照</small></span>
                  </button>
                  <button className="settings-action" disabled={props.busy} onClick={props.onRestore}>
                    <ShieldCheck size={21} />
                    <span><strong>恢复备份</strong><small>重启后替换数据</small></span>
                  </button>
                  <button className="settings-action" onClick={props.onOpenBackups}>
                    <FolderOpen size={21} />
                    <span><strong>打开目录</strong><small>查看备份文件</small></span>
                  </button>
                  <button className="settings-action" onClick={props.onShowHidden}>
                    <Eye size={21} />
                    <span><strong>显示窗口</strong><small>找回已隐藏便签</small></span>
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
