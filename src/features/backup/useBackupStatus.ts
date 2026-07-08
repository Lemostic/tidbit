import { invoke } from "@tauri-apps/api/core";

export function useBackupStatus() {
  return {
    list: () => invoke<string[]>("backup_list"),
    snapshotNow: () => invoke<string>("backup_snapshot_now"),
    restore: (file: string) => invoke<string>("backup_restore", { file }),
  };
}
