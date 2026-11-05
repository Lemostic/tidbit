import { describe, expect, it } from "vitest";
import { toggleTaskContent } from "../features/notes/taskList";

describe("task-list content updates", () => {
  const markdown = "- [ ] 第一项\n- [x] 第二项\n";
  const html = '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>第一项</p></div></li><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked><span></span></label><div><p>第二项</p></div></li></ul>';

  it("checks the selected task in both Markdown and HTML", () => {
    const updated = toggleTaskContent(markdown, html, 0, true);
    expect(updated?.markdown).toBe("- [x] 第一项\n- [x] 第二项\n");
    expect(updated?.html).toContain('data-checked="true"');
    expect(updated?.html).toContain('data-task-checkbox="true"');
    expect(updated?.words).toBe(updated?.markdown.replace(/\s/g, "").length);
  });

  it("unchecks only the selected task", () => {
    const updated = toggleTaskContent(markdown, html, 1, false);
    expect(updated?.markdown).toBe("- [ ] 第一项\n- [ ] 第二项\n");
    const document = new DOMParser().parseFromString(updated?.html ?? "", "text/html");
    expect(document.querySelectorAll('input[type="checkbox"]:checked')).toHaveLength(0);
  });

  it("rejects an out-of-range task index", () => {
    expect(toggleTaskContent(markdown, html, 9, true)).toBeNull();
  });
});
