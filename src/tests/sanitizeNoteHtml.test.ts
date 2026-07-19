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

  it("keeps timeline cards while stripping unsafe markup and attributes", () => {
    const html = sanitizeNoteHtml('<div data-timeline-card="true" onclick="alert(1)"><ol data-timeline-items="true"><li data-timeline-item="true" data-datetime="2026-08-01T09:30" onmouseover="alert(2)"><time data-timeline-date="true" datetime="2026-08-01T09:30">2026-08-01 09:30</time><div data-timeline-content="true"><strong data-timeline-item-title="true">开始内测</strong><p data-timeline-item-description="true">邀请首批用户<script>alert(3)</script></p></div></li></ol></div>');
    expect(html).toContain('data-timeline-card="true"');
    expect(html).not.toContain("data-title");
    expect(html).toContain('data-timeline-item="true" data-datetime="2026-08-01T09:30"');
    expect(html).toContain('<time data-timeline-date="true" datetime="2026-08-01T09:30">2026-08-01 09:30</time>');
    expect(html).toContain('data-timeline-item-title="true">开始内测</strong>');
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("onmouseover");
    expect(html).not.toContain("<script");
  });

  it("drops impossible timeline date-times", () => {
    const html = sanitizeNoteHtml('<div data-timeline-card="true"><ol data-timeline-items="true"><li data-timeline-item="true" data-datetime="2026-99-99T29:75"><time data-timeline-date="true" datetime="2026-99-99T29:75">异常</time><div data-timeline-content="true"><strong data-timeline-item-title="true">错误节点</strong></div></li></ol></div>');
    expect(html).not.toContain(' data-datetime="');
    expect(html).not.toContain(' datetime="');
    expect(html).toContain("未设置时间");
  });
});
