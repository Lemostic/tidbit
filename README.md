# tidbit

> 一款面向 Windows 的桌面便签应用，使用 Tauri 2、Rust、React 18、TypeScript 与 SQLCipher 构建。
> A Windows desktop sticky-note app built with Tauri 2, Rust, React 18, TypeScript and SQLCipher.

[![Built with Tauri 2](https://img.shields.io/badge/Tauri-2-24C8DB.svg)](#-技术栈)
[![Platform - Windows 10/11](https://img.shields.io/badge/Platform-Windows%2010%2F11-0078D4.svg)](#-系统要求)
[![React 18](https://img.shields.io/badge/React-18-61DAFB.svg)](#-技术栈)
[![SQLCipher](https://img.shields.io/badge/SQLCipher-encrypted-003B57.svg)](#-安全)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#-贡献)

---

<!-- ![tidbit 主界面](docs/screenshots/main.png) -->

## ✨ 特性

### 核心
- **分组便签**：书签式分组栏，独立标记色与背景色，选中突出，分组编辑、删除与拖放管理。
- **Markdown 与富文本**：Tiptap/ProseMirror 驱动，支持代码块、任务清单、表格、附件、时间轴卡片等块。
- **语音备忘录**：在便签内直接录音，以独立内容块播放、重命名或删除，默认用录制时间作为名称。
- **时间轴卡片**：结构化时间轴，编辑日期、时间、事件标题和说明，支持节点增删与排序。
- **图片附件**：粘贴或拖入图片自动存盘并插入便签，正文里走专用协议避免 base64 膨胀。

### 组织与查找
- **拖放整理**：便签在当前分组内排序，也可以拖到其他分组或"全部便签"。
- **回收站**：误删的便签在回收站保留 30 天，可逐条恢复或彻底删除。
- **版本历史**：每次保存写入快照，支持预览历史版本并一键恢复，恢复前先保留当前内容保证可撤销。
- **标签管理**：便签可贴多个标签；顶部筛选栏按标签快速定位；标签支持独立于便签的全局管理（重命名 / 删除 / 改全部便签）。
- **快速搜索**：`Ctrl+K` 打开搜索面板，多关键词 AND 语义，标题命中权重高于正文，结果高亮命中词，可按标签 / 是否包含归档做范围过滤。

### 提醒
- **单次提醒**：在便签内设定时间，到点系统通知。
- **重复提醒**：每天 / 每周 / 每月 / 每年，到点自动推进到下一条。
- **稍后提醒**：5 分钟 / 15 分钟 / 1 hour / 明天上午 9 点一键延后。

### 窗口与云游
- **云游便签**：将便签固定到桌面，可调透明度、可排序吸附、折叠关闭、卡片内直接编辑。
- **撕出独立窗口**：右键便签"撕出"，便签独立为单窗口编辑器，方便参照其他内容。
- **窗口行为**：自定义标题栏拖动、最小化到托盘、边缘吸附及 0.5 秒自动隐藏动画。

### 个性化与隐私
- **主题**：浅色 / 深色 / 护眼（sepia）/ tokyo-night / wechat，五套配色。
- **液态玻璃**：macOS 风格的实体背景 + 强模糊，55%–100% 强度可调，默认 80%。
- **字体设置**：分组、便签标题和正文可分别指定字体。
- **隐藏内容**：便签正文一键隐藏，列表只显示占位文字。
- **隐私锁定**：可设 PIN，应用切到后台再回来时锁定。
- **数据迁移**：默认 `%APPDATA%\tidbit`，支持迁移到任意目录与加密备份 / 恢复。
- **开机自启**：可选 Windows 开机自动启动（默认关闭）。

---

## 🚀 下载

> 本仓库的安装包由 GitHub Actions `release.yml` 在打 `v*` tag 时自动构建并发布到 [Releases](../../releases)。手动构建见下方 [💻 开发](#-开发) 与 [打包发布版](#打包发布版)。

### 系统要求

- **操作系统**：Windows 10 / 11（64-bit）
- **运行时**：WebView2 Runtime（Win11 自带，Win10 需 [手动安装](https://developer.microsoft.com/microsoft-edge/webview2/)）
- **存储**：约 80 MB（安装包 + 本地数据库与备份）

### 安装包

- **NSIS 安装程序**（推荐）：`tidbit_x.x.x_x64-setup.exe` —— 一键安装，可选安装目录与开始菜单快捷方式。
- **MSI 安装程序**（企业 / 组策略）：`tidbit_x.x.x_x64_zh-CN.msi` —— 静默安装友好，方便域控分发。

未签名构建首次运行会触发 Windows SmartScreen 警告（预期），点"仍要运行"即可。

---

## 💻 开发

### 环境要求

| 工具 | 版本 |
|---|---|
| Node.js | 20+（CI 用 24） |
| 包管理器 | pnpm 11+ |
| Rust | stable（rustup 安装 rustfmt + clippy 组件） |
| Tauri 2 | 通过 [tauri-apps/create-tauri-app](https://tauri.app/) 文档安装 Windows 工具链 |
| WebView2 | 见上文 |
| Strawberry Perl | 仅首次编译 vendored OpenSSL 时需要，确保 `C:\Strawberry\perl\bin` 与 `C:\Strawberry\c\bin` 在 PATH 前部 |

### 常用命令

```powershell
# 安装依赖
pnpm install

# 开发模式（Tauri + Vite + 完整窗口）
pnpm tauri dev

# 仅前端调试（无 Tauri 窗口，浏览器打开 http://localhost:1420）
pnpm dev

# 质量检查
pnpm typecheck
pnpm lint
pnpm test
cd src-tauri
cargo check
cargo test --lib      # CI 用：规避 hotkey 系统级测试
cargo bench           # 仓储基准（criterion）
```

> 完整工程配置、构建命令清单、所有测试命令、依赖说明见 [`docs/dev/handoff.md`](docs/dev/handoff.md)。

### 打包发布版

构建前先退出正在运行的 `tidbit.exe`，否则 Windows 会锁定目标文件。

```powershell
pnpm tauri build
```

典型输出：

- `src-tauri/target/release/tidbit.exe` —— 独立可执行文件
- `src-tauri/target/release/bundle/nsis/tidbit_x.x.x_x64-setup.exe` —— NSIS 安装程序
- `src-tauri/target/release/bundle/msi/tidbit_x.x.x_x64_zh-CN.msi` —— MSI 安装程序

未签名构建首次运行时可能触发 Windows SmartScreen 提示。

### 项目结构

```
.
├── src/                  # React + TypeScript 前端
│   ├── features/         # 按功能域拆分（groups / notes / search / settings / ...）
│   ├── ui/               # 通用组件与工具（motion、theme、appearance、glass）
│   ├── ipc/              # 客户端 IPC 客户端 + Zod schema + 类型
│   ├── styles/           # CSS（tokens / globals / refinement / apple）
│   ├── App.tsx           # 主窗口入口（普通便签视图 / 回收站视图）
│   └── main.tsx          # Vite 入口，按窗口 label 分派主 / 云游 / 编辑器 / 撕出窗口
├── src-tauri/            # Rust 后端
│   ├── src/
│   │   ├── domain/       # 领域类型（Note / Group / Tag / Reminder / Revision ...）
│   │   ├── repo/         # 仓储（note / group / tag / revision / reminder ...）
│   │   ├── ipc/          # Tauri 命令（notes / tags / search / detach / wander ...）
│   │   ├── infra/        # db（SQLCipher 连接池）/ migrations
│   │   ├── security/     # 密钥衍生 / 备份加密
│   │   └── lib.rs        # 应用入口、托盘、热键、提醒轮询
│   ├── migrations/       # SQL 迁移（0001_init … 0010_note_reminder）
│   ├── tests/            # 集成测试（cargo test --test <name>）
│   └── tauri.conf.json   # Tauri 配置（CSP / 窗口 / 安装包 targets）
├── docs/
│   ├── dev/
│   │   ├── architecture.md   # 架构说明
│   │   └── handoff.md        # 完整开发交接（环境 / 配置 / 命令 / 测试 / 风险）
│   └── superpowers/
│       ├── specs/        # 设计文档
│       └── plans/        # 实施计划
└── README.md
```

---

## 🏗️ 技术栈

| 层级 | 技术 |
|---|---|
| 桌面框架 | [Tauri 2](https://tauri.app/) |
| 后端 | Rust（tokio + rusqlite + r2d2） |
| 前端 | React 18 + TypeScript + Vite 5 |
| 编辑器 | [Tiptap](https://tiptap.dev/) / ProseMirror 3 + tiptap-markdown 0.9 |
| 数据库 | [SQLCipher](https://www.zetetic.net/sqlcipher/) / rusqlite 0.31 |
| 加密 | AES-256-GCM + PBKDF2-SHA512 + Argon2 |
| 动效 | GSAP 3 + 自定义 motion tokens（cubic-bezier / spring） |
| 图标 | [Phosphor Icons](https://phosphoricons.com/) |
| E2E | Playwright（与 `tauri-driver` 配对） |

---

## 📂 数据与设置

- **Tauri identifier**：`tidbit`
- **默认数据目录**：`%APPDATA%\tidbit\`（Windows），可迁移到任意路径
- **数据库**：`tidbit.db`（SQLCipher 加密，PRAGMA key）
- **备份目录**：`%APPDATA%\tidbit\backups\`（AES-256-GCM 加密的 `.zip`）
- **历史迁移**：旧的 `%APPDATA%\dev.tidbit.app\` 在启动时自动迁移到新目录
- **本地设置**（`localStorage`）：主题、液态玻璃强度、字体偏好、云游透明度
- **数据目录迁移**：迁移会移动数据库和备份，并自动重启应用

---

## 🔐 安全

- 数据库使用 SQLCipher 全文件静态加密（PRAGMA key + PBKDF2 KDF）
- 备份使用 AES-256-GCM（v1 使用 zeroed key，开发中）
- Argon2 用于加密操作中的二次密钥衍生
- 提醒数据与便签内容一起存于加密数据库

> 当前密钥衍生与生产级凭据管理仍需在正式发布前完成安全审计。
> 不应把现有开发配置视为最终的密钥管理方案。

---

## 🤝 贡献

欢迎 PR / Issue：

1. Fork & `pnpm install && pnpm tauri dev` 本地验证
2. 提交前跑 `pnpm typecheck && pnpm lint && pnpm test` 与 `cd src-tauri && cargo test --lib`
3. 复杂改动先写设计文档到 `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
4. 提交信息遵循 Conventional Commits（`feat:` / `fix:` / `chore:` / ...）

阅读 [`docs/dev/handoff.md`](docs/dev/handoff.md) 了解完整的工程约定与风险清单。

---

## 📚 文档

- [更新日志](./CHANGELOG.md)
- [架构说明](./docs/dev/architecture.md)
- [完整开发交接](./docs/dev/handoff.md)（环境 / 命令 / 测试 / 风险）
- [设计规格（阶段 A）](./docs/superpowers/specs/2026-07-09-tidbit-sticky-notes-design.md)
- [实现计划（阶段 A）](./docs/superpowers/plans/2026-07-09-tidbit-sticky-notes-impl.md)

---

## 📄 License

[MIT](./LICENSE) © tidbit contributors

---

> Made with Tauri + Rust + React. **Enjoy your notes.**