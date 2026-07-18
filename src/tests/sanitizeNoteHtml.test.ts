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

  it("keeps safe voice memo players and strips executable audio attributes", () => {
    const html = sanitizeNoteHtml('<div data-audio-recording="true" data-name="晨会" data-duration-ms="2100" onclick="alert(1)"><span data-audio-name="true">晨会</span><span data-audio-duration="true">00:02</span><audio autoplay onplay="alert(2)" src="data:audio/webm;base64,dm9pY2U="></audio><script>alert(3)</script></div>');
    expect(html).toContain('data-audio-recording="true"');
    expect(html).toContain('data-name="晨会"');
    expect(html).toContain('src="data:audio/webm;base64,dm9pY2U="');
    expect(html).toContain('controls=""');
    expect(html).not.toContain("autoplay");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("script");
  });

  it("removes non-audio data URLs from voice memo players", () => {
    const html = sanitizeNoteHtml('<div data-audio-recording="true"><audio src="data:text/html;base64,PHNjcmlwdD4="></audio></div>');
    expect(html).not.toContain("<audio");
    expect(html).not.toContain("data:text/html");
  });

  it("keeps safe interactive task-list checkboxes and removes unsafe attributes", () => {
    const html = sanitizeNoteHtml('<ul class="contains-task-list" onclick="alert(1)"><li class="task-list-item" data-checked="true"><label><input type="checkbox" checked onclick="alert(2)"><span></span></label><div><p>完成测试</p></div></li></ul>');
    expect(html).toContain('data-type="taskList"');
    expect(html).toContain('data-type="taskItem" data-checked="true"');
    expect(html).toContain('type="checkbox" data-task-checkbox="true" checked=""');
    expect(html).not.toContain("onclick");
  });
});
