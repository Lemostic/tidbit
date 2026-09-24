# Technical Design

## Approved 0.2.10 extension

See [next-iteration-plan.md](next-iteration-plan.md) for the approved table node/serializer/sanitizer boundary and recording lifecycle/audio processing design. These are added to the earlier theme scope. Frontend dependency lockfile updates are necessary for Tiptap table support; the recording path stays local and retains the existing audio HTML node contract. No database migration is added by 0.2.10.

## Boundaries

界面改造限定在前端主题与样式层：`src/ui/theme.ts`、`src/features/settings/ThemeSwitcher.tsx`、`src/App.tsx` 的主题类型/循环列表，以及 `src/styles/tokens.css` 和现有全局样式层。组件业务状态、IPC 和 Tauri 窗口协议不变。

## Theme contract

`Theme` 增加 `evernote`。主题切换器、App 的循环主题列表、主题标签和图标映射必须共享同一组合法值，避免字符串分叉。`applyTheme` 继续通过 `data-theme` 设置根节点；localStorage key 与 `broadcastAppearance` 保持现有约定。

`tokens.css` 为 `data-theme="evernote"` 提供完整 token 覆盖：`--bg`、`--surface`、`--surface-2`、`--fg`、`--fg-muted`、`--fg-subtle`、`--border`、`--border-strong`、`--rail-bg`、`--rail-fg`、`--note-bg`、`--accent`、`--accent-fg`、`--accent-soft` 及玻璃变量。颜色选择以 Evernote 的绿色品牌联想为方向，但保持低饱和、适合长时间阅读。

## Visual and motion layer

在不扩大 DOM 结构的前提下，收敛已有 CSS 规则：使用 token 统一边界和层级，补齐控件状态，统一卡片/弹层的入场和退出节奏，并将重复的动画时长映射到 `--dur-fast` / `--dur` / `--ease`。对连续动画和 transform 规则增加 reduced-motion 覆盖。优先修改现有样式文件中最后生效的 polish/refinement 层，降低与历史样式冲突的风险。

## Compatibility and rollback

主题值是前端字符串联合类型和 CSS data attribute，旧 localStorage 值仍可正常读取；未知值回退到 `light`。如视觉回归明显，可整体回退新增 token 和 polish 规则，业务逻辑无需迁移。

## Verification

类型检查、lint、Vitest 与生产构建覆盖主题类型传播、持久化、现有组件渲染和 CSS 导入完整性。必要时使用已有 Playwright 截图流程检查宽窄窗口及弹层状态。
