import "./NoteListRow.css";
import { Clock, PushPin, Archive, Eye, Trash } from "@phosphor-icons/react";
import type { Note } from "../../ipc/types";

interface NoteListRowProps {
  note: Note;
  active?: boolean;
  onOpen?: (note: Note) => void;
  onContextMenu?: (event: React.MouseEvent, note: Note) => void;
  /** When provided, hovering the row reveals a trash button. Clicking it
   *  calls this callback without opening the note. */
  onTrash?: (note: Note) => void;
}

function formatRelativeTime(ts: number): string {
  if (!Number.isFinite(ts)) return "";
  const diff = Date.now() - ts;
  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (diff < min) return "刚刚";
  if (diff < hour) return Math.floor(diff / min) + " 分";
  if (diff < day) return Math.floor(diff / hour) + " 时";
  if (diff < 7 * day) return Math.floor(diff / day) + " 天";
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * Compact list-row for the middle column of the maximized Note layout.
 * One row per note: color dot + title + tags + timestamp. No cards.
 */
export function NoteListRow({ note, active, onOpen, onContextMenu, onTrash }: NoteListRowProps) {
  const color = note.color ?? "var(--border-strong)";
  return (
    <div
      className={`note-list-row${active ? " is-active" : ""}${onTrash ? " has-trash" : ""}`}
      style={{ "--row-color": color } as React.CSSProperties}
      onClick={() => onOpen?.(note)}
      onContextMenu={(e) => onContextMenu?.(e, note)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.(note);
        }
      }}
      aria-current={active ? "true" : undefined}
      aria-label={note.title || "无标题"}
    >
      <span className="note-list-row__color" aria-hidden="true" />
      <span className="note-list-row__main">
        <span className="note-list-row__title">{note.title || "无标题"}</span>
        {(note.tags && note.tags.length > 0) && (
          <span className="note-list-row__tags">
            {note.tags.slice(0, 2).map((t) => (
              <span key={t} className="note-list-row__tag">{t}</span>
            ))}
            {note.tags.length > 2 && (
              <span className="note-list-row__tag note-list-row__tag--more">+{note.tags.length - 2}</span>
            )}
          </span>
        )}
      </span>
      <span className="note-list-row__flags" aria-hidden="true">
        {note.is_pinned && <PushPin size={11} weight="fill" className="note-list-row__flag" />}
        {note.is_archived && <Archive size={11} weight="fill" className="note-list-row__flag" />}
        {note.is_content_hidden && <Eye size={11} weight="fill" className="note-list-row__flag" />}
        {note.reminder && <Clock size={11} weight="fill" className="note-list-row__flag" />}
      </span>
      <span className="note-list-row__meta mono">{note.word_count} 字</span>
      <span className="note-list-row__time mono">{formatRelativeTime(note.updated_at)}</span>
      {onTrash && (
        <button
          type="button"
          className="note-list-row__trash"
          aria-label={`删除便签：${note.title?.trim() || "无标题"}`}
          title="移到回收站"
          onClick={(event) => {
            event.stopPropagation();
            onTrash(note);
          }}
        >
          <Trash size={12} />
        </button>
      )}
    </div>
  );
}
