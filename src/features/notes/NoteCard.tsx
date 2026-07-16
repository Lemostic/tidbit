import { Archive, CaretDown, CaretUp, Cloud, Eye, EyeSlash, LockKey, PushPin, Trash } from "@phosphor-icons/react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Note } from "../../ipc/types";
import { sanitizeNoteHtml } from "./sanitizeNoteHtml";

interface NoteCardProps {
  note: Note;
  onOpen: () => void;
  onTogglePin: () => void;
  onToggleVisibility: () => void;
  onToggleArchive: () => void;
  onWander: () => void;
  onTrash: () => void;
  wanderActive?: boolean;
}

const collapsedHeight = 220;

function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

export function NoteCard({ note, onOpen, onTogglePin, onToggleVisibility, onToggleArchive, onWander, onTrash, wanderActive = false }: NoteCardProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [canCollapse, setCanCollapse] = useState(false);
  const renderedHtml = useMemo(() => sanitizeNoteHtml(note.content_html), [note.content_html]);

  useLayoutEffect(() => {
    setExpanded(false);
    const content = contentRef.current;
    if (!content) return;
    const measure = () => setCanCollapse(content.scrollHeight > collapsedHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, [note.id, renderedHtml]);

  return (
    <article
      className={`note-card__inner${note.is_content_hidden ? " is-content-hidden" : ""}${wanderActive ? " is-wandering" : ""}`}
      onClick={note.is_content_hidden || wanderActive ? undefined : (event) => {
        if (event.target instanceof Element && event.target.closest("[data-audio-recording]")) return;
        onOpen();
      }}
    >
      <header className="note-card__head">
        <p className="note-card__title">{note.is_content_hidden ? "隐私便签" : note.title?.trim() || "无标题"}</p>
        {note.is_archived && <span className="note-card__archived">已归档</span>}
        {wanderActive && <span className="note-card__wandering">桌面云游中</span>}
        <div className="note-card__actions">
          <button
            className="note-action"
            aria-label="云游便签"
            title="在桌面单独显示"
            disabled={wanderActive}
            onClick={(event) => { event.stopPropagation(); onWander(); }}
          ><Cloud size={14} weight="duotone" /></button>
          <button
            className={`note-action${note.is_content_hidden ? " is-active" : ""}`}
            aria-label={note.is_content_hidden ? "显示内容" : "隐藏内容"}
            title={note.is_content_hidden ? "显示便签内容" : "隐藏便签内容"}
            disabled={wanderActive}
            onClick={(event) => { event.stopPropagation(); onToggleVisibility(); }}
          >{note.is_content_hidden ? <EyeSlash size={14} weight="fill" /> : <Eye size={14} />}</button>
          <button
            className={`note-action${note.is_pinned ? " is-active" : ""}`}
            aria-label={note.is_pinned ? "取消置顶" : "置顶"}
            title={note.is_pinned ? "取消置顶" : "置顶"}
            onClick={(event) => { event.stopPropagation(); onTogglePin(); }}
          ><PushPin size={14} weight={note.is_pinned ? "fill" : "regular"} /></button>
          <button
            className={`note-action${note.is_archived ? " is-active" : ""}`}
            aria-label={note.is_archived ? "取消归档" : "归档便签"}
            title={note.is_archived ? "取消归档" : "归档后默认隐藏"}
            disabled={wanderActive}
            onClick={(event) => { event.stopPropagation(); onToggleArchive(); }}
          ><Archive size={14} weight={note.is_archived ? "fill" : "regular"} /></button>
          <button
            className="note-action is-danger"
            aria-label="删除便签"
            title="移到回收站"
            disabled={wanderActive}
            onClick={(event) => { event.stopPropagation(); onTrash(); }}
          ><Trash size={14} /></button>
        </div>
      </header>

      {note.is_content_hidden ? (
        <div className="note-card__encrypted"><LockKey size={17} weight="duotone" /><span>该条便签内容已加密</span></div>
      ) : renderedHtml ? (
        <div
          ref={contentRef}
          className={`note-card__content${expanded ? " is-expanded" : ""}`}
          style={canCollapse && !expanded ? { maxHeight: collapsedHeight } : undefined}
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      ) : (
        <p className="note-card__placeholder">点击开始记录内容</p>
      )}

      {!note.is_content_hidden && canCollapse && !wanderActive && (
        <button
          className="note-card__toggle"
          aria-expanded={expanded}
          onClick={(event) => { event.stopPropagation(); setExpanded((value) => !value); }}
        >
          {expanded ? <><CaretUp size={13} />收起内容</> : <><CaretDown size={13} />展开全文</>}
        </button>
      )}

      <footer className="note-card__meta mono">
        <span>{formatTime(note.updated_at)}</span>
        <span>{note.word_count} 字</span>
        <span>#{note.id}</span>
      </footer>
    </article>
  );
}
