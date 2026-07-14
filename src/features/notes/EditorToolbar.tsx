import {
  ArrowClockwise,
  ArrowCounterClockwise,
  Code,
  ListBullets,
  ListNumbers,
  Quotes,
  TextB,
  TextItalic,
  TextStrikethrough,
} from "@phosphor-icons/react";
import type { Editor } from "@tiptap/react";
import { useI18n } from "../../i18n";

interface EditorToolbarProps { editor: Editor; }

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const { t } = useI18n();
  const tools = [
    { label: t("toolbar.bold"), active: editor.isActive("bold"), icon: TextB, run: () => editor.chain().focus().toggleBold().run() },
    { label: t("toolbar.italic"), active: editor.isActive("italic"), icon: TextItalic, run: () => editor.chain().focus().toggleItalic().run() },
    { label: t("toolbar.strike"), active: editor.isActive("strike"), icon: TextStrikethrough, run: () => editor.chain().focus().toggleStrike().run() },
    { label: t("toolbar.bulletList"), active: editor.isActive("bulletList"), icon: ListBullets, run: () => editor.chain().focus().toggleBulletList().run() },
    { label: t("toolbar.orderedList"), active: editor.isActive("orderedList"), icon: ListNumbers, run: () => editor.chain().focus().toggleOrderedList().run() },
    { label: t("toolbar.quote"), active: editor.isActive("blockquote"), icon: Quotes, run: () => editor.chain().focus().toggleBlockquote().run() },
    { label: t("toolbar.code"), active: editor.isActive("code"), icon: Code, run: () => editor.chain().focus().toggleCode().run() },
  ];
  return (
    <div className="toolbar">
      {tools.map(({ label, active, icon: Icon, run }) => (
        <button key={label} type="button" aria-label={label} title={label} className={`toolbar__btn${active ? " is-active" : ""}`} onClick={run}>
          <Icon size={16} weight={active ? "bold" : "regular"} />
        </button>
      ))}
      <span className="toolbar__divider" />
      <button type="button" className="toolbar__btn" aria-label={t("toolbar.undo")} title={t("toolbar.undo")} disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><ArrowCounterClockwise size={16} /></button>
      <button type="button" className="toolbar__btn" aria-label={t("toolbar.redo")} title={t("toolbar.redo")} disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><ArrowClockwise size={16} /></button>
    </div>
  );
}
