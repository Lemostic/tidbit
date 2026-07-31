# tidbit

一款面向 Windows 与 macOS 的桌面便签应用，使用 Tauri 2、Rust、React 18、TypeScript 与 SQLCipher 构建。

## 主要功能

- 书签式分组栏：独立标记色与背景色、选中突出、分组编辑与删除。
- 便签管理：Markdown/富文本渲染、动态高度、折叠、归档、隐藏内容、置顶。
- 语音备忘录：在便签内直接录音，以独立内容块播放、重命名或删除，默认使用录制时间作为名称。
- 时间轴卡片：在便签内插入结构化时间轴，编辑日期、时间、事件标题和说明，并支持节点增删与排序。
- 拖放整理：便签在当前分组内排序，也可以拖到其他分组。
- 云游便签：将便签固定到桌面，支持自动排列与吸附、折叠、关闭、卡片内编辑和透明度设置。
- 快速搜索：Windows 按 `Ctrl+K`、macOS 按 `Command+K` 打开搜索面板。
- 窗口行为：Windows 保留自定义标题栏、边缘吸附及自动隐藏；macOS 使用原生窗口控制，首版不启用边缘吸附和自动隐藏。
- 系统启动：可在设置中开启或关闭登录系统后自动启动，默认关闭。
- 个性化：浅色、深色、护眼主题，液态玻璃开关及 55%–100% 不透明度，默认 80%。
- 字体设置：分组、便签标题和正文可分别指定字体。
- 数据管理：默认使用平台应用数据目录，支持迁移到自定义目录、备份与恢复。
- 隐私保护：隐藏内容占位显示、隐私锁定、SQLCipher 数据库加密。

## 开发环境

- Windows 10/11，或 macOS 12 及以上版本
- Node.js 与 pnpm
- Rust stable 与对应平台的 Tauri 2 构建依赖
- Windows：WebView2 Runtime、Visual Studio C++ Build Tools、Strawberry Perl（首次编译 vendored OpenSSL 时需要）
- macOS：Xcode Command Line Tools

```shell
pnpm install --frozen-lockfile
pnpm tauri dev
```

仅调试前端可以运行 `pnpm dev`。窗口、托盘、系统菜单、开机启动、目录选择和云游功能必须在 Tauri 环境中验证。

## 质量检查

```shell
pnpm typecheck
pnpm test
pnpm lint
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
```

Windows 上若完整 `cargo test` 的 `hotkey` 测试进程出现 `STATUS_ENTRYPOINT_NOT_FOUND`，需要单独核对本机运行库；仓库中的业务与仓储测试仍应分别执行并确认。

## 构建发布版

### Windows

构建前先退出正在运行的 `tidbit.exe`，否则 Windows 会锁定目标文件。

```powershell
pnpm tauri build --bundles nsis,msi
```

典型输出：

- `src-tauri/target/release/tidbit.exe`：独立可执行文件
- `src-tauri/target/release/bundle/nsis/tidbit_0.1.2_x64-setup.exe`：NSIS 安装程序
- `src-tauri/target/release/bundle/msi/tidbit_0.1.2_x64_en-US.msi`：MSI 安装程序

未签名构建首次运行时可能触发 Windows SmartScreen 提示。

### macOS

发布包为同时支持 Apple Silicon 与 Intel 的 universal DMG。首次构建前安装两个 Rust target：

```shell
rustup target add aarch64-apple-darwin x86_64-apple-darwin
pnpm tauri build --target universal-apple-darwin --bundles dmg
```

典型输出为 `src-tauri/target/universal-apple-darwin/release/bundle/dmg/tidbit_0.1.2_universal.dmg`。普通主分支构建会生成未签名测试 artifact；GitHub Release 使用以下 secrets 完成签名和公证后再发布：

- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_ID`
- `APPLE_PASSWORD`
- `APPLE_TEAM_ID`

## 数据与设置

- Windows 标识符为 `tidbit`，默认应用数据目录为 `%APPDATA%\tidbit`；旧的 `%APPDATA%\dev.tidbit.app` 数据会在启动时迁移。
- macOS Bundle ID 为 `com.tidbit.app`，默认数据目录位于 `~/Library/Application Support/com.tidbit.app`。
- 主题、液态玻璃、不透明度、字体与云游透明度存储在本机用户设置中。
- 开机自动启动默认关闭；Windows 使用当前用户注册表启动项，macOS 使用 LaunchAgent。
- 数据目录迁移会移动数据库和备份，并重启应用。

## 技术栈

| 层级 | 技术 |
|---|---|
| 桌面框架 | Tauri 2 |
| 后端 | Rust |
| 前端 | React 18 + TypeScript + Vite |
| 编辑器 | Tiptap / ProseMirror |
| 数据库 | SQLCipher / rusqlite |
| 加密 | AES-256-GCM + PBKDF2-SHA512 |
| 图标 | Phosphor Icons |

## 文档

- [更新日志](./CHANGELOG.md)
- [架构说明](./docs/dev/architecture.md)
- [开发交接](./docs/dev/handoff.md)
- [设计规格](./docs/superpowers/specs/2026-07-09-tidbit-sticky-notes-design.md)
- [实现计划](./docs/superpowers/plans/2026-07-09-tidbit-sticky-notes-impl.md)

## 安全说明

数据库已启用静态加密，备份使用 AES-256-GCM。当前密钥衍生与生产级凭据管理仍需在正式发布前完成安全审计，不应把现有开发配置视为最终的密钥管理方案。
