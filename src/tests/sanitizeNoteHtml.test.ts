import { describe, expect, it } from "vitest";
import { sanitizeNoteHtml } from "../features/notes/sanitizeNoteHtml";

describe("sanitizeNoteHtml", () => {
  it("preserves rich note formatting", () => {
    const html = sanitizeNoteHtml("<h2>标题</h2><p><strong>重点</strong>与<em>说明</em></p><ul><li>事项</li></ul>");
    expect(html).toContain("<h2>标题</h2>");
    expect(html).toContain("<strong>重点</strong>");
    expect(html).toContain("<li>事项</li>");
  });

  it("removes executable markup and unsafe attributes", () => {
    const html = sanitizeNoteHtml('<p onclick="alert(1)">正文</p><script>alert(2)</script><a href="javascript:alert(3)">链接</a>');
    expect(html).toBe("<p>正文</p><a>链接</a>");
  });
});
