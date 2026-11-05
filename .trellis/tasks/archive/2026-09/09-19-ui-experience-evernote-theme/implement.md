# Implementation Plan

## Approved 0.2.10 execution

User approved both sections of next-iteration-plan.md together. Markdown/table and voice capture are independent implementation lanes; parent owns color alignment and integration/release. Follow the ordered acceptance checklist there, then run full typecheck/lint/tests, browser visual/interaction checks, and NSIS/MSI builds. Preserve existing WIP. Commit/archive remains gated on unresolved earlier-baseline staging scope.

1. 读取并遵循 frontend spec，确认主题值、样式层和测试中的现有约定。
2. 扩展 `Theme` 联合类型、主题标签/图标、主题切换器选项和 App 的循环主题列表，保证 `evernote` 可持久化和广播。
3. 在 `tokens.css` 增加印象笔记主题 token，并微调通用 token 的层级、圆角、阴影和动效基线。
4. 在 `polish.css` 或 `refinement.css` 收敛标题栏、侧栏、便签卡片、编辑器、设置、弹层、Toast 和控件状态；补充 reduced-motion 覆盖。
5. 检查窄窗口、宽窗口、独立便签窗口和液态玻璃选择器，修复由主题或层级调整造成的溢出/对比度问题。
6. 更新必要的主题测试或新增最小行为测试，运行 `pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm build`。
7. 执行 Trellis quality check，复核需求映射、跨层主题传播和回归风险；完成 spec 更新、提交和任务归档。

## Risky files / rollback points

- `src/ui/theme.ts`, `src/features/settings/ThemeSwitcher.tsx`, `src/App.tsx`: 类型或循环列表不一致会导致主题无法切换。
- `src/styles/tokens.css`, `src/styles/polish.css`, `src/styles/refinement.css`: 规则覆盖顺序复杂，需优先用末端覆盖并保留可回退块。
- 回滚顺序：先回退样式 polish，再回退 evernote token，最后回退主题联合类型与选项。

## Validation commands

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
