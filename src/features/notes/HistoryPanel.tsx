import { Clock, ClockCounterClockwise, WarningCircle, X } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { client } from "../../ipc/client";
import type { Note, Revision } from "../../ipc/types";
import type { ToastState } from "../../ui/Toast";

interface HistoryPanelProps {
  note: Note;
  onClose: () => void;
  onRestore: (note: Note) => void;
  onNotice: (toast: ToastState) => void;
}

function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function previewOf(md: string) {
  const text = md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " [图片] ")
    .replace(/```[\s\S]*?```/g, " [代码块] ")
    .replace(/[#>*`\-[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text || "（空内容）";
}

export function HistoryPanel({ note, onClose, onRestore, onNotice }: HistoryPanelProps) {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await client.notes.revisions(note.id);
      setRevisions(list);
      setSelectedId((current) => (current !== null && list.some((r) => r.id === current)) ? current : (list[0]?.id ?? null));
    } catch {
      setError("无法读取版本历史，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [note.id]);

  useEffect(() => { void refresh(); }, [refresh]);

  const selected = useMemo(() => revisions.find((r) => r.id === selectedId) ?? null, [revisions, selectedId]);

  const restore = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const restored = await client.notes.restoreRevision(note.id, selected.id);
      onRestore(restored);
      onNotice({ kind: "success", message: "已恢复该版本" });
    } catch {
      onNotice({ kind: "error", message: "恢复版本失败" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-scrim" onKeyDown={(event) => { event.stopPropagation(); if (event.key === "Escape") onClose(); }} onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal history-panel" role="dialog" aria-modal="true" aria-label="版本历史" onClick={(event) => event.stopPropagation()}>
        <header className="modal__head history-panel__head">
          <span className="history-panel__icon"><Clock size={15} weight="duotone" /></span>
          <h2 className="modal__title">版本历史</h2>
          <button className="btn-icon" aria-label="关闭版本历史" title="关闭" onClick={onClose}><X size={15} weight="bold" /></button>
        </header>

        {loading ? (
          <div className="notes__empty"><WarningCircle size={28} /><div><p className="notes__empty-title">正在加载版本</p></div></div>
        ) : error ? (
          <div className="notes__empty"><WarningCircle size={28} /><div><p className="notes__empty-title">加载失败</p><p>{error}</p></div></div>
        ) : revisions.length === 0 ? (
          <div className="notes__empty">
            <div className="notes__empty-glyph"><ClockCounterClockwise size={23} weight="duotone" /></div>
            <div><p className="notes__empty-title">还没有历史版本</p><p>编辑便签后会自动保存历史快照。</p></div>
          </div>
        ) : (
          <div className="history-panel__body">
            <div className="history-panel__list">
              {revisions.map((revision) => (
                <button
                  key={revision.id}
                  type="button"
                  className={`history-panel__item${revision.id === selectedId ? " is-active" : ""}`}
                  aria-pressed={revision.id === selectedId}
                  onClick={() => setSelectedId(revision.id)}
                >
                  <span className="history-panel__time mono">{formatTime(revision.created_at)}</span>
                  <span className="history-panel__title">{revision.title?.trim() || "无标题"}</span>
                  <span className="history-panel__words mono">{revision.content_md.replace(/\s/g, "").length} 字</span>
                </button>
              ))}
            </div>
            {selected && (
              <div className="history-panel__preview">
                <div className="history-panel__preview-meta mono">
                  <span>{formatTime(selected.created_at)}</span>
                  <span>{selected.content_md.replace(/\s/g, "").length} 字</span>
                </div>
                <pre className="history-panel__preview-text">{previewOf(selected.content_md)}</pre>
              </div>
            )}
            <footer className="history-panel__footer">
              <span className="history-panel__hint">恢复后当前内容会保留为新版本，可随时撤销。</span>
              <button className="btn btn-primary" disabled={!selected || busy} onClick={() => void restore()}>
                <ClockCounterClockwise size={15} weight="bold" />恢复此版本
              </button>
            </footer>
          </div>
        )}
      </section>
    </div>
  );
}
