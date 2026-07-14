import { Check, PushPin, Trash, X } from "@phosphor-icons/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { useCallback, useEffect, useRef, useState } from "react";
import { client } from "../../ipc/client";
import type { Group, Note } from "../../ipc/types";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { configurableColors, readableTextColor } from "../../ui/colorPalette";
import { EditorToolbar } from "./EditorToolbar";
import { useI18n } from "../../i18n";

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

export function NoteEditor({ note, groups, onClose, onChanged, onTrash, allowTrash = true, desktopWindow = false, embedded = false }: NoteEditorProps) {
  const { t } = useI18n();
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
    editorProps: { attributes: { "aria-label": t("editor.content"), class: "markdown-body" } },
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
    const next = title.trim() || t("notes.untitled");
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
      <section className={`note-editor${embedded ? " note-editor--embedded" : ""}`} role="dialog" aria-label={t("editor.label")}>
        {!embedded && <header className="note-editor__head">
          <span data-tauri-drag-region={desktopWindow ? true : undefined} className="note-editor__accent" style={{ background: current.color ?? "var(--accent)" }} />
          <input
            className="note-editor__title"
            value={title}
            aria-label={t("editor.title")}
            placeholder={t("notes.untitled")}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => void updateTitle()}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          />
          <button
            className={`btn-icon${current.is_pinned ? " is-selected" : ""}`}
            aria-label={current.is_pinned ? t("notes.unpin") : t("notes.pin")}
            title={current.is_pinned ? t("notes.unpin") : t("notes.pin")}
            onClick={() => void mutate(client.notes.setPinned(current.id, !current.is_pinned))}
          ><PushPin size={16} weight={current.is_pinned ? "fill" : "regular"} /></button>
          <button className="btn-icon" aria-label={t("common.close")} title={t("common.close")} onClick={onClose}><X size={16} weight="bold" /></button>
        </header>}

        <div className="note-editor__options">
          <select
            className="select note-editor__group"
            aria-label={t("editor.moveGroup")}
            value={current.group_id ?? ""}
            onChange={(e) => void mutate(client.notes.moveGroup(current.id, e.target.value ? Number(e.target.value) : null))}
          >
            <option value="">{t("groups.allNotes")}</option>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
          <div className="color-swatches" aria-label={t("editor.color")}>
            {configurableColors.map((color) => (
              <button
                key={color.name}
                className={`color-swatch${current.color === color.value ? " is-active" : ""}`}
                style={{ background: color.value ?? "var(--surface-2)", color: color.value ? readableTextColor(color.value) : "var(--fg)" }}
                onClick={() => void mutate(client.notes.setColor(current.id, color.value))}
                aria-label={color.value ? t("editor.colorChoice", { name: color.name, value: color.value }) : t("editor.defaultColor")}
                title={color.name}
              >{current.color === color.value && <Check size={11} weight="bold" />}</button>
            ))}
          </div>
        </div>

        {editor && <EditorToolbar editor={editor} />}
        <EditorContent editor={editor} className="editor-content" />

        <footer className="note-editor__status mono">
          <span className={`save-status save-status--${status}`}>{t(status === "saving" ? "editor.saving" : status === "error" ? "editor.saveError" : "editor.saved")}</span>
          <span>{t("notes.words", { count: current.word_count })}</span>
          {allowTrash && <button className="editor-trash" onClick={() => setConfirmingDelete(true)}><Trash size={14} /> {t("common.delete")}</button>}
        </footer>
      </section>
  );

  return (
    <>
    {embedded ? panel : <div className="modal-scrim" onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}>{panel}</div>}
    {allowTrash && <ConfirmDialog
      open={confirmingDelete}
      title={t("notes.deleteTitle")}
      description={t("notes.deleteDescription", { title: current.title?.trim() || t("notes.untitled") })}
      confirmAriaLabel={t("notes.confirmDelete")}
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
