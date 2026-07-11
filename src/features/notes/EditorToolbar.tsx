import type { Editor } from "@tiptap/react";

interface EditorToolbarProps {
  editor: Editor;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  return (
    <div className="toolbar">
      <button
        type="button"
        aria-label="加粗"
        title="加粗"
        className={`toolbar__btn${editor.isActive("bold") ? " is-active" : ""}`}
        onClick={() => editor.chain().focus().toggleBold().run()}
        style={{ fontWeight: 700 }}
      >
        B
      </button>
      <button
        type="button"
        aria-label="斜体"
        title="斜体"
        className={`toolbar__btn${editor.isActive("italic") ? " is-active" : ""}`}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        style={{ fontStyle: "italic" }}
      >
        I
      </button>
      <button
        type="button"
        aria-label="代码"
        title="代码"
        className={`toolbar__btn${editor.isActive("code") ? " is-active" : ""}`}
        onClick={() => editor.chain().focus().toggleCode().run()}
        style={{ fontFamily: "monospace" }}
      >
        {"<>"}
      </button>
    </div>
  );
}
