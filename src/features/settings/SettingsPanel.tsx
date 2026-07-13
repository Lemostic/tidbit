import {
  Archive,
  Eye,
  FolderOpen,
  HardDrive,
  LockKey,
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
  lockPin: string;
  busy: boolean;
  fonts: FontPreferences;
  wanderOpacity: number;
  glassEnabled: boolean;
  glassOpacity: number;
  onClose: () => void;
  onDockingChange: (enabled: boolean) => void;
  onLockPinChange: (pin: string) => void;
  onFontsChange: (fonts: FontPreferences) => void;
  onWanderOpacityChange: (opacity: number) => void;
  onGlassChange: (enabled: boolean) => void;
  onGlassOpacityChange: (opacity: number) => void;
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

          <div className="settings-field settings-fonts">
            <label><TextT size={16} /> 字体设置</label>
            <div className="settings-fonts__grid">
              <label><span>左侧分组</span><input className="field" list="tidbit-fonts" value={props.fonts.group} onChange={(e) => props.onFontsChange({ ...props.fonts, group: e.target.value })} /></label>
              <label><span>便签标题</span><input className="field" list="tidbit-fonts" value={props.fonts.noteTitle} onChange={(e) => props.onFontsChange({ ...props.fonts, noteTitle: e.target.value })} /></label>
              <label><span>便签正文</span><input className="field" list="tidbit-fonts" value={props.fonts.noteBody} onChange={(e) => props.onFontsChange({ ...props.fonts, noteBody: e.target.value })} /></label>
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
