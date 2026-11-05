import { act, fireEvent, render } from "@testing-library/react";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Markdown } from "tiptap-markdown";
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { editorTableExtensions } from "../features/notes/EditorTable";
import { EditorToolbar } from "../features/notes/EditorToolbar";
import { sanitizeNoteHtml } from "../features/notes/sanitizeNoteHtml";

vi.mock("../features/notes/VoiceRecorderControls", () => ({ VoiceRecorderControls: () => null }));
const instances: Editor[] = [];
function makeEditor(content = "<p>Hello world</p>") {
  const editor = new Editor({ extensions: [StarterKit, TaskList, TaskItem, ...editorTableExtensions, Markdown.configure({ html: true, transformPastedText: true })], content });
  instances.push(editor);
  return editor;
}
function markdown(editor: Editor) { return (editor.storage as unknown as { markdown: { getMarkdown(): string } }).markdown.getMarkdown(); }
beforeAll(() => {
  Object.defineProperty(Range.prototype, "getClientRects", { configurable: true, value: () => [] });
  Object.defineProperty(Range.prototype, "getBoundingClientRect", { configurable: true, value: () => ({ left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 }) });
});
afterEach(() => { instances.splice(0).forEach(editor => editor.destroy()); });

it("roundtrips formatted cells, empty cells, and escaped pipes through Markdown and saved HTML", () => {
  const editor = makeEditor('<table><tr><th><p>Name</p></th><th><p>Value</p></th></tr><tr><td><p><strong>a | b</strong></p></td><td><p><code>x|y</code></p></td></tr><tr><td><p></p></td><td><p>last</p></td></tr></table>');
  const md = markdown(editor);
  expect(md).toContain("a \\| b");
  expect(md).toContain("x\\|y");
  const reopened = makeEditor(md);
  expect(reopened.getJSON()).toEqual(editor.getJSON());
  expect(makeEditor(editor.getHTML()).getJSON()).toEqual(editor.getJSON());
});

it("retains tables in sanitized previews and removes injected attributes and unsafe links", () => {
  const html = sanitizeNoteHtml('<table onclick="evil()"><tr><th style="position:fixed">Name</th></tr><tr><td><a href="javascript:alert(1)">bad</a><script>evil()</script></td></tr></table>');
  expect(html).toContain("<table>");
  expect(html).toContain("<th>Name</th>");
  expect(html).not.toMatch(/onclick|style=|javascript:|<script/);
});

it("keeps multiline table cells intact through HTML Markdown fallback", () => {
  const editor = makeEditor('<table><tr><th><p>Name</p></th></tr><tr><td><p>line 1<br>line 2</p></td></tr></table>');
  expect(markdown(editor)).toContain("<table");
  expect(makeEditor(markdown(editor)).getJSON()).toEqual(editor.getJSON());
});

it("applies heading and paragraph styles, fenced code, clear formatting and divider commands", () => {
  const editor = makeEditor();
  const view = render(<EditorToolbar editor={editor} />);
  fireEvent.change(view.getByLabelText("文本样式"), { target: { value: "2" } });
  expect(editor.state.doc.firstChild?.type.name).toBe("heading");
  expect(editor.state.doc.firstChild?.attrs.level).toBe(2);
  expect(editor.state.doc.firstChild?.textContent).toBe("Hello world");
  fireEvent.change(view.getByLabelText("文本样式"), { target: { value: "0" } });
  expect(editor.state.doc.firstChild?.type.name).toBe("paragraph");
  expect(editor.state.doc.firstChild?.textContent).toBe("Hello world");
  fireEvent.click(view.getByLabelText("代码块"));
  expect(markdown(editor)).toContain("```\nHello world\n```");
  fireEvent.click(view.getByLabelText("清除格式"));
  expect(editor.getHTML()).toContain("<p>Hello world</p>");
  fireEvent.click(view.getByLabelText("分隔线"));
  expect(editor.getHTML()).toContain("<hr>");
});

