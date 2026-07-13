import { Check, PushPin, Trash, X } from "@phosphor-icons/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { useCallback, useEffect, useRef, useState } from "react";
import { client } from "../../ipc/client";
import type { Group, Note } from "../../ipc/types";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { EditorToolbar } from "./EditorToolbar";

interface NoteEditorProps {
  note: Note;
  groups: Group[];
  onClose: () => void;
  onChanged: () => void;
  onTrash: (id: number) => Promise<void>;
  allowTrash?: boolean;
  desktopWindow?: boolean;
  embedded?: boolean;
}

const colors = [null, "#d75b57", "#d5a23f", "#4e9b75", "#4c86b8"] as const;

export function NoteEditor({ note, groups, onClose, onChanged, onTrash, allowTrash = true, desktopWindow = false, embedded = false }: NoteEditorProps) {
  const [current, setCurrent] = useState(note);
  const [title, setTitle] = useState(note.title ?? "");
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);

  const flush = useCallback(async (instance: ReturnType<typeof useEditor>) => {
    if (!instance || !dirtyRef.current) return;
    setStatus("saving");
    const md = (instance.storage as unknown as { markdown: { getMarkdown(): string } }).markdown.getMarkdown();
    const html = instance.getHTML();
    const words = md.replace(/\s/g, "").length;
    try {
      const updated = await client.notes.updateContent(note.id, md, html, words);
      dirtyRef.current = false;
      setCurrent(updated);
      setStatus("saved");
      onChanged();
    } catch {
      dirtyRef.current = true;
      setStatus("error");
    }
  }, [note.id, onChanged]);

  const editor = useEditor({
    extensions: [StarterKit, Markdown.configure({ html: true, transformPastedText: true })],
    content: note.content_md,
    editorProps: { attributes: { "aria-label": "便签内容", class: "markdown-body" } },
    onUpdate({ editor: instance }) {
      dirtyRef.current = true;
      setStatus("saving");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void flush(instance), 500);
    },
  });

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (editor) void flush(editor);
  }, [editor, flush]);

  const updateTitle = async () => {
    const next = title.trim() || "无标题";
    if (next === (current.title ?? "")) return;
    setTitle(next);
    setStatus("saving");
    try {
      setCurrent(await client.notes.updateTitle(current.id, next));
      setStatus("saved");
      onChanged();
    } catch { setStatus("error"); }
  };

  const mutate = async (task: Promise<Note>) => {
    setStatus("saving");
    try {
      setCurrent(await task);
      setStatus("saved");
      onChanged();
    } catch { setStatus("error"); }
  };

  const panel = (
      <section className={`note-editor${embedded ? " note-editor--embedded" : ""}`} role="dialog" aria-label="编辑便签">
        {!embedded && <header className="note-editor__head">
          <span data-tauri-drag-region={desktopWindow ? true : undefined} className="note-editor__accent" style={{ background: current.color ?? "var(--accent)" }} />
          <input
            className="note-editor__title"
            value={title}
            aria-label="便签标题"
            placeholder="无标题"
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => void updateTitle()}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          />
          <button
            className={`btn-icon${current.is_pinned ? " is-selected" : ""}`}
            aria-label={current.is_pinned ? "取消置顶" : "置顶"}
            title={current.is_pinned ? "取消置顶" : "置顶"}
            onClick={() => void mutate(client.notes.setPinned(current.id, !current.is_pinned))}
          ><PushPin size={16} weight={current.is_pinned ? "fill" : "regular"} /></button>
          <button className="btn-icon" aria-label="关闭编辑器" title="关闭" onClick={onClose}><X size={16} weight="bold" /></button>
        </header>}

        <div className="note-editor__options">
          <select
            className="select note-editor__group"
            aria-label="移动到分组"
            value={current.group_id ?? ""}
            onChange={(e) => void mutate(client.notes.moveGroup(current.id, e.target.value ? Number(e.target.value) : null))}
          >
            <option value="">全部便签</option>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
          <div className="color-swatches" aria-label="便签颜色">
            {colors.map((color) => (
              <button
                key={color ?? "default"}
                className={`color-swatch${current.color === color ? " is-active" : ""}`}
                style={{ background: color ?? "var(--surface-2)" }}
                onClick={() => void mutate(client.notes.setColor(current.id, color))}
                aria-label={color ? `设置颜色 ${color}` : "使用默认颜色"}
                title={color ? "设置便签颜色" : "默认颜色"}
              >{current.color === color && <Check size={11} weight="bold" />}</button>
            ))}
          </div>
        </div>

        {editor && <EditorToolbar editor={editor} />}
        <EditorContent editor={editor} className="editor-content" />

        <footer className="note-editor__status mono">
          <span className={`save-status save-status--${status}`}>{status === "saving" ? "正在保存" : status === "error" ? "保存失败" : "已保存"}</span>
          <span>{current.word_count} 字</span>
          {allowTrash && <button className="editor-trash" onClick={() => setConfirmingDelete(true)}><Trash size={14} /> 删除</button>}
        </footer>
      </section>
  );

  return (
    <>
    {embedded ? panel : <div className="modal-scrim" onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}>{panel}</div>}
    {allowTrash && <ConfirmDialog
      open={confirmingDelete}
      title="删除这条便签？"
      description={`「${current.title?.trim() || "无标题"}」将被移到回收站，可以稍后恢复。`}
      confirmAriaLabel="确认删除便签"
      busy={deleting}
      onCancel={() => setConfirmingDelete(false)}
      onConfirm={async () => {
        setDeleting(true);
        await onTrash(current.id);
        setDeleting(false);
        setConfirmingDelete(false);
        onClose();
      }}
    />}
    </>
  );
}
