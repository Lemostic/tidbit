import {
  ArrowClockwise,
  ArrowCounterClockwise,
  CalendarDots,
  Code,
  CheckSquare,
  ListBullets,
  ListNumbers,
  Image,
  Quotes,
  TextB,
  TextItalic,
  TextStrikethrough,
  Table, CodeBlock, Minus, Link, Eraser, DotsThree,
  ArrowLineUp, ArrowLineDown, ArrowLineLeft, ArrowLineRight, Rows, Columns, Trash, Check, LinkBreak, X,
} from "@phosphor-icons/react";
import { useEditorState, type Editor } from "@tiptap/react";
import { useEffect, useId, useRef, useState } from "react";
import "./editorTools.css";
import { VoiceRecorderControls } from "./VoiceRecorderControls";
import { createTimelineCardAttrs } from "./TimelineCard";

interface EditorToolbarProps { editor: Editor; onInsertImage?: () => void; }

export function EditorToolbar({ editor, onInsertImage }: EditorToolbarProps) {
  useEditorState({ editor, selector: ({ transactionNumber }) => transactionNumber });
  const [more, setMore] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [linkError, setLinkError] = useState("");
  const moreButton = useRef<HTMLButtonElement>(null);
  const linkButton = useRef<HTMLButtonElement>(null);
  const morePanel = useRef<HTMLDivElement>(null);
  const linkInput = useRef<HTMLInputElement>(null);
  const selection = useRef({ from: 1, to: 1 });
  const panelId = useId();
  useEffect(() => { if (more) morePanel.current?.querySelector<HTMLButtonElement>("button")?.focus(); }, [more]);
  useEffect(() => { if (linkOpen) linkInput.current?.focus(); }, [linkOpen]);
  useEffect(() => {
    if (!linkOpen) return;
    const closeOnEdit = () => setLinkOpen(false);
    editor.on("update", closeOnEdit);
    editor.on("selectionUpdate", closeOnEdit);
    return () => { editor.off("update", closeOnEdit); editor.off("selectionUpdate", closeOnEdit); };
  }, [editor, linkOpen]);
  const tools = [
    { label: "加粗", active: editor.isActive("bold"), icon: TextB, run: () => editor.chain().focus().toggleBold().run() },
    { label: "斜体", active: editor.isActive("italic"), icon: TextItalic, run: () => editor.chain().focus().toggleItalic().run() },
    { label: "删除线", active: editor.isActive("strike"), icon: TextStrikethrough, run: () => editor.chain().focus().toggleStrike().run() },
    { label: "无序列表", active: editor.isActive("bulletList"), icon: ListBullets, run: () => editor.chain().focus().toggleBulletList().run() },
    { label: "有序列表", active: editor.isActive("orderedList"), icon: ListNumbers, run: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "待办清单", active: editor.isActive("taskList"), icon: CheckSquare, run: () => editor.chain().focus().toggleTaskList().run() },
    { label: "插入时间轴", active: editor.isActive("timelineCard"), icon: CalendarDots, run: () => editor.chain().focus().insertContent({ type: "timelineCard", attrs: createTimelineCardAttrs() }).run() },
    { label: "引用", active: editor.isActive("blockquote"), icon: Quotes, run: () => editor.chain().focus().toggleBlockquote().run() },
    { label: "行内代码", active: editor.isActive("code"), icon: Code, run: () => editor.chain().focus().toggleCode().run() },
    { label: "代码块", active: editor.isActive("codeBlock"), icon: CodeBlock, run: () => editor.chain().focus().toggleCodeBlock().run() },
    { label: "分隔线", active: false, icon: Minus, run: () => editor.chain().focus().setHorizontalRule().run() },
    { label: "插入表格", active: false, icon: Table, run: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { label: "清除格式", active: false, icon: Eraser, run: () => editor.chain().focus().unsetAllMarks().clearNodes().run() },
  ];
  const toolButton = ({ label, active, icon: Icon, run }: typeof tools[number]) => (
    <button key={label} type="button" aria-label={label} title={label === "加粗" ? "加粗 (Ctrl+B)" : label === "斜体" ? "斜体 (Ctrl+I)" : label} aria-pressed={active} disabled={label === "插入表格" && !editor.can().insertTable({ rows: 3, cols: 3, withHeaderRow: true })} className={`toolbar__btn${active ? " is-active" : ""}`} onMouseDown={e => e.preventDefault()} onClick={run}>
      <Icon size={16} weight={active ? "bold" : "regular"} />
    </button>
  );
  const heading = [1, 2, 3].find(level => editor.isActive("heading", { level })) ?? 0;
  return (
    <div className="editor-tools" onKeyDown={event => {
      if (event.key !== "Escape") return;
      if (linkOpen) { event.stopPropagation(); setLinkOpen(false); linkButton.current?.focus(); }
      else if (more) { event.stopPropagation(); setMore(false); moreButton.current?.focus(); }
    }}>
    <div className="toolbar editor-tools__main" role="group" aria-label="Markdown 工具栏">
      <select aria-label="文本样式" className="editor-tools__heading" value={heading} onChange={event => {
        const level = Number(event.target.value) as 0 | 1 | 2 | 3;
        if (level) editor.chain().focus().setHeading({ level }).run();
        else editor.chain().focus().setParagraph().run();
      }}><option value={0}>正文</option><option value={1}>标题 1</option><option value={2}>标题 2</option><option value={3}>标题 3</option></select>
      {tools.filter(tool => ["加粗", "斜体", "待办清单"].includes(tool.label)).map(toolButton)}
      <button type="button" ref={linkButton} className="toolbar__btn" aria-label="编辑链接" title="添加或编辑链接" aria-expanded={linkOpen} onMouseDown={e => e.preventDefault()} onClick={() => {
        selection.current = { from: editor.state.selection.from, to: editor.state.selection.to };
        setUrl(String(editor.getAttributes("link").href ?? "")); setLinkError(""); setLinkOpen(value => !value);
      }}><Link size={16} /></button>
      <span className="toolbar__divider" />
      <VoiceRecorderControls editor={editor} />
      {onInsertImage && <button type="button" className="toolbar__btn" aria-label="插入图片" title="插入图片" onClick={onInsertImage}><Image size={16} /></button>}
      <span className="toolbar__divider" />
      <button type="button" className="toolbar__btn" aria-label="撤销" title="撤销" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><ArrowCounterClockwise size={16} /></button>
      <button type="button" className="toolbar__btn" aria-label="重做" title="重做" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><ArrowClockwise size={16} /></button>
      <button ref={moreButton} type="button" className="toolbar__btn editor-tools__more" aria-label="更多格式" title="更多格式" aria-expanded={more} aria-controls={panelId} onClick={() => setMore(value => !value)}><DotsThree size={20} /></button>
    </div>
    <div id={panelId} ref={morePanel} className={`editor-tools__secondary${more ? " is-open" : ""}`} role="group" aria-label="更多格式操作" onKeyDown={event => {
      if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1) + buttons.length) % buttons.length;
      event.preventDefault(); buttons[next]?.focus();
    }}>{tools.filter(tool => !["加粗", "斜体", "待办清单"].includes(tool.label)).map(toolButton)}</div>
    {linkOpen && <form className="editor-tools__link" aria-label="链接设置" onSubmit={event => {
      event.preventDefault();
      const href = url.trim();
      if (!/^(https?:\/\/[^\s]+|mailto:[^\s]+|#[^\s]*)$/i.test(href)) { setLinkError("请输入 http、https、mailto 链接或 # 锚点"); return; }
      const chain = editor.chain().focus().setTextSelection(selection.current).extendMarkRange("link");
      if (selection.current.from === selection.current.to && !editor.isActive("link")) chain.insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] }).run();
      else chain.setLink({ href }).run();
      setLinkOpen(false);
    }}>
      <input ref={linkInput} aria-label="链接地址" value={url} placeholder="https://example.com" onChange={event => { setUrl(event.target.value); setLinkError(""); }} />
      <button type="submit" aria-label="应用链接" title="应用链接"><Check size={16} /></button>
      <button type="button" aria-label="移除链接" title="移除链接" onClick={() => { editor.chain().focus().setTextSelection(selection.current).extendMarkRange("link").unsetLink().run(); setLinkOpen(false); }}><LinkBreak size={16} /></button>
      <button type="button" aria-label="取消" title="取消" onClick={() => { setLinkOpen(false); linkButton.current?.focus(); }}><X size={16} /></button>
      {linkError && <span role="alert">{linkError}</span>}
    </form>}
    {editor.isActive("table") && <div className="editor-tools__table" role="group" aria-label="表格操作">
      {([
        ["上方插入行", ArrowLineUp, () => editor.chain().focus().addRowBefore().run()],
        ["下方插入行", ArrowLineDown, () => editor.chain().focus().addRowAfter().run()],
        ["左侧插入列", ArrowLineLeft, () => editor.chain().focus().addColumnBefore().run()],
        ["右侧插入列", ArrowLineRight, () => editor.chain().focus().addColumnAfter().run()],
        ["删除行", Rows, () => editor.chain().focus().deleteRow().run()],
        ["删除列", Columns, () => editor.chain().focus().deleteColumn().run()],
        ["删除表格", Trash, () => editor.chain().focus().deleteTable().run()],
      ] as const).map(([label, Icon, run]) => <button type="button" key={label} aria-label={label} title={label} onMouseDown={e => e.preventDefault()} onClick={run}><Icon size={16} /></button>)}
    </div>}
    </div>
  );
}