it("pastes Markdown tables and navigates cells with Tab and Shift+Tab", () => {
  const editor = makeEditor("<p></p>");
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", { value: { getData: (type: string) => type === "text/plain" ? "| A | B |\n| --- | --- |\n| a \\| b | c |" : "", files: [] } });
  editor.view.dom.dispatchEvent(event);
  expect(editor.getHTML()).toContain("<table");
  expect(editor.getText()).toContain("a | b");
  editor.commands.setTextSelection(3);
  const start = editor.state.selection.from;
  editor.view.dom.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
  expect(editor.state.selection.from).toBeGreaterThan(start);
  editor.view.dom.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true }));
  expect(editor.state.selection.from).toBe(start);
});

it("dismisses the link form when the document changes so it cannot apply stale positions", () => {
  const editor = makeEditor();
  editor.commands.setTextSelection({ from: 1, to: 6 });
  const view = render(<EditorToolbar editor={editor} />);
  fireEvent.click(view.getByLabelText("编辑链接"));
  act(() => { editor.commands.setContent("<p>x</p>"); });
  expect(view.queryByLabelText("链接地址")).not.toBeInTheDocument();
});

it("inserts a 3x3 table, updates table actions from selection, edits rows and columns, and undoes", () => {
  const editor = makeEditor();
  const view = render(<EditorToolbar editor={editor} />);
  fireEvent.click(view.getByLabelText("插入表格"));
  expect(editor.getHTML().match(/<th /g)).toHaveLength(3);
  expect(editor.getHTML().match(/<tr>/g)).toHaveLength(3);
  fireEvent.click(view.getByLabelText("下方插入行"));
  expect(editor.getHTML().match(/<tr>/g)).toHaveLength(4);
  fireEvent.click(view.getByLabelText("右侧插入列"));
  expect(editor.state.doc.firstChild?.firstChild?.childCount).toBe(4);
  fireEvent.click(view.getByLabelText("删除列"));
  expect(editor.state.doc.firstChild?.firstChild?.childCount).toBe(3);
  fireEvent.click(view.getByLabelText("删除表格"));
  expect(editor.getHTML()).not.toContain("<table");
  fireEvent.click(view.getByLabelText("撤销"));
  expect(editor.getHTML()).toContain("<table");
});

it("preserves selected text while editing links, rejects unsafe schemes, and removes a link", () => {
  const editor = makeEditor();
  editor.commands.setTextSelection({ from: 1, to: 6 });
  const view = render(<EditorToolbar editor={editor} />);
  fireEvent.click(view.getByLabelText("编辑链接"));
  expect(view.getByLabelText("链接地址")).toHaveFocus();
  fireEvent.change(view.getByLabelText("链接地址"), { target: { value: "javascript:alert(1)" } });
  fireEvent.submit(view.getByRole("form"));
  expect(view.getByRole("alert")).toBeInTheDocument();
  expect(editor.getHTML()).not.toContain("<a");
  fireEvent.change(view.getByLabelText("链接地址"), { target: { value: "https://example.com" } });
  fireEvent.submit(view.getByRole("form"));
  expect(editor.getHTML()).toContain('href="https://example.com"');
  expect(editor.getHTML()).toMatch(/>Hello<\/a> world/);
  act(() => { editor.commands.setTextSelection(3); });
  fireEvent.click(view.getByLabelText("编辑链接"));
  fireEvent.click(view.getByLabelText("移除链接"));
  expect(editor.getHTML()).toBe("<p>Hello world</p>");
});

it("supports More keyboard navigation and Escape restores focus without closing the editor", () => {
  const editor = makeEditor();
  const onEscape = vi.fn();
  const view = render(<div onKeyDown={onEscape}><EditorToolbar editor={editor} /></div>);
  fireEvent.click(view.getByLabelText("更多格式"));
  expect(view.getByLabelText("删除线")).toHaveFocus();
  fireEvent.keyDown(view.getByLabelText("删除线"), { key: "ArrowRight" });
  expect(view.getByLabelText("无序列表")).toHaveFocus();
  onEscape.mockClear();
  fireEvent.keyDown(view.getByLabelText("无序列表"), { key: "Escape" });
  expect(view.getByLabelText("更多格式")).toHaveFocus();
  expect(view.getByLabelText("更多格式")).toHaveAttribute("aria-expanded", "false");
  expect(onEscape).not.toHaveBeenCalled();
});
