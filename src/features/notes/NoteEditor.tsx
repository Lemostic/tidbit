import { useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { EditorToolbar } from "./EditorToolbar";
import type { Note } from "../../ipc/types";
import { client } from "../../ipc/client";

interface NoteEditorProps {
  noteId: number;
  initialMd: string;
  onClose: () => void;
}

export function NoteEditor({ noteId, initialMd, onClose }: NoteEditorProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(
    (editor: ReturnType<typeof useEditor>) => {
      if (!editor) return;
      const md = (editor.storage as unknown as { markdown: { getMarkdown(): string } }).markdown.getMarkdown();
      const html = editor.getHTML();
      const words = md.trim() ? md.trim().split(/\s+/).length : 0;
      client.notes.updateContent(noteId, md, html, words).catch(console.error);
    },
    [noteId]
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown.configure({ html: true, transformPastedText: true }),
    ],
    content: initialMd,
    onUpdate({ editor: e }) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => flush(e), 500);
    },
  });

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (editor) flush(editor);
    };
  }, [editor, flush]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.4)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 640, maxHeight: "80vh", background: "var(--bg, #fff)",
          borderRadius: 8, boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid #e5e7eb" }}>
          <span style={{ flex: 1, fontWeight: 600 }}>Edit Note #{noteId}</span>
          <button type="button" onClick={onClose} style={{ padding: "4px 8px" }}>Close</button>
        </div>
        {editor && <EditorToolbar editor={editor} />}
        <EditorContent
          editor={editor}
          style={{ flex: 1, padding: 12, overflowY: "auto", outline: "none" }}
        />
      </div>
    </div>
  );
}
