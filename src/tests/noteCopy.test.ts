import { beforeEach, describe, expect, it } from "vitest";
import { formatNoteForCopy, loadNoteCopyFormat, saveNoteCopyFormat } from "../ui/noteCopy";

beforeEach(() => localStorage.clear());

describe("note copy format", () => {
  it("uses Markdown by default and persists the selected format", () => {
    expect(loadNoteCopyFormat()).toBe("markdown");
    saveNoteCopyFormat("plain");
    expect(loadNoteCopyFormat()).toBe("plain");
    expect(formatNoteForCopy("## 标题", "<h2>标题</h2>", "markdown")).toBe("## 标题");
  });

  it("produces formatted plain text while preserving list numbering and nesting", () => {
    const html = [
      "<h2>发布计划</h2>",
      "<p>先完成 <strong>核心功能</strong>。</p>",
      "<ol start=\"3\"><li>第三步<ul><li>子任务甲</li><li>子任务乙</li></ul></li><li value=\"7\">第七步</li></ol>",
      "<ul><li>检查安装包</li></ul>",
      "<pre><code>pnpm tauri build</code></pre>",
    ].join("");

    expect(formatNoteForCopy("ignored", html, "plain")).toBe([
      "发布计划",
      "",
      "先完成 核心功能。",
      "",
      "3. 第三步",
      "  • 子任务甲",
      "  • 子任务乙",
      "7. 第七步",
      "",
      "• 检查安装包",
      "",
      "pnpm tauri build",
    ].join("\n"));
  });
});
