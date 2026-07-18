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
  ShieldCheck,
  TextT,
  X,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import type { FontPreferences } from "../../ui/fontPreferences";
import { commonSystemFonts, normalizeFontFamilies } from "../../ui/systemFonts";
import { defaultMainWindowSize, minimumMainWindowSize } from "../../ui/windowSizePreferences";
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
  dataDirectory: string;
  defaultDataDirectory: string;
  dataDirectoryBusy: boolean;
  onDataDirectoryChange: (path: string) => void;
  onPickDataDirectory: () => void;
  onSaveDataDirectory: () => void;
  onResetDataDirectory: () => void;
}

export function SettingsPanel(props: SettingsPanelProps) {
  const [widthDraft, setWidthDraft] = useState(String(props.windowWidth));
  const [heightDraft, setHeightDraft] = useState(String(props.windowHeight));
  const fontOptions = useMemo(() => normalizeFontFamilies([
    ...props.availableFonts,
    ...commonSystemFonts,
    props.fonts.group,
    props.fonts.noteTitle,
    props.fonts.noteBody,
  ]), [props.availableFonts, props.fonts.group, props.fonts.noteBody, props.fonts.noteTitle]);

  useEffect(() => setWidthDraft(String(props.windowWidth)), [props.windowWidth]);
  useEffect(() => setHeightDraft(String(props.windowHeight)), [props.windowHeight]);

  if (!props.open) return null;
  return (
    <div className="modal-scrim" onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) props.onClose(); }}>
      <section className="settings-panel" role="dialog" aria-label="设置">
        <header className="settings-panel__head">
          <div>
            <span className="settings-panel__eyebrow">TIDBIT</span>
            <h2>设置</h2>
          </div>
          <button className="btn-icon" onClick={props.onClose} aria-label="关闭设置" title="关闭设置">
            <X size={16} weight="bold" />
          </button>
        </header>

        <div className="settings-panel__body">
          <div className="settings-row">
            <div className="settings-row__icon"><Eye size={17} /></div>
            <div className="settings-row__copy">
              <strong>界面主题</strong>
              <span>浅色、深色与护眼模式</span>
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
            <label htmlFor="glass-opacity"><Drop size={16} weight="duotone" /> 液态玻璃不透明度 <span>{props.glassOpacity}%</span></label>
            <input id="glass-opacity" type="range" min="55" max="100" step="1" value={props.glassOpacity} onChange={(event) => props.onGlassOpacityChange(Number(event.target.value))} aria-label="液态玻璃不透明度" />
            <div className="settings-opacity__scale"><span>更通透</span><span>更清晰</span></div>
          </div>

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
                />
              </label>
            </div>
            <div className="settings-window-size__actions">
              <small>拖动窗口边缘后，这里的宽高会自动更新。</small>
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
                disabled={props.windowSizeBusy || !widthDraft || !heightDraft}
                onClick={() => props.onApplyWindowSize(Number(widthDraft), Number(heightDraft))}
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

          <div className="settings-field settings-opacity">
            <label htmlFor="wander-opacity"><Cloud size={16} /> 云游便签透明度 <span>{props.wanderOpacity}%</span></label>
            <input id="wander-opacity" type="range" min="45" max="100" step="1" value={props.wanderOpacity} onChange={(event) => props.onWanderOpacityChange(Number(event.target.value))} />
            <div className="settings-opacity__scale"><span>轻透</span><span>不透明</span></div>
          </div>

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
              <button type="button" className="btn btn-primary" onClick={props.onSaveDataDirectory} disabled={props.dataDirectoryBusy}>迁移并重启</button>
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
            <button className="settings-action" onClick={props.onShowHidden}>
              <Eye size={18} />
              <span><strong>显示窗口</strong><small>找回已隐藏便签</small></span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
