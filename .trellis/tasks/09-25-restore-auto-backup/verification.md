# 验证记录(2026-09-25)

## 实现摘要

- `src-tauri/src/backup/scheduler.rs` 重写:恢复 watch-channel 调度循环,新增 `enabled` 开关(默认 true)、启动即备份一次、间隔默认 1 小时(clamp 0.5–24、0.5 步进)、保留份数默认 20(clamp 1–100)。设置持久化 `backup-settings.json`;serde `rename_all = "camelCase"` + `alias` 兼容 0.1.x 的 snake_case 旧文件(无 `enabled` 字段默认开启)。`auto_` 前缀快照,prune 只清自动备份,手动备份不受影响。失败走 tracing::warn,不阻塞 UI。
- `src-tauri/src/ipc/backup.rs`:新增 `backup_settings_get` / `backup_settings_set`(set 经 BackupScheduler.update 广播并返回 normalized 值;调度器未就绪时仅持久化)。
- `src-tauri/src/lib.rs`:invoke_handler 注册两个新命令;setup 在 BackupKey manage 后调用 `backup::scheduler::start(app.handle().clone())`。
- 前端:`useBackupStatus` 增 `settings`/`saveSettings` + `AUTO_BACKUP_DEFAULTS`(返回对象 useMemo 化,保证 effect 依赖稳定);SettingsPanel 维护分区新增自动备份开关行 + 间隔/保留滑杆(关闭时禁用);App 挂载时拉取设置、乐观更新 + normalized 回写。
- 测试:恢复 `src-tauri/tests/backup_scheduler.rs`(5 用例:默认值、旧格式兼容、clamp 持久化、25→20 轮转且保留手动备份、快照命名);SettingsPanel.test.tsx 新增开关/滑杆用例,焦点陷阱测试改为动态取最后可聚焦元素(原假设"显示窗口为最后控件"因新增控件失效)。

## 验证结果

- `cargo check` 通过;`cargo fmt` 已执行。
- `cargo test`:全部套件通过(31+3+5+…);唯一失败为 `--test hotkey`,基线(stash 改动后)复现同一 STATUS_ENTRYPOINT_NOT_FOUND(0xc0000139,DLL 环境问题),与本次无关。
- `pnpm typecheck`、`pnpm lint` 通过;`pnpm test` 179/179 通过。
- 截图(本目录):`backup-settings-evernote.png`(默认开/1 小时/20 份)、`backup-settings-toggled.png` 与 `backup-settings-dark.png`(关闭态:开关关闭、间隔 4 小时、滑杆禁用)。IPC mock 实测 `backup_settings_set` 收到 `{enabled:false, intervalHours:4}`。
- 未验证:真实 WebView2 下启动备份的实际落盘(需真机运行);`cargo test --test hotkey` 环境问题遗留。

## 提交计划(待确认)

1. `feat(backup): restore auto backup with startup snapshot, hourly interval and 20-copy retention`
   - src-tauri/src/backup/scheduler.rs、src-tauri/src/ipc/backup.rs、src-tauri/src/lib.rs、src-tauri/tests/backup_scheduler.rs
   - src/features/backup/useBackupStatus.ts、src/features/settings/SettingsPanel.tsx、src/App.tsx、src/tests/SettingsPanel.test.tsx
   - 本任务目录(prd/验证记录/截图/脚本)
