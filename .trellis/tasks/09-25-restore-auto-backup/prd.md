# 恢复自动备份功能

## Goal

恢复设置中的自动备份:默认开启,每次启动应用自动备份一次,按固定间隔(默认 1 小时)周期备份,自动备份默认保留 20 份,均可在设置中调整。

## Background and confirmed facts

- 自动备份在 0.1.1(`682b978`)实现:`src-tauri/src/backup/scheduler.rs` 含 watch-channel 调度循环 + `backup-settings.json` 持久化 + `auto_` 前缀快照与 prune;设置面板有间隔/保留滑杆。
- `3fbfc74`(2026-08-01 合并冲突同步)将 scheduler.rs 替换为空壳 stub,前端 UI 与 i18n 一并移除,此后自动备份不可用。这是"功能消失"的根因。
- 现存可复用基础设施:`snapshot::create_snapshot/restore_snapshot`(加密快照)、`backup_snapshot_now/backup_list/backup_restore/backup_open_dir` 命令、手动备份(无前缀)不受 prune 影响的约定、`backup-settings.json` 旧格式(`interval_hours`/`retention_count`)。
- 当前 tokio 已启用 `sync`/`time` feature,watch-channel 方案可直接恢复。
- 备份密钥为 `state::BackupKey`(当前为零密钥),快照格式不变,旧备份仍可恢复。

## Requirements

- R1 设置面板"维护"分区新增自动备份设置:开关(默认开启)、备份间隔(默认 1 小时,可调 0.5–24 小时、0.5 步进)、保留份数(默认 20,可调 1–100)。
- R2 每次打开软件时自动触发一次备份;之后按间隔周期备份;修改设置后下一个周期按新间隔生效。
- R3 自动备份写入 `auto_<时间戳>.tidbit.bak`,超出保留数量时从最旧开始清理;仅清理 `auto_` 前缀文件,手动"立即备份"产物不受影响。
- R4 设置持久化到数据目录 `backup-settings.json`,重启后保留;旧格式文件(无 `enabled` 字段)按默认开启解读。
- R5 自动备份失败静默(写日志即可),不影响前台使用;备份在后台线程执行,不阻塞启动与 UI。

## Acceptance Criteria

- [ ] 设置面板出现"自动备份"开关(默认开启)与间隔/保留份数控件,调整后立即持久化并生效。
- [ ] 启动应用后 backups 目录出现新的 `auto_*.tidbit.bak`;保留数量超过上限时最旧的自动备份被清理。
- [ ] 手动备份文件(无 `auto_` 前缀)数量不受保留上限影响。
- [ ] `cargo test`(含恢复的 backup_scheduler 集成测试)与 `vitest` 相关用例通过;typecheck/lint 通过。
- [ ] 设置面板截图核对新 UI 在亮/暗主题下正常。

## Out of scope

- 不改变快照加密格式与恢复流程;不引入新的 KDF(密钥仍为 BackupKey)。
- 不做备份到云端/远程存储。
- 不恢复 0.1.1 的 i18n 资源体系(当前应用为中文硬编码文案)。

## Decisions

- 复用 0.1.1 的调度结构(watch channel + select 循环),在其上补 `enabled`、启动即备份、新默认值(1h/20 份,旧默认 1h/1 份)。
- 保留 `backup-settings.json` 文件名与 `interval_hours` 字段名,旧文件无 `enabled` 时 serde 默认补 true,老用户无感迁移。
- IPC 用 `backup_settings_get` / `backup_settings_set`(camelCase DTO),前端沿用 useBackupStatus hook 扩展。
