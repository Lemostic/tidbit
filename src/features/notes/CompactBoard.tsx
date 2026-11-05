import { Archive, ArrowClockwise, NotePencil, Plus, WarningCircle } from "@phosphor-icons/react";
import type { CSSProperties, DragEvent } from "react";
import type { Note } from "../../ipc/types";
import { NoteCard } from "./NoteCard";

type DropPosition = "before" | "after";

export interface CompactBoardProps {
  notes: Note[];
  collectionTitle: string;
  loading: boolean;
  error: string | null;
  showArchived: boolean;
  wanderedIds: Set<number>;
  hangingIds: Set<number>;
  draggedNoteId: number | null;
  dropTarget: { id: number; position: DropPosition } | null;
  onToggleArchived: (checked: boolean) => void;
  onCreate: () => void;
  onRefresh: () => void;
  onOpen: (note: Note) => void;
  onTogglePin: (note: Note) => void;
  onToggleVisibility: (note: Note) => void;
  onToggleArchive: (note: Note) => void;
  onWander: (note: Note) => void;
  onHang: (note: Note) => void;
  onTrash: (note: Note) => void;
  onDragStart: (note: Note, event: DragEvent<HTMLElement>) => void;
  onDragOver: (noteId: number, event: DragEvent<HTMLElement>) => void;
  onDragLeave: (event: DragEvent<HTMLElement>) => void;
  onDrop: (noteId: number, event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
}

/** The floating-window working surface: a desk of sticky notes. */
export function CompactBoard({
  notes,
  collectionTitle,
  loading,
  error,
  showArchived,
  wanderedIds,
  hangingIds,
  draggedNoteId,
  dropTarget,
  onToggleArchived,
  onCreate,
  onRefresh,
  onOpen,
  onTogglePin,
  onToggleVisibility,
  onToggleArchive,
  onWander,
  onHang,
  onTrash,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: CompactBoardProps) {
  return (
    <div className="notes-workspace is-sticky-board">
      <section className="notes" aria-busy={loading}>
        <header className="notes__head">
          <div className="notes__heading">
            <span className="notes__eyebrow">Field Notes</span>
            <div className="notes__title-line">
              <h1 className="notes__title" title={collectionTitle}>{collectionTitle}</h1>
              <span className="notes__count mono">{notes.length} 条</span>
            </div>
          </div>
          <div className="notes__head-actions">
            <label className="notes__archive-toggle" title="显示归档便签">
              <Archive size={13} />
              <span>显示归档</span>
              <input
                type="checkbox"
                className="switch"
                aria-label="显示归档"
                checked={showArchived}
                onChange={(event) => onToggleArchived(event.target.checked)}
              />
            </label>
            <button type="button" className="btn btn-primary" onClick={onCreate}>
              <Plus size={15} weight="bold" />
              新建
            </button>
          </div>
        </header>

        {loading ? (
          <div className="notes__body">
            <div className="notes__skeletons" aria-hidden="true">
              {[0, 1, 2].map((index) => (
                <div className="note-skeleton" key={index}>
                  <span /><span /><span /><span /><span />
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="notes__empty notes__empty--error" role="alert">
            <div className="notes__empty-glyph"><WarningCircle size={22} weight="duotone" /></div>
            <p className="notes__empty-title">便签加载失败</p>
            <p className="notes__empty-copy">{error}</p>
            <button type="button" className="btn notes__empty-action" onClick={onRefresh}>
              <ArrowClockwise size={14} />
              重试
            </button>
          </div>
        ) : notes.length === 0 ? (
          <div className="notes__empty notes__empty--blank">
            <div className="notes__empty-glyph"><NotePencil size={21} weight="duotone" /></div>
            <p className="notes__empty-title">这里还没有便签</p>
            <p className="notes__empty-copy">新建一张便签，随手记下今天的事项。</p>
            <button type="button" className="btn btn-primary notes__empty-action" onClick={onCreate}>
              <Plus size={14} weight="bold" />
              新建便签
            </button>
          </div>
        ) : (
          <div className="notes__body">
            <div className="notes__list" aria-label="便签墙">
              {notes.map((note, index) => {
                const wanderActive = wanderedIds.has(note.id);
                const stateClass = [
                  draggedNoteId === note.id ? " is-dragging" : "",
                  dropTarget?.id === note.id ? ` is-drop-${dropTarget.position}` : "",
                  note.is_pinned ? " is-pinned" : "",
                  note.is_archived ? " is-archived" : "",
                  note.is_content_hidden ? " is-hidden" : "",
                ].join("");
                return (
                  <div
                    key={note.id}
                    className={`note-card${stateClass}`}
                    style={{ "--i": index, "--card-accent": note.color ?? "var(--accent)" } as CSSProperties}
                    draggable={!wanderActive}
                    aria-grabbed={draggedNoteId === note.id}
                    onDragStart={(event) => onDragStart(note, event)}
                    onDragOver={(event) => onDragOver(note.id, event)}
                    onDragLeave={onDragLeave}
                    onDrop={(event) => onDrop(note.id, event)}
                    onDragEnd={onDragEnd}
                  >
                    <NoteCard
                      note={note}
                      wanderActive={wanderActive}
                      hangingActive={hangingIds.has(note.id)}
                      onOpen={() => onOpen(note)}
                      onToggleVisibility={() => onToggleVisibility(note)}
                      onTogglePin={() => onTogglePin(note)}
                      onToggleArchive={() => onToggleArchive(note)}
                      onWander={() => onWander(note)}
                      onHang={() => onHang(note)}
                      onTrash={() => onTrash(note)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
