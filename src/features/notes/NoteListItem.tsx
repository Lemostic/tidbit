import {
  Archive,
  CaretDown,
  CaretUp,
  Cloud,
  CoatHanger,
  Eye,
  EyeSlash,
  LockKey,
  PushPin,
  Trash,
} from "@phosphor-icons/react";
import { useMemo, useState, type CSSProperties, type DragEventHandler, type MouseEvent } from "react";
import type { Note } from "../../ipc/types";
import { sanitizeNoteHtml } from "./sanitizeNoteHtml";

interface NoteListItemProps {
  note: Note;
  selected: boolean;
  wanderActive: boolean;
  hangingActive: boolean;
  /** Render order index used for the staggered entry animation. */
  index: number;
  onOpen: () => void;
  onTogglePin: () => void;
  onToggleVisibility: () => void;
  onToggleArchive: () => void;
  onWander: () => void;
  onHang: () => void;
  onTrash: () => void;
  draggable?: boolean;
  dragging?: boolean;
  dropPosition?: "before" | "after" | null;
  onDragStart?: DragEventHandler<HTMLLIElement>;
  onDragOver?: DragEventHandler<HTMLLIElement>;
  onDragLeave?: DragEventHandler<HTMLLIElement>;
  onDrop?: DragEventHandler<HTMLLIElement>;
  onDragEnd?: DragEventHandler<HTMLLIElement>;
}

export function formatRelative(timestamp: number): string {
  if (!timestamp) return "";
  const now = Date.now();
  const diff = Math.max(0, now - timestamp);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < hour) return `${Math.max(1, Math.round(diff / minute))} 分钟前`;
  if (diff < day) return `${Math.round(diff / hour)} 小时前`;
  if (diff < 7 * day) return `${Math.round(diff / day)} 天前`;
  const date = new Date(timestamp);
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

function stripPlain(html: string): string {
  if (typeof window === "undefined") return html;
  const container = window.document.createElement("div");
  container.innerHTML = html;
  return (container.textContent ?? "").replace(/\s+/g, " ").trim();
}

const PREVIEW_LIMIT = 96;

