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
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__head">
          <span className="modal__title">编辑便签 <span className="mono">#{noteId}</span></span>
          <button type="button" className="btn-icon" aria-label="关闭" title="关闭" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        {editor && <EditorToolbar editor={editor} />}
        <EditorContent editor={editor} className="editor-content" />
      </div>
    </div>
  );
}
