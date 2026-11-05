import { Archive, ArrowClockwise, NotePencil, Plus, WarningCircle } from "@phosphor-icons/react";
import type { DragEvent, ReactNode } from "react";
import type { Note } from "../../ipc/types";
import { NoteListItem } from "./NoteListItem";

type DropPosition = "before" | "after";

export interface OneNoteWorkspaceProps {
  notes: Note[];
  collectionTitle: string;
  loading: boolean;
  error: string | null;
  showArchived: boolean;
  selectedId: number | null;
  wanderedIds: Set<number>;
  hangingIds: Set<number>;
  draggedNoteId: number | null;
  dropTarget: { id: number; position: DropPosition } | null;
  pane?: ReactNode;
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

/** The fullscreen working surface: notebook sections, page index, writing page. */
export function OneNoteWorkspace({
  notes,
  collectionTitle,
  loading,
  error,
  showArchived,
  selectedId,
  wanderedIds,
  hangingIds,
  draggedNoteId,
  dropTarget,
  pane,
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
}: OneNoteWorkspaceProps) {
  return (
    <div className="notes-workspace is-one-note">
      <section className="notes notes--one-note-list">
        <header className="notes__head">
          <div className="notes__heading">
            <span className="notes__eyebrow">Notebook Index</span>
            <h1 className="notes__title">{collectionTitle}</h1>
            <div className="notes__subline">
              <span className="notes__count mono">{notes.length} 条便签</span>
              <button
                type="button"
                className={`notes__archive-toggle${showArchived ? " is-on" : ""}`}
                aria-pressed={showArchived}
                title={showArchived ? "只看未归档便签" : "显示归档便签"}
                onClick={() => onToggleArchived(!showArchived)}
              >
                <Archive size={12} weight={showArchived ? "fill" : "regular"} />
                <span>显示归档</span>
              </button>
            </div>
          </div>
          <div className="notes__head-actions">
            <button type="button" className="btn btn-primary" onClick={onCreate} title="新建便签">
              <Plus size={15} weight="bold" />
              <span>新建</span>
            </button>
          </div>
        </header>

        {loading ? (
          <div className="notes__body"><div className="note-skeleton"><span /><span /><span /></div></div>
        ) : error ? (
          <div className="notes__empty">
            <WarningCircle size={28} />
            <div><p className="notes__empty-title">便签加载失败</p><p>{error}</p></div>
            <button className="btn" onClick={onRefresh}><ArrowClockwise size={15} />重试</button>
          </div>
        ) : notes.length === 0 ? (
          <div className="notes__empty">
            <div className="notes__empty-glyph"><NotePencil size={23} weight="duotone" /></div>
            <div><p className="notes__empty-title">这里还没有便签</p><p>新建一条，随手记下今天的事项。</p></div>
            <button className="btn btn-primary" onClick={onCreate}><Plus size={15} />新建便签</button>
          </div>
        ) : (
          <div className="notes__body">
            <ul className="notes__list notes__list--one-note" aria-label="便签索引">
              {notes.map((note, index) => {
                const wanderActive = wanderedIds.has(note.id);
                return (
                  <NoteListItem
                    key={note.id}
                    note={note}
                    selected={selectedId === note.id}
                    wanderActive={wanderActive}
                    hangingActive={hangingIds.has(note.id)}
                    index={index}
                    onOpen={() => onOpen(note)}
                    onTogglePin={() => onTogglePin(note)}
                    onToggleVisibility={() => onToggleVisibility(note)}
                    onToggleArchive={() => onToggleArchive(note)}
                    onWander={() => onWander(note)}
                    onHang={() => onHang(note)}
                    onTrash={() => onTrash(note)}
                    draggable={!wanderActive}
                    dragging={draggedNoteId === note.id}
                    dropPosition={dropTarget?.id === note.id ? dropTarget.position : null}
                    onDragStart={(event) => onDragStart(note, event)}
                    onDragOver={(event) => onDragOver(note.id, event)}
                    onDragLeave={onDragLeave}
                    onDrop={(event) => onDrop(note.id, event)}
                    onDragEnd={onDragEnd}
                  />
                );
              })}
            </ul>
          </div>
        )}
      </section>
      <aside className="one-note-pane" aria-label="便签编辑区">
        {pane ?? <EmptyPage onCreate={onCreate} />}
      </aside>
    </div>
  );
}

function EmptyPage({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="one-note-pane__empty">
      <div className="one-note-pane__paper">
        <span className="one-note-pane__folio">Blank sheet / ready</span>
        <span className="one-note-pane__mark"><NotePencil size={24} weight="duotone" /></span>
        <h2>选择一条便签</h2>
        <p>在中间列表中选择便签，即可像 OneNote 一样在右侧阅读和编辑。墨色索引不会离开视线，纸页始终为书写留白。</p>
        <div className="one-note-pane__hints">
          <span><kbd>Ctrl</kbd>N 新建</span>
          <span><kbd>Ctrl</kbd>K 搜索</span>
        </div>
        <button className="btn btn-primary" onClick={onCreate}><Plus size={15} />新建便签</button>
      </div>
    </div>
  );
}
