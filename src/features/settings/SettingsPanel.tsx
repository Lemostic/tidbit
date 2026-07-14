import {
  Archive,
  ClockCounterClockwise,
  Eye,
  FolderOpen,
  HardDrive,
  LockKey,
  PushPin,
  Cloud,
  Copy,
  Drop,
  ShieldCheck,
  TextT,
  X,
} from "@phosphor-icons/react";
import type { FontPreferences } from "../../ui/fontPreferences";
import type { NoteCopyFormat } from "../../ui/noteCopy";
import { supportedLocales, useI18n, type Locale } from "../../i18n";
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
  copyFormat: NoteCopyFormat;
  backupIntervalHours: number;
  backupRetentionCount: number;
  onClose: () => void;
  onDockingChange: (enabled: boolean) => void;
  onLockPinChange: (pin: string) => void;
  onFontsChange: (fonts: FontPreferences) => void;
  onWanderOpacityChange: (opacity: number) => void;
  onGlassChange: (enabled: boolean) => void;
  onGlassOpacityChange: (opacity: number) => void;
  onCopyFormatChange: (format: NoteCopyFormat) => void;
  onBackupIntervalChange: (hours: number) => void;
  onBackupRetentionChange: (count: number) => void;
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
  const { locale, setLocale, t } = useI18n();
  if (!props.open) return null;
  return (
    <div className="modal-scrim" onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) props.onClose(); }}>
      <section className="settings-panel" role="dialog" aria-label={t("settings.title")}>
        <header className="settings-panel__head">
          <div>
            <span className="settings-panel__eyebrow">TIDBIT</span>
            <h2>{t("settings.title")}</h2>
          </div>
          <button className="btn-icon" onClick={props.onClose} aria-label={t("common.close")} title={t("common.close")}>
            <X size={16} weight="bold" />
          </button>
        </header>

        <div className="settings-panel__body">
          <div className="settings-row settings-language">
            <div className="settings-row__icon"><TextT size={17} /></div>
            <div className="settings-row__copy">
              <strong>{t("language.label")}</strong>
              <span>{t("language.description")}</span>
            </div>
            <select className="select" value={locale} onChange={(event) => setLocale(event.target.value as Locale)} aria-label={t("language.label")}>
              {supportedLocales.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
            </select>
          </div>
          <div className="settings-row">
            <div className="settings-row__icon"><Eye size={17} /></div>
            <div className="settings-row__copy">
              <strong>{t("settings.theme")}</strong>
              <span>{t("settings.themeDescription")}</span>
            </div>
            <ThemeSwitcher expanded />
          </div>

          <div className="settings-row">
            <div className="settings-row__icon settings-row__icon--glass"><Drop size={17} weight="duotone" /></div>
            <div className="settings-row__copy">
              <strong>{t("settings.glass")}</strong>
              <span>{t("settings.glassDescription")}</span>
            </div>
            <input
              type="checkbox"
              className="switch"
              checked={props.glassEnabled}
              onChange={(event) => props.onGlassChange(event.target.checked)}
              aria-label={t("settings.glass")}
            />
          </div>

          <div className="settings-field settings-opacity">
            <label htmlFor="glass-opacity"><Drop size={16} weight="duotone" /> {t("settings.glassOpacity")} <span>{props.glassOpacity === 100 ? `100% · ${t("settings.solid")}` : `${props.glassOpacity}%`}</span></label>
            <input id="glass-opacity" type="range" min="65" max="100" step="1" value={props.glassOpacity} onChange={(event) => props.onGlassOpacityChange(Number(event.target.value))} aria-label={t("settings.glassOpacity")} />
            <div className="settings-opacity__scale"><span>{t("settings.softGlass")}</span><span>{t("settings.opaque")}</span></div>
          </div>

          <div className="settings-row">
            <div className="settings-row__icon"><PushPin size={17} /></div>
            <div className="settings-row__copy">
              <strong>{t("settings.dock")}</strong>
              <span>{t("settings.dockDescription")}</span>
            </div>
            <input
              type="checkbox"
              className="switch"
              checked={props.dockingEnabled}
              onChange={(e) => props.onDockingChange(e.target.checked)}
              aria-label={t("settings.dock")}
            />
          </div>

          <div className="settings-field settings-fonts">
            <label><TextT size={16} /> {t("settings.fonts")}</label>
            <div className="settings-fonts__grid">
              <label><span>{t("settings.groupFont")}</span><input className="field" list="tidbit-fonts" value={props.fonts.group} onChange={(e) => props.onFontsChange({ ...props.fonts, group: e.target.value })} /></label>
              <label><span>{t("settings.titleFont")}</span><input className="field" list="tidbit-fonts" value={props.fonts.noteTitle} onChange={(e) => props.onFontsChange({ ...props.fonts, noteTitle: e.target.value })} /></label>
              <label><span>{t("settings.bodyFont")}</span><input className="field" list="tidbit-fonts" value={props.fonts.noteBody} onChange={(e) => props.onFontsChange({ ...props.fonts, noteBody: e.target.value })} /></label>
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
            <small>{t("settings.fontHelp")}</small>
          </div>

          <div className="settings-row settings-copy-format">
            <div className="settings-row__icon"><Copy size={17} /></div>
            <div className="settings-row__copy">
              <strong>{t("settings.copyFormat")}</strong>
              <span>{t("settings.copyDescription")}</span>
            </div>
            <select
              className="select"
              value={props.copyFormat}
              onChange={(event) => props.onCopyFormatChange(event.target.value as NoteCopyFormat)}
              aria-label={t("settings.copyFormat")}
            >
              <option value="markdown">Markdown</option>
              <option value="plain">{t("settings.formattedText")}</option>
            </select>
          </div>

          <div className="settings-field settings-opacity">
            <label htmlFor="wander-opacity"><Cloud size={16} /> {t("settings.wanderOpacity")} <span>{props.wanderOpacity}%</span></label>
            <input id="wander-opacity" type="range" min="60" max="100" step="1" value={props.wanderOpacity} onChange={(event) => props.onWanderOpacityChange(Number(event.target.value))} />
            <div className="settings-opacity__scale"><span>{t("settings.softGlass")}</span><span>{t("settings.opaque")}</span></div>
          </div>

          <div className="settings-field settings-data-directory">
            <label htmlFor="data-directory"><HardDrive size={16} /> {t("settings.dataDirectory")}</label>
            <div className="settings-data-directory__control">
              <input
                id="data-directory"
                className="field"
                value={props.dataDirectory}
                onChange={(event) => props.onDataDirectoryChange(event.target.value)}
                spellCheck={false}
              />
              <button type="button" className="btn" onClick={props.onPickDataDirectory} disabled={props.dataDirectoryBusy}>{t("common.select")}</button>
            </div>
            <div className="settings-data-directory__actions">
              <small>{t("settings.dataDirectoryHelp")}</small>
              <button type="button" className="btn btn-ghost" onClick={props.onResetDataDirectory} disabled={props.dataDirectoryBusy || props.dataDirectory === props.defaultDataDirectory}>{t("common.restoreDefault")}</button>
              <button type="button" className="btn btn-primary" onClick={props.onSaveDataDirectory} disabled={props.dataDirectoryBusy}>{t("settings.migrateRestart")}</button>
            </div>
          </div>

          <div className="settings-field settings-opacity settings-auto-backup">
            <label htmlFor="backup-interval"><ClockCounterClockwise size={16} /> {t("settings.autoBackupInterval")} <span>{t("settings.hours", { value: props.backupIntervalHours })}</span></label>
            <input id="backup-interval" type="range" min="0.5" max="24" step="0.5" value={props.backupIntervalHours} onChange={(event) => props.onBackupIntervalChange(Number(event.target.value))} aria-label={t("settings.autoBackupInterval")} />
            <div className="settings-opacity__scale"><span>{t("settings.everyHalfHour")}</span><span>{t("settings.everyDay")}</span></div>
          </div>

          <div className="settings-field settings-opacity settings-auto-backup">
            <label htmlFor="backup-retention"><Archive size={16} /> {t("settings.autoBackupRetention")} <span>{t("settings.copies", { value: props.backupRetentionCount })}</span></label>
            <input id="backup-retention" type="range" min="1" max="10" step="1" value={props.backupRetentionCount} onChange={(event) => props.onBackupRetentionChange(Number(event.target.value))} aria-label={t("settings.autoBackupRetention")} />
            <div className="settings-opacity__scale"><span>{t("settings.keepOne")}</span><span>{t("settings.keepTen")}</span></div>
          </div>

          <div className="settings-field">
            <label htmlFor="privacy-pin"><LockKey size={16} /> {t("settings.privacyPin")}</label>
            <input
              id="privacy-pin"
              className="field"
              type="password"
              inputMode="numeric"
              maxLength={12}
              value={props.lockPin}
              placeholder={t("settings.pinPlaceholder")}
              onChange={(e) => props.onLockPinChange(e.target.value.replace(/\D/g, ""))}
            />
            <small>{t("settings.pinHelp")}</small>
          </div>

          <div className="settings-actions" aria-label={t("settings.backupActions")}>
            <button className="settings-action" disabled={props.busy} onClick={props.onBackup}>
              <Archive size={18} />
              <span><strong>{t("settings.backupNow")}</strong><small>{t("settings.backupNowDescription")}</small></span>
            </button>
            <button className="settings-action" disabled={props.busy} onClick={props.onRestore}>
              <ShieldCheck size={18} />
              <span><strong>{t("settings.restore")}</strong><small>{t("settings.restoreDescription")}</small></span>
            </button>
            <button className="settings-action" onClick={props.onOpenBackups}>
              <FolderOpen size={18} />
              <span><strong>{t("settings.openDirectory")}</strong><small>{t("settings.openDirectoryDescription")}</small></span>
            </button>
            <button className="settings-action" onClick={props.onShowHidden}>
              <Eye size={18} />
              <span><strong>{t("settings.showWindows")}</strong><small>{t("settings.showWindowsDescription")}</small></span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
