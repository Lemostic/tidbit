# 商业化界面打磨计划(2026-09-25 第二轮)

延续 0.2.10/0.2.11 之后的又一轮细节打磨。基于 polish-survey 截图(见 `polish-survey/`)与样式层走读,聚焦"去 AI 设计感、贴 commercial 软件"的交互与质感细节。

## 评估结论(截图 + 代码证据)

整体骨架(三栏工作区、filing tabs、设置双栏弹窗)已达标。剩余问题集中在:

| # | 问题 | 证据 | 级别 |
|---|------|------|------|
| 1 | 命令面板遮罩过重:0.38 黑 + blur(8px) + saturate(0.88),背景发灰发闷,"AI 玻璃"感 | refinement.css `.palette-scrim` 共享规则 | P1 |
| 2 | 命令面板无键位提示条;行内无图标,纯文字行显单薄;标题字重 400 无层级 | CommandPalette.tsx / palette__item strong | P1 |
| 3 | 面板列表底部一行被生硬裁切(无渐隐) | palette-evernote.png 底部"立即锁定"被切半 | P2 |
| 4 | 编辑器空状态未垂直居中,贴顶显示 | `.app-shell[data-is-maximized="true"] .note-pane { display:flex !important }` 覆盖了 `.note-pane--empty { display:grid }`(polish.css 497 vs 805,特异性 0,3,0+!important 胜出) | P1 |
| 5 | 暗色主题下空状态纸片 glyph 几乎不可见(border-strong 与深色表面对比不足) | list-dark.png 右侧空态 | P2 |
| 6 | 文本选区颜色是浏览器默认蓝,与 6 套主题脱节 | 全局无 ::selection 规则 | P3 |

不改动:最大化模式正文满宽(0.2.11 e595f90 的既定决策)、标准模式 68ch(refinement.css 已有)、列表行密度、液态玻璃层。

## 实施清单

全部样式追加到 `polish.css` 末尾新 section(最后加载,天然赢得级联),组件改动仅 `CommandPalette.tsx`:

1. `polish.css`:palette-scrim 减淡为 `rgba(15,23,29,0.26)` + `blur(5px) saturate(1.06)`。
2. `CommandPalette.tsx`:底部 `<footer className="palette__foot">` 键位提示(命令页:↑↓ 选择 · ↵ 执行 · Esc 关闭;便签页:Esc 关闭);命令行前加分组图标(note→NotePencil / group→Folders / app→GearSix / search→MagnifyingGlass),标题字重 560。
3. `polish.css`:palette 图标槽、标题字重、`::selection`、palette 输入 caret 用 accent。
   - 列表底部渐隐 mask **已评估后放弃**:静态 mask 会在未滚动/结果很少时误淡出最后一行;滚动裁切本身与 VS Code/Raycast 等商业启动器一致,不属缺陷。
4. `polish.css`:`.app-shell[data-is-maximized="true"] .note-pane--empty { display:grid !important; place-items:center }` 修复居中。
5. `polish.css`:空状态纸片 glyph 边框混入 accent(`color-mix(in srgb, var(--accent) 30%, var(--border-strong))`),暗色主题下可辨。

## 验证

`pnpm typecheck`、`pnpm lint`、`pnpm test`;重跑 `polish-survey.cjs` 截图对比;重点核对:面板遮罩观感、空状态居中(light/dark/evernote)、reduced-motion 不受影响。
