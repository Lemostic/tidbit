import { Archive, CaretDown, CaretUp, Check, Cloud, Copy, DotsSixVertical, Eye, EyeSlash, LockKey, PushPin, Trash } from "@phosphor-icons/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Note } from "../../ipc/types";
import { copyText } from "../../ui/clipboard";
import { formatNoteForCopy, loadNoteCopyFormat } from "../../ui/noteCopy";
import { useI18n } from "../../i18n";
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
  dragEnabled?: boolean;
  onDragHandlePointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}

const collapsedHeight = 220;

function formatTime(timestamp: number, locale: string) {
  const date = new Date(timestamp);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString(locale, { month: "2-digit", day: "2-digit" });
}

export function NoteCard({ note, onOpen, onTogglePin, onToggleVisibility, onToggleArchive, onWander, onTrash, wanderActive = false, dragEnabled = false, onDragHandlePointerDown }: NoteCardProps) {
  const { locale, t } = useI18n();
  const contentRef = useRef<HTMLDivElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [canCollapse, setCanCollapse] = useState(false);
  const [copied, setCopied] = useState(false);
  const renderedHtml = useMemo(() => sanitizeNoteHtml(note.content_html), [note.content_html]);
  const copyFormat = loadNoteCopyFormat();

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

  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

  const copyContent = async () => {
    try {
      await copyText(formatNoteForCopy(note.content_md, renderedHtml, loadNoteCopyFormat()));
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <article className={`note-card__inner${note.is_content_hidden ? " is-content-hidden" : ""}${wanderActive ? " is-wandering" : ""}`} onClick={note.is_content_hidden || wanderActive ? undefined : onOpen}>
      <header className="note-card__head">
        {dragEnabled && (
          <button
            type="button"
            className="note-card__drag-handle"
            aria-label={t("notes.drag")}
            title={t("notes.dragHint")}
            onPointerDown={onDragHandlePointerDown}
            onClick={(event) => event.stopPropagation()}
          >
            <DotsSixVertical size={15} weight="bold" />
          </button>
        )}
        <p className="note-card__title">{note.title?.trim() || t("notes.untitled")}</p>
        {note.is_archived && <span className="note-card__archived">{t("notes.archived")}</span>}
        {wanderActive && <span className="note-card__wandering">{t("notes.wandering")}</span>}
        <div className="note-card__actions">
          <button
            className={`note-action${copied ? " is-success" : ""}`}
            aria-label={copied ? t("notes.copied") : t("notes.copy")}
            title={note.is_content_hidden ? t("notes.copyHidden") : copied ? t(copyFormat === "markdown" ? "notes.copiedMarkdown" : "notes.copiedPlain") : t(copyFormat === "markdown" ? "notes.copyMarkdown" : "notes.copyPlain")}
            disabled={note.is_content_hidden}
            onClick={(event) => { event.stopPropagation(); void copyContent(); }}
          >{copied ? <Check size={14} weight="bold" /> : <Copy size={14} />}</button>
          <button
            className="note-action"
            aria-label={t("notes.wander")}
            title={t("notes.wanderHint")}
            disabled={wanderActive}
            onClick={(event) => { event.stopPropagation(); onWander(); }}
          ><Cloud size={14} weight="duotone" /></button>
          <button
            className={`note-action${note.is_content_hidden ? " is-active" : ""}`}
            aria-label={note.is_content_hidden ? t("notes.show") : t("notes.hide")}
            title={t(note.is_content_hidden ? "notes.showHint" : "notes.hideHint")}
            disabled={wanderActive}
            onClick={(event) => { event.stopPropagation(); onToggleVisibility(); }}
          >{note.is_content_hidden ? <EyeSlash size={14} weight="fill" /> : <Eye size={14} />}</button>
          <button
            className={`note-action${note.is_pinned ? " is-active" : ""}`}
            aria-label={note.is_pinned ? t("notes.unpin") : t("notes.pin")}
            title={t(note.is_pinned ? "notes.unpin" : "notes.pin")}
            onClick={(event) => { event.stopPropagation(); onTogglePin(); }}
          ><PushPin size={14} weight={note.is_pinned ? "fill" : "regular"} /></button>
          <button
            className={`note-action${note.is_archived ? " is-active" : ""}`}
            aria-label={note.is_archived ? t("notes.unarchive") : t("notes.archive")}
            title={t(note.is_archived ? "notes.unarchive" : "notes.archiveHint")}
            disabled={wanderActive}
            onClick={(event) => { event.stopPropagation(); onToggleArchive(); }}
          ><Archive size={14} weight={note.is_archived ? "fill" : "regular"} /></button>
          <button
            className="note-action is-danger"
            aria-label={t("notes.trash")}
            title={t("notes.trashHint")}
            disabled={wanderActive}
            onClick={(event) => { event.stopPropagation(); onTrash(); }}
          ><Trash size={14} /></button>
        </div>
      </header>

      {note.is_content_hidden ? (
        <div className="note-card__encrypted"><LockKey size={17} weight="duotone" /><span>{t("notes.encrypted")}</span></div>
      ) : renderedHtml ? (
        <div
          ref={contentRef}
          className={`note-card__content markdown-body${expanded ? " is-expanded" : ""}`}
          style={canCollapse && !expanded ? { maxHeight: collapsedHeight } : undefined}
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      ) : (
        <p className="note-card__placeholder">{t("notes.emptyContent")}</p>
      )}

      {!note.is_content_hidden && canCollapse && !wanderActive && (
        <button
          className="note-card__toggle"
          aria-expanded={expanded}
          onClick={(event) => { event.stopPropagation(); setExpanded((value) => !value); }}
        >
          {expanded ? <><CaretUp size={13} />{t("notes.collapse")}</> : <><CaretDown size={13} />{t("notes.expand")}</>}
        </button>
      )}

      <footer className="note-card__meta mono">
        <span>{formatTime(note.updated_at, locale)}</span>
        <span>{t("notes.words", { count: note.word_count })}</span>
        <span>#{note.id}</span>
      </footer>
    </article>
  );
}
