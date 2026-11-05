import { ArrowClockwise, Archive, Trash, WarningCircle } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { client } from "../../ipc/client";
import type { Note } from "../../ipc/types";
import type { ToastState } from "../../ui/Toast";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { sanitizeNoteHtml } from "./sanitizeNoteHtml";

interface TrashViewProps {
  onNotice: (toast: ToastState) => void;
  onRestored: () => void;
}

function formatTrashedAt(timestamp: number | null) {
  if (!timestamp) return "时间未知";
  const date = new Date(timestamp);
  return date.toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function TrashView({ onNotice, onRestored }: TrashViewProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState<Note | null>(null);
  const [confirmingPurge, setConfirmingPurge] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setNotes(await client.notes.listTrashed());
    } catch {
      setError("无法读取回收站，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const restoreNote = async (note: Note) => {
    try {
      await client.notes.restore(note.id);
      await refresh();
      onRestored();
      onNotice({ kind: "success", message: `「${note.title?.trim() || "无标题"}」已恢复` });
    } catch {
      onNotice({ kind: "error", message: "恢复便签失败" });
    }
  };

  const deleteNote = async () => {
    if (!confirmingDelete) return;
    setBusy(true);
    try {
      await client.notes.delete(confirmingDelete.id);
      await refresh();
      onNotice({ kind: "success", message: "便签已彻底删除" });
    } catch {
      onNotice({ kind: "error", message: "彻底删除失败" });
    } finally {
      setBusy(false);
      setConfirmingDelete(null);
    }
  };

  const purgeTrash = async () => {
    setBusy(true);
    try {
      const count = await client.notes.purgeTrash();
      await refresh();
      onRestored();
      onNotice({ kind: "success", message: count > 0 ? `已清空回收站，共删除 ${count} 条便签` : "回收站已经是空的" });
    } catch {
      onNotice({ kind: "error", message: "清空回收站失败" });
    } finally {
      setBusy(false);
      setConfirmingPurge(false);
    }
  };

  const renderedPreviews = useMemo(() => new Map(notes.map((note) => [note.id, sanitizeNoteHtml(note.content_html)])), [notes]);

  return (
    <section className="notes trash-view">
      <header className="notes__head">
        <div className="notes__heading">
          <span className="notes__eyebrow">数据恢复</span>
          <div className="notes__title-row">
            <h1 className="notes__title">回收站</h1>
            <span className="notes__count mono">{notes.length}</span>
          </div>
          <p className="notes__description">删除的便签会保留 30 天，之后自动清理</p>
        </div>
        <div className="notes__head-actions">
          {notes.length > 0 && (
            <button className="btn btn-ghost is-danger" disabled={busy} onClick={() => setConfirmingPurge(true)}>
              <Trash size={15} />清空回收站
            </button>
          )}
        </div>
      </header>

      {loading ? (
        <div className="notes__body"><div className="note-skeleton"><span /><span /><span /></div></div>
      ) : error ? (
        <div className="notes__empty">
          <WarningCircle size={28} />
          <div><p className="notes__empty-title">回收站加载失败</p><p>{error}</p></div>
          <button className="btn" onClick={() => void refresh()}><ArrowClockwise size={15} />重试</button>
        </div>
      ) : notes.length === 0 ? (
        <div className="notes__empty">
          <div className="notes__empty-glyph"><Archive size={23} weight="duotone" /></div>
          <div><p className="notes__empty-title">回收站是空的</p><p>删除的便签会出现在这里，可以在 30 天内找回。</p></div>
        </div>
      ) : (
        <div className="notes__body">
          <div className="notes__list">
            {notes.map((note) => {
              const preview = renderedPreviews.get(note.id) ?? "";
              return (
                <article key={note.id} className="note-card note-card--trashed">
                  <div className="note-card__inner">
                    <header className="note-card__head">
                      <p className="note-card__title">{note.is_content_hidden ? "隐私便签" : note.title?.trim() || "无标题"}</p>
                      <div className="note-card__actions">
                        <button
                          className="note-action"
                          aria-label="恢复便签"
                          title="恢复便签"
                          disabled={busy}
                          onClick={() => void restoreNote(note)}
                        ><ArrowClockwise size={14} /></button>
                        <button
                          className="note-action is-danger"
                          aria-label="彻底删除"
                          title="彻底删除（不可恢复）"
                          disabled={busy}
                          onClick={() => setConfirmingDelete(note)}
                        ><Trash size={14} /></button>
                      </div>
                    </header>
                    {preview ? (
                      <div className="note-card__content" dangerouslySetInnerHTML={{ __html: preview }} />
                    ) : (
                      <p className="note-card__placeholder">这条便签没有可预览的内容</p>
                    )}
                    <footer className="note-card__meta mono">
                      <span>删除于 {formatTrashedAt(note.trashed_at)}</span>
                      <span>{note.word_count} 字</span>
                      <span>#{note.id}</span>
                    </footer>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmingDelete)}
        title="彻底删除这条便签？"
        description={`「${confirmingDelete?.title?.trim() || "无标题"}」将被永久删除，无法恢复。`}
        confirmAriaLabel="确认彻底删除"
        busy={busy}
        onCancel={() => setConfirmingDelete(null)}
        onConfirm={deleteNote}
      />
      <ConfirmDialog
        open={confirmingPurge}
        title="清空回收站？"
        description={`将永久删除回收站中的 ${notes.length} 条便签，此操作无法撤销。`}
        confirmAriaLabel="确认清空回收站"
        busy={busy}
        onCancel={() => setConfirmingPurge(false)}
        onConfirm={purgeTrash}
      />
    </section>
  );
}