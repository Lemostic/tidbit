import { CaretDown, LockKey, X } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { client } from "../../ipc/client";
import type { Note } from "../../ipc/types";
import { sanitizeNoteHtml } from "../notes/sanitizeNoteHtml";

/** Where the parent scene wants this note to hang, in scene coordinates. */
export interface HangingNoteLayout {
  /** Horizontal offset of the card's left edge, in scene px. */
  x: number;
  /**
   * Scene y of the point where the clip grips the rope. The card is positioned
   * relative to this so it always droops from the rope itself.
   */
  y: number;
  /** Rotation of the clip, following the rope tangent (degrees). */
  clipAngle: number;
  /** Rotation of the paper, hanging from the clip (degrees). */
  cardAngle: number;
  /** Hover/expand factor for the paper. */
  scale: number;
  zIndex: number;
  active: boolean;
  index: number;
  /** True when this card is currently being dragged. */
  dragging?: boolean;
}

interface HangingNoteProps {
  noteId: number;
  layout: HangingNoteLayout;
  /** Opens the editor for this note (position is decided by the parent). */
  onOpen: (noteId: number) => void;
  /** Removes the note from the clothesline. */
  onRemove: (id: number) => void;
  onPointerEnter: (noteId: number) => void;
  onPointerLeave: (noteId: number) => void;
  /** Pointer-down on the card starts a horizontal drag along the rope. */
  onDragStart?: (event: React.PointerEvent<HTMLElement>, noteId: number) => void;
  onDragMove?: (event: React.PointerEvent<HTMLElement>) => void;
  onDragEnd?: (event: React.PointerEvent<HTMLElement>) => void;
}

const PREVIEW_MAX_CHARS = 240;

function stripPreviewHtml(html: string): string {
  if (typeof window === "undefined") return html;
  const container = window.document.createElement("div");
  container.innerHTML = html;
  return (container.textContent ?? "").replace(/\s+/g, " ").trim();
}

export function HangingNote({
  noteId,
  layout,
  onOpen,
  onRemove,
  onPointerEnter,
  onPointerLeave,
  onDragStart,
  onDragMove,
  onDragEnd,
}: HangingNoteProps) {
  const [note, setNote] = useState<Note | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let disposed = false;
    const refresh = async () => {
      try {
        const next = await client.notes.get(noteId);
        if (!disposed) {
          setNote(next);
          setError(false);
        }
      } catch {
        if (!disposed) setError(true);
      }
    };
    void refresh();
    return () => {
      disposed = true;
    };
  }, [noteId]);

  const previewHtml = useMemo(() => sanitizeNoteHtml(note?.content_html ?? "").slice(0, PREVIEW_MAX_CHARS * 4), [note?.content_html]);
  const previewText = useMemo(() => stripPreviewHtml(previewHtml).slice(0, PREVIEW_MAX_CHARS), [previewHtml]);

  const style = {
    "--x": `${layout.x.toFixed(2)}px`,
    "--y": `${layout.y.toFixed(2)}px`,
    "--clip-tilt": `${layout.clipAngle.toFixed(2)}deg`,
    "--card-tilt": `${layout.cardAngle.toFixed(2)}deg`,
    "--card-scale": layout.scale.toFixed(3),
    "--enter-delay": `${Math.min(layout.index, 8) * 35}ms`,
    zIndex: layout.zIndex,
  } as React.CSSProperties;

  const handleOpen = () => {
    if (note && !note.is_content_hidden) onOpen(note.id);
  };
  const openable = !error && note !== null && !note.is_content_hidden;
  const cardLabel = openable
    ? `打开便签 ${note?.title?.trim() || "无标题"}`
    : note?.is_content_hidden
      ? "隐私便签内容已隐藏"
      : error
        ? "便签加载失败"
        : "便签加载中";
  const cardHandlers = () => ({
    role: openable ? "button" as const : undefined,
    tabIndex: openable ? 0 : undefined,
    "aria-label": cardLabel,
    onClick: (event: React.MouseEvent<HTMLElement>) => {
      if ((event.target as HTMLElement).closest("button")) return;
      if (openable) handleOpen();
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      if ((event.target as HTMLElement).closest("button")) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (openable) handleOpen();
      }
    },
  });

  const hanging = (
    <>
      <span className="hanging-note__clip" aria-hidden="true">
        <span className="hanging-note__clip-ring" />
        <span className="hanging-note__clip-spring" />
      </span>
      <div className="hanging-note__sheet">
        <div className="hanging-note__card" {...cardHandlers()}>
          {error || !note ? (
            <>
              <header className="hanging-note__head">
                <strong className="hanging-note__title">便签 #{noteId}</strong>
                <button
                  type="button"
                  className="hanging-note__close"
                  aria-label="取下便签"
                  title="取下"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => onRemove(noteId)}
                >
                  <X size={12} weight="bold" />
                </button>
              </header>
              <p className="hanging-note__state">{error ? "加载失败" : "加载中"}</p>
            </>
          ) : (
            <>
              <header className="hanging-note__head">
                <strong className="hanging-note__title">{note.is_content_hidden ? "隐私便签" : note.title?.trim() || "无标题"}</strong>
                <button
                  type="button"
                  className="hanging-note__close"
                  aria-label="取下便签"
                  title="取下"
                  onPointerDown={(event) => event.stopPropagation()}
                  onPointerUp={(event) => event.stopPropagation()}
                  onClick={() => onRemove(note.id)}
                >
                  <X size={12} weight="bold" />
                </button>
              </header>
              <div className="hanging-note__body">
                {note.is_content_hidden ? (
                  <p className="hanging-note__private">
                    <LockKey size={14} weight="duotone" /> 该条便签内容已加密
                  </p>
                ) : previewText ? (
                  <p className="hanging-note__excerpt">{previewText}</p>
                ) : (
                  <p className="hanging-note__empty">
                    <CaretDown size={12} /> 暂无正文，点按卡片开始编辑
                  </p>
                )}
              </div>
              <footer className="hanging-note__foot mono">
                <span>{note.word_count} 字</span>
                <span>#{note.id}</span>
              </footer>
            </>
          )}
        </div>
      </div>
    </>
  );

  return (
    <article
      className="hanging-note"
      data-active={layout.active ? "true" : "false"}
      data-dragging={layout.dragging ? "true" : "false"}
      data-index={layout.index}
      data-note-id={noteId}
      style={style}
      title={note?.is_content_hidden ? "拖动调整位置 · 内容已隐藏" : "拖动调整位置 · 点击打开便签"}
      onPointerDown={onDragStart ? (event) => onDragStart(event, noteId) : undefined}
      onPointerMove={onDragMove}
      onPointerUp={onDragEnd}
      onPointerCancel={onDragEnd}
      onPointerEnter={() => onPointerEnter(noteId)}
      onPointerLeave={() => onPointerLeave(noteId)}
    >
      {hanging}
    </article>
  );
}
