import { Clock, Eye, PushPin } from "@phosphor-icons/react";
import type { Note } from "../../ipc/types";

interface KanbanCardProps {
  note: Note;
  dragging?: boolean;
  onClick?: (note: Note) => void;
}

const NO_TITLE = "无标题";

export function KanbanCard({ note, dragging, onClick }: KanbanCardProps) {
  const accent = note.color ?? "var(--border-strong)";
  const title = note.title?.trim() || NO_TITLE;
  const tags = (note.tags ?? []).slice(0, 3);
  return (
    <article
      className={`kanban-card${dragging ? " is-dragging" : ""}`}
      style={{ "--card-color": accent } as React.CSSProperties}
      onClick={() => onClick?.(note)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(note); } }}
      draggable
      data-card-id={note.id}
      data-card-status={note.status}
    >
      <span className="kanban-card__stripe" aria-hidden="true" />
      <div className="kanban-card__body">
        <div className="kanban-card__head">
          <span className="kanban-card__title">{title}</span>
          {note.is_pinned && <PushPin size={11} weight="fill" className="kanban-card__pin" aria-label="已置顶" />}
          {note.is_content_hidden && <Eye size={11} className="kanban-card__pin" aria-label="已隐藏" />}
        </div>
        {tags.length > 0 && (
          <div className="kanban-card__tags">
            {tags.map((t) => <span key={t} className="kanban-card__tag">{t}</span>)}
            {(note.tags ?? []).length > 3 && <span className="kanban-card__tag kanban-card__tag--more">+{(note.tags ?? []).length - 3}</span>}
          </div>
        )}
        <div className="kanban-card__foot">
          {note.reminder && <Clock size={11} weight="fill" className="kanban-card__flag" aria-label="已设置提醒" />}
          <span className="kanban-card__words mono">{note.word_count} 字</span>
        </div>
      </div>
    </article>
  );
}
