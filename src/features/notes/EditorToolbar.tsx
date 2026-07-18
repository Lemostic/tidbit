import {
  ArrowClockwise,
  ArrowCounterClockwise,
  Code,
  CheckSquare,
  ListBullets,
  ListNumbers,
  Quotes,
  TextB,
  TextItalic,
  TextStrikethrough,
} from "@phosphor-icons/react";
import type { Editor } from "@tiptap/react";
import { VoiceRecorderControls } from "./VoiceRecorderControls";

interface EditorToolbarProps { editor: Editor; }

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const tools = [
    { label: "加粗", active: editor.isActive("bold"), icon: TextB, run: () => editor.chain().focus().toggleBold().run() },
    { label: "斜体", active: editor.isActive("italic"), icon: TextItalic, run: () => editor.chain().focus().toggleItalic().run() },
    { label: "删除线", active: editor.isActive("strike"), icon: TextStrikethrough, run: () => editor.chain().focus().toggleStrike().run() },
    { label: "无序列表", active: editor.isActive("bulletList"), icon: ListBullets, run: () => editor.chain().focus().toggleBulletList().run() },
    { label: "有序列表", active: editor.isActive("orderedList"), icon: ListNumbers, run: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "待办清单", active: editor.isActive("taskList"), icon: CheckSquare, run: () => editor.chain().focus().toggleTaskList().run() },
    { label: "引用", active: editor.isActive("blockquote"), icon: Quotes, run: () => editor.chain().focus().toggleBlockquote().run() },
    { label: "行内代码", active: editor.isActive("code"), icon: Code, run: () => editor.chain().focus().toggleCode().run() },
  ];
  return (
    <div className="toolbar">
      {tools.map(({ label, active, icon: Icon, run }) => (
        <button key={label} type="button" aria-label={label} title={label} className={`toolbar__btn${active ? " is-active" : ""}`} onClick={run}>
          <Icon size={16} weight={active ? "bold" : "regular"} />
        </button>
      ))}
      <span className="toolbar__divider" />
      <VoiceRecorderControls editor={editor} />
      <span className="toolbar__divider" />
      <button type="button" className="toolbar__btn" aria-label="撤销" title="撤销" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><ArrowCounterClockwise size={16} /></button>
      <button type="button" className="toolbar__btn" aria-label="重做" title="重做" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><ArrowClockwise size={16} /></button>
    </div>
  );
}
