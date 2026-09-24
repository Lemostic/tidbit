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
