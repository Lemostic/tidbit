# Journal - lemostic (Part 1)

> AI development session journal
> Started: 2026-09-18

---



## Session 1: 0.2.11 搜索语法升级：结构化解析器接入 LIKE 引擎
<!-- trellis-session: v=2 fp=0579d914c2338dac -->

**Date**: 2026-09-25
**Task**: 0.2.11 搜索语法升级：结构化解析器接入 LIKE 引擎
**Branch**: `main`

### Summary

调研确认 FTS5 unicode61 无法中文子串匹配，沿用 LIKE 引擎；完成 parse_query（短语/排除/前缀/tag:/group:），引擎与前端接线；修复 0.2.9 status 字段导致的整套 cargo test 编译失败；版本 0.2.11，CHANGELOG/spec 更新，5 个 commit。

### Git Commits

| Hash | Message |
|------|---------|
| `a83aad3` | chore(release): 0.2.11 |

### Status

[OK] **Completed**


## Session 2: 商业化 UI 打磨与 0.2.12 发布
<!-- trellis-session: v=2 fp=4a50364a69dd5d9b -->

**Date**: 2026-09-25
**Task**: 商业化 UI 打磨与 0.2.12 发布
**Branch**: `main`

### Summary

命令面板商业化打磨(分组图标、键位提示条、遮罩减淡、标题层级),修复宽窗口编辑器空状态贴顶与暗色空态对比度,文本选区跟随主题色;修复版本一致性测试的硬编码版本号;发布 0.2.12 并归档 09-19-ui-experience-evernote-theme 任务。

### Git Commits

| Hash | Message |
|------|---------|
| `dd43ecf` | fix(test): unpin release version assertion in tauriBuildConfig test |
| `d4b3fb7` | feat(ui): commercial polish for command palette and editor empty state |
| `739bcfe` | chore(release): 0.2.12 |

### Status

[OK] **Completed**
