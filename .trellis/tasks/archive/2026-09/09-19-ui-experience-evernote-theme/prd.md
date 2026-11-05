# 界面体验升级与印象笔记主题

## Goal

Approved follow-on release: 0.2.10 combines the color-checkmark/Markdown tools and enhanced recording requirements in [next-iteration-plan.md](next-iteration-plan.md). That document's requirements and acceptance checklist are authoritative for the added deliverables; prior 0.2.9 work remains preserved.

让 Tidbit 具备更成熟的商业桌面软件体验：信息层级更清晰、操作反馈更及时、动画更自然、视觉系统更统一，并提供一套可切换的“印象笔记”主题。

## Background and confirmed facts

- 这是一个 React + Vite + Tauri 桌面应用，主界面由标题栏、分组侧栏、便签列表/看板和编辑器组成。
- 现有主题由 `src/ui/theme.ts` 与 `src/features/settings/ThemeSwitcher.tsx` 管理，已有 `light`、`dark`、`sepia`、`tokyo-night`、`wechat` 五个主题。
- 设计变量集中在 `src/styles/tokens.css`，通用组件与动效主要在 `src/styles/globals.css`、`src/styles/polish.css`、`src/styles/refinement.css`。
- 应用已有卡片入场、模态框、Toast、液态玻璃和 `prefers-reduced-motion` 支持；本任务需在此基础上收敛体验，而不是改变笔记数据或窗口业务行为。

## Requirements

### R1. 统一商业化视觉系统

- 调整颜色、边框、圆角、阴影、排版和间距 token，使标题栏、侧栏、列表卡片、编辑器、设置面板和弹层形成一致层级。
- 强化主操作、次操作、危险操作、选中、禁用和空状态的视觉区分；文本对比度满足可读性要求。
- 保留现有主题的语义和可切换能力，不破坏液态玻璃与独立窗口样式。

### R2. 交互反馈与动效

- 为列表/看板切换、卡片悬停与选中、弹层打开关闭、Toast、设置导航和主题切换提供短促且有层次的过渡。
- 所有可点击控件具备 hover、active、focus-visible 和 disabled 反馈；避免会影响输入和拖拽的过度动画。
- 尊重 `prefers-reduced-motion: reduce`，在减少动效环境下关闭位移、缩放和连续动画，仅保留必要状态变化。

### R3. 友好度与可理解性

- 关键操作使用一致的按钮尺寸、图标语义、中文文案和 tooltip/aria-label；空状态、加载状态、保存状态和错误反馈清晰可懂。
- 保持现有快捷键、窗口模式、编辑、搜索、分组、回收站、备份和设置功能行为不变。
- 桌面窄窗口和宽窗口均可用，设置面板与编辑器不出现内容遮挡或不可达控件。

### R4. 印象笔记主题

- 新增主题标识 `evernote`，在主题切换器和设置下拉中显示为“印象笔记”。
- 主题使用印象笔记风格的深墨绿、清新绿和暖白纸张色，提供完整的背景、表面、文字、边框、强调色、侧栏和便签变量；深色/浅色语义需保持足够对比。
- 主题切换后立即应用、持久化到现有 localStorage，并同步到相关窗口的外观广播机制。

## Acceptance Criteria

- [ ] 启动主窗口后，标题栏、侧栏、列表、编辑器、设置和弹层使用统一的视觉层级，主要操作一眼可辨。
- [ ] 卡片、按钮、输入框、弹层和 Toast 在 hover/active/focus/disabled 状态下均有可感知且不跳动的反馈；主题切换和弹层过渡无闪烁。
- [ ] 设置、搜索、编辑、分组、回收站、备份和窗口相关既有行为保持可用；窄窗口不出现横向溢出。
- [ ] 主题切换器可选择“印象笔记”，刷新后仍保持该主题，主窗口与相关窗口使用相同主题 token。
- [ ] 开启 `prefers-reduced-motion` 时不运行位移/缩放/循环动画，功能和状态反馈仍清晰。
- [ ] `pnpm typecheck`、`pnpm lint` 和相关 Vitest 测试通过，生产构建成功。

## Out of scope

- 不改变 Rust 数据模型、IPC 协议、笔记存储格式或核心业务流程。
- 不新增主题编辑器、用户自定义颜色、云同步或品牌资源授权。
- 不重写现有页面信息架构；仅在现有组件边界内优化表现和反馈。

## Decisions

- 采用 token 优先的 CSS 改造，优先复用现有组件和窗口外观广播机制。
- “印象笔记主题”作为浅色品牌主题落地，保留现有五个主题；不额外引入印象笔记深色变体。
- 动效以 120–320ms 的短过渡为主，并以 reduced-motion 媒体查询作为硬约束。

## Blocking open questions

- 无。范围、兼容性和验收行为已明确。
