import { invoke } from "@tauri-apps/api/core";

export interface BackupSettings {
  interval_hours: number;
  retention_count: number;
}

export function useBackupStatus() {
  return {
    list: () => invoke<string[]>("backup_list"),
    snapshotNow: () => invoke<string>("backup_snapshot_now"),
    restore: (file: string) => invoke<void>("backup_restore", { file }),
    openDirectory: () => invoke<void>("backup_open_dir"),
    getSettings: () => invoke<BackupSettings>("backup_settings_get"),
    saveSettings: (settings: BackupSettings) => invoke<BackupSettings>("backup_settings_set", {
      intervalHours: settings.interval_hours,
      retentionCount: settings.retention_count,
    }),
  };
}
