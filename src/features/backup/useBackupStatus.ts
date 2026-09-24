import { invoke } from "@tauri-apps/api/core";
import { useMemo } from "react";

export type AutoBackupSettings = {
  enabled: boolean;
  intervalHours: number;
  retentionCount: number;
};

// Mirrors the Rust-side defaults so the UI stays correct before the first
// query resolves (and in browser mocks where IPC is unavailable).
export const AUTO_BACKUP_DEFAULTS: AutoBackupSettings = {
  enabled: true,
  intervalHours: 1,
  retentionCount: 20,
};

export function useBackupStatus() {
  // Memoized so consumers can safely list `backup` in effect/callback deps.
  return useMemo(
    () => ({
      list: () => invoke<string[]>("backup_list"),
      snapshotNow: () => invoke<string>("backup_snapshot_now"),
      restore: (file: string) => invoke<void>("backup_restore", { file }),
      openDirectory: () => invoke<void>("backup_open_dir"),
      settings: () => invoke<AutoBackupSettings>("backup_settings_get"),
      saveSettings: (settings: AutoBackupSettings) =>
        invoke<AutoBackupSettings>("backup_settings_set", { settings }),
    }),
    [],
  );
}