export function NoteListItem({
  note,
  selected,
  wanderActive,
  hangingActive,
  index,
  onOpen,
  onTogglePin,
  onToggleVisibility,
  onToggleArchive,
  onWander,
  onHang,
  onTrash,
  draggable = false,
  dragging = false,
  dropPosition = null,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: NoteListItemProps) {
  const [expanded, setExpanded] = useState(false);
  const titleText = note.is_content_hidden ? "隐私便签" : note.title?.trim() || "无标题";
  const plainContent = note.is_content_hidden ? "" : stripPlain(note.content_html);
  const preview = note.is_content_hidden ? "该条便签内容已加密" : plainContent.slice(0, PREVIEW_LIMIT);
  const renderedHtml = useMemo(
    () => note.is_content_hidden ? "" : sanitizeNoteHtml(note.content_html),
    [note.content_html, note.is_content_hidden],
  );
  const accent = note.color ?? "var(--accent)";
  const canOpen = !wanderActive && !note.is_content_hidden;
  const canExpand = !wanderActive && !note.is_content_hidden
    && (plainContent.length > PREVIEW_LIMIT || /<audio\b/i.test(renderedHtml));
  const showingExpanded = expanded && canExpand;
  const openHint = note.is_content_hidden
    ? "内容已隐藏，显示后才能打开"
    : wanderActive
      ? "云游中的便签请在桌面卡片中编辑"
      : undefined;
  const runAction = (event: MouseEvent<HTMLButtonElement>, action: () => void) => {
    event.stopPropagation();
    action();
  };

  return (
    <li
      className={`note-list-item${selected ? " is-selected" : ""}${note.is_pinned ? " is-pinned" : ""}${note.is_archived ? " is-archived" : ""}${showingExpanded ? " is-expanded" : ""}${dragging ? " is-dragging" : ""}${dropPosition ? ` is-drop-${dropPosition}` : ""}`}
      style={{ "--card-accent": accent, "--i": index } as CSSProperties}
      draggable={draggable}
      aria-grabbed={draggable ? dragging : undefined}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <button
        type="button"
        className="note-list-item__row"
        onClick={() => { if (canOpen) onOpen(); }}
        aria-pressed={selected}
        aria-disabled={!canOpen || undefined}
        aria-label={`打开便签 ${titleText}`}
        title={openHint}
      >
        <span className="note-list-item__accent" aria-hidden="true" />
        <span className="note-list-item__title">
          {note.is_pinned ? <PushPin size={11} weight="fill" className="note-list-item__pin" /> : null}
          {note.is_content_hidden ? <LockKey size={11} weight="duotone" className="note-list-item__lock" /> : null}
          <span className="note-list-item__title-text">{titleText}</span>
        </span>
        {preview ? <span className="note-list-item__preview">{preview}</span> : null}
        <span className="note-list-item__meta mono" aria-hidden="true">
          <span className="note-list-item__flags">
            {hangingActive ? (
              <span className="note-list-item__flag note-list-item__flag--hang" title="晾挂在晾衣绳上">
                <CoatHanger size={11} weight="fill" />
              </span>
            ) : null}
            {wanderActive ? (
              <span className="note-list-item__flag note-list-item__flag--wander" title="桌面云游中">
                <Cloud size={11} weight="duotone" />
              </span>
            ) : null}
            {note.is_archived ? (
              <span className="note-list-item__flag note-list-item__flag--archive" title="已归档">
                <Archive size={11} weight="duotone" />
              </span>
            ) : null}
          </span>
          {formatRelative(note.updated_at)}
          <span className="note-list-item__dot" />
          <span>{note.word_count} 字</span>
        </span>
      </button>
      <div className="note-list-item__actions" role="group" aria-label={`便签操作 ${titleText}`}>
        {canExpand && (
          <button
            type="button"
            className="note-list-item__action"
            aria-label={showingExpanded ? "收起内容" : "展开全文"}
            aria-expanded={showingExpanded}
            aria-controls={`note-list-item-content-${note.id}`}
            title={showingExpanded ? "收起内容" : "展开全文"}
            onClick={(event) => runAction(event, () => setExpanded((value) => !value))}
          >
            {showingExpanded ? <CaretUp size={14} /> : <CaretDown size={14} />}
          </button>
        )}
        <button
          type="button"
          className={`note-list-item__action${hangingActive ? " is-active" : ""}`}
          aria-label={hangingActive ? "从晾衣绳取下" : "晾到绳上"}
          title={
            wanderActive
              ? "先关闭云游便签再挂到绳上"
              : hangingActive
                ? "从晾衣绳取下"
                : "晾到绳上"
          }
          disabled={wanderActive}
          onClick={(event) => runAction(event, onHang)}
        >
          <CoatHanger size={14} weight={hangingActive ? "fill" : "regular"} />
        </button>
        <button
          type="button"
          className="note-list-item__action"
          aria-label="云游便签"
          title={hangingActive ? "先从晾衣绳取下" : "在桌面单独显示"}
          disabled={wanderActive || hangingActive}
          onClick={(event) => runAction(event, onWander)}
        >
          <Cloud size={14} weight="duotone" />
        </button>
        <button
          type="button"
          className={`note-list-item__action${note.is_content_hidden ? " is-active" : ""}`}
          aria-label={note.is_content_hidden ? "显示内容" : "隐藏内容"}
          title={note.is_content_hidden ? "显示便签内容" : "隐藏便签内容"}
          disabled={wanderActive}
          onClick={(event) => runAction(event, onToggleVisibility)}
        >
          {note.is_content_hidden ? <EyeSlash size={14} weight="fill" /> : <Eye size={14} />}
        </button>
        <button
          type="button"
          className={`note-list-item__action${note.is_pinned ? " is-active" : ""}`}
          aria-label={note.is_pinned ? "取消置顶" : "置顶"}
          title={note.is_pinned ? "取消置顶" : "置顶"}
          onClick={(event) => runAction(event, onTogglePin)}
        >
          <PushPin size={14} weight={note.is_pinned ? "fill" : "regular"} />
        </button>
        <button
          type="button"
          className={`note-list-item__action${note.is_archived ? " is-active" : ""}`}
          aria-label={note.is_archived ? "取消归档" : "归档便签"}
          title={note.is_archived ? "取消归档" : "归档后默认隐藏"}
          disabled={wanderActive}
          onClick={(event) => runAction(event, onToggleArchive)}
        >
          {note.is_archived ? <Archive size={14} weight="fill" /> : <Archive size={14} />}
        </button>
        <button
          type="button"
          className="note-list-item__action is-danger"
          aria-label="删除便签"
          title="移到回收站"
          disabled={wanderActive}
          onClick={(event) => runAction(event, onTrash)}
        >
          <Trash size={14} />
        </button>
      </div>
      {showingExpanded && (
        <div
          id={`note-list-item-content-${note.id}`}
          className="note-list-item__expanded"
          onClick={(event) => event.stopPropagation()}
        >
          {renderedHtml
            ? <div className="note-list-item__content" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
            : <p className="note-list-item__content-empty">暂无正文</p>}
        </div>
      )}
    </li>
  );
}
