import type { Editor } from "@tiptap/react";

interface EditorToolbarProps {
  editor: Editor;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  return (
    <div style={{ display: "flex", gap: 4, padding: "4px 0", borderBottom: "1px solid #e5e7eb" }}>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        style={{ fontWeight: editor.isActive("bold") ? "bold" : "normal", padding: "4px 8px", borderRadius: 4 }}
      >
        B
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        style={{ fontStyle: editor.isActive("italic") ? "italic" : "normal", padding: "4px 8px", borderRadius: 4 }}
      >
        I
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCode().run()}
        style={{ fontFamily: editor.isActive("code") ? "monospace" : "inherit", padding: "4px 8px", borderRadius: 4 }}
      >
        {"<>"}
      </button>
    </div>
  );
}
