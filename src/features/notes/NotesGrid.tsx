import { Archive, ArrowClockwise, NotePencil, Plus, WarningCircle } from "@phosphor-icons/react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useMemo, useRef, useState } from "react";
import { client } from "../../ipc/client";
import type { Note } from "../../ipc/types";
import type { ToastState } from "../../ui/Toast";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { useGroups } from "../groups/useGroups";
import { NoteCard } from "./NoteCard";
import { NoteEditor } from "./NoteEditor";
import { NoteSortControl } from "./NoteSortControl";
import { loadNoteSortPreference, saveNoteSortPreference, sortNotes, type NoteSortPreference } from "./noteSort";
import { useNotes } from "./useNotes";
import { useI18n } from "../../i18n";

interface NotesGridProps {
  groupId: number | null;
  createRequest: number;
  openNoteId: number | null;
  onOpenHandled: () => void;
  onNotice: (toast: ToastState) => void;
  refreshRequest: number;
}

type DropPosition = "before" | "after";

export function NotesGrid({ groupId, createRequest, openNoteId, onOpenHandled, onNotice, refreshRequest }: NotesGridProps) {
  const { locale, t } = useI18n();
  const archiveStorageKey = `show-archived:${groupId ?? "all"}`;
  const [showArchived, setShowArchived] = useState(() => localStorage.getItem(archiveStorageKey) === "true");
  const [sortPreference, setSortPreference] = useState(loadNoteSortPreference);
  const { notes, setNotes, loading, error, create, trash, refresh } = useNotes(groupId, showArchived);
  const sortedNotes = useMemo(() => sortNotes(notes, sortPreference), [notes, sortPreference]);
  const manualSorting = sortPreference.field === "manual";
  const { groups } = useGroups();
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [confirmingNote, setConfirmingNote] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [wanderedIds, setWanderedIds] = useState<Set<number>>(new Set());
  const [draggedNoteId, setDraggedNoteId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: number; position: DropPosition } | null>(null);
  const lastCreateRequest = useRef(createRequest);
  const lastRefreshRequest = useRef(refreshRequest);
  const suppressOpen = useRef(false);
  const pointerDragRef = useRef<{ noteId: number; pointerId: number } | null>(null);
  const dropTargetRef = useRef<{ id: number; position: DropPosition } | null>(null);

  const refreshWandered = async () => {
    try { setWanderedIds(new Set(await invoke<number[]>("wander_list"))); }
    catch { setWanderedIds(new Set()); }
  };

  useEffect(() => {
    void refreshWandered();
    let disposeWander: (() => void) | undefined;
    let disposeUpdated: (() => void) | undefined;
    void listen("tidbit://wander-changed", () => void refreshWandered()).then((dispose) => { disposeWander = dispose; });
    void listen("tidbit://note-updated", () => void refresh()).then((dispose) => { disposeUpdated = dispose; });
    return () => { disposeWander?.(); disposeUpdated?.(); };
  }, [refresh]);

  useEffect(() => {
    setShowArchived(localStorage.getItem(archiveStorageKey) === "true");
  }, [archiveStorageKey]);

  useEffect(() => {
    if (refreshRequest === lastRefreshRequest.current) return;
    lastRefreshRequest.current = refreshRequest;
    void refresh();
  }, [refresh, refreshRequest]);

  const endDrag = () => {
    pointerDragRef.current = null;
    dropTargetRef.current = null;
    setDraggedNoteId(null);
    setDropTarget(null);
    window.setTimeout(() => { suppressOpen.current = false; }, 0);
  };

  const reorderNotes = async (sourceId: number, targetId: number, position: DropPosition) => {
    if (!manualSorting || sourceId === targetId) return;
    const previous = notes;
    const dragged = sortedNotes.find((note) => note.id === sourceId);
    if (!dragged) return;
    const next = sortedNotes.filter((note) => note.id !== sourceId);
    const targetIndex = next.findIndex((note) => note.id === targetId);
    next.splice(targetIndex + (position === "after" ? 1 : 0), 0, dragged);
    setNotes(next);
    try {
      await client.notes.reorder(next.map((note) => note.id));
      onNotice({ kind: "success", message: t("notice.orderUpdated") });
    } catch {
      setNotes(previous);
      onNotice({ kind: "error", message: t("notice.orderFailed") });
    } finally {
      endDrag();
    }
  };

  const beginPointerDrag = (noteId: number, event: React.PointerEvent<HTMLButtonElement>) => {
    if (!manualSorting || wanderedIds.has(noteId)) return;
    event.preventDefault();
    event.stopPropagation();
    suppressOpen.current = true;
    pointerDragRef.current = { noteId, pointerId: event.pointerId };
    dropTargetRef.current = null;
    setDraggedNoteId(noteId);
    setDropTarget(null);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const updatePointerDrag = (event: React.PointerEvent<HTMLElement>) => {
    const active = pointerDragRef.current;
    if (!active || event.pointerId !== active.pointerId) return;
    event.preventDefault();
    const pointedElement = document.elementFromPoint?.(event.clientX, event.clientY) ?? event.target as Element;
    const targetCard = pointedElement.closest<HTMLElement>(".note-card[data-note-id]");
    const targetId = Number(targetCard?.dataset.noteId);
    if (!targetCard || !Number.isFinite(targetId) || targetId === active.noteId) {
      dropTargetRef.current = null;
      setDropTarget(null);
      return;
    }
    const bounds = targetCard.getBoundingClientRect();
    const nextTarget = { id: targetId, position: event.clientY < bounds.top + bounds.height / 2 ? "before" : "after" } as const;
    dropTargetRef.current = nextTarget;
    setDropTarget((current) => current?.id === nextTarget.id && current.position === nextTarget.position ? current : nextTarget);
  };

  const finishPointerDrag = (event: React.PointerEvent<HTMLElement>) => {
    const active = pointerDragRef.current;
    if (!active || event.pointerId !== active.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const target = dropTargetRef.current;
    pointerDragRef.current = null;
    if (target) void reorderNotes(active.noteId, target.id, target.position);
    else endDrag();
  };

  const changeSort = (preference: NoteSortPreference) => {
    setSortPreference(preference);
    saveNoteSortPreference(preference);
    pointerDragRef.current = null;
    dropTargetRef.current = null;
    setDraggedNoteId(null);
    setDropTarget(null);
  };

  const toggleArchivedVisibility = (checked: boolean) => {
    setShowArchived(checked);
    localStorage.setItem(archiveStorageKey, String(checked));
  };

  const createNote = async () => {
    try {
      const note = await create(t("notes.newNote"));
      setEditingNote(note);
    } catch {
      onNotice({ kind: "error", message: t("notice.noteCreateFailed") });
    }
  };

  useEffect(() => {
    if (createRequest === lastCreateRequest.current) return;
    lastCreateRequest.current = createRequest;
    void createNote();
  }, [createRequest]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (openNoteId === null) return;
    Promise.all([client.notes.get(openNoteId), invoke<number[]>("wander_list")])
      .then(([note, active]) => {
        if (active.includes(openNoteId)) onNotice({ kind: "info", message: t("notice.wanderEditHint") });
        else setEditingNote(note);
      })
      .catch(() => onNotice({ kind: "error", message: t("notice.noteOpenFailed") }))
      .finally(onOpenHandled);
  }, [openNoteId, onOpenHandled, onNotice]);

  const trashNote = async (id: number) => {
    setDeleting(true);
    try {
      await trash(id);
      onNotice({ kind: "success", message: t("notice.noteTrashed") });
    } catch {
      onNotice({ kind: "error", message: t("notice.noteTrashFailed") });
    } finally { setDeleting(false); }
  };

  const wanderNote = async (note: Note) => {
    try {
      const opacity = Number(localStorage.getItem("wander-opacity") ?? "94");
      await invoke("wander_open", { noteId: note.id, opacity, locale });
      await refreshWandered();
      onNotice({ kind: "success", message: t("notice.wanderOpened") });
    } catch {
      onNotice({ kind: "error", message: t("notice.wanderOpenFailed") });
    }
  };

  return (
    <>
      {editingNote && (
        <NoteEditor
          note={editingNote}
          groups={groups}
          onClose={() => setEditingNote(null)}
          onChanged={refresh}
          onTrash={trashNote}
        />
      )}
      <ConfirmDialog
        open={Boolean(confirmingNote)}
        title={t("notes.deleteTitle")}
        description={t("notes.deleteDescription", { title: confirmingNote?.title?.trim() || t("notes.untitled") })}
        confirmAriaLabel={t("notes.confirmDelete")}
        busy={deleting}
        onCancel={() => setConfirmingNote(null)}
        onConfirm={async () => {
          if (!confirmingNote) return;
          await trashNote(confirmingNote.id);
          setConfirmingNote(null);
        }}
      />
      <section className="notes" onPointerMove={updatePointerDrag} onPointerUp={finishPointerDrag} onPointerCancel={endDrag}>
        <header className="notes__head">
          <span className="notes__count mono">{t("notes.count", { count: notes.length })}</span>
          <div className="notes__head-actions">
            <div className="notes__archive-toggle" title={t("notes.showArchived")}>
              <Archive size={13} />
              <span>{t("notes.showArchived")}</span>
              <input type="checkbox" className="switch" checked={showArchived} onChange={(event) => toggleArchivedVisibility(event.target.checked)} />
            </div>
            <button className="btn btn-primary" onClick={() => void createNote()}><Plus size={15} weight="bold" />{t("notes.new")}</button>
          </div>
        </header>

        <NoteSortControl preference={sortPreference} onChange={changeSort} />

        {loading ? (
          <div className="notes__body"><div className="note-skeleton"><span /><span /><span /></div></div>
        ) : error ? (
          <div className="notes__empty">
            <WarningCircle size={28} />
            <div><p className="notes__empty-title">{t("notes.loadingError")}</p><p>{error}</p></div>
            <button className="btn" onClick={() => void refresh()}><ArrowClockwise size={15} />{t("common.retry")}</button>
          </div>
        ) : notes.length === 0 ? (
          <div className="notes__empty">
            <div className="notes__empty-glyph"><NotePencil size={23} weight="duotone" /></div>
            <div><p className="notes__empty-title">{t("notes.emptyTitle")}</p><p>{t("notes.emptyDescription")}</p></div>
            <button className="btn btn-primary" onClick={() => void createNote()}><Plus size={15} />{t("notes.newNote")}</button>
          </div>
        ) : (
          <div className="notes__body">
            <div className="notes__list">
              {sortedNotes.map((note, index) => {
                const wanderActive = wanderedIds.has(note.id);
                return (
                <div
                  key={note.id}
                  data-note-id={note.id}
                  className={`note-card${manualSorting && !wanderActive ? " is-sortable" : ""}${draggedNoteId === note.id ? " is-dragging" : ""}${dropTarget?.id === note.id ? ` is-drop-${dropTarget.position}` : ""}`}
                  style={{ "--i": index, "--card-accent": note.color ?? "var(--accent)" } as React.CSSProperties}
                  aria-grabbed={draggedNoteId === note.id}
                >
                  <NoteCard
                    note={note}
                    wanderActive={wanderActive}
                    dragEnabled={manualSorting && !wanderActive}
                    onDragHandlePointerDown={(event) => beginPointerDrag(note.id, event)}
                    onOpen={() => { if (!suppressOpen.current) setEditingNote(note); }}
                    onToggleVisibility={() => void client.notes.setContentHidden(note.id, !note.is_content_hidden).then((updated) => setNotes((current) => current.map((item) => item.id === updated.id ? updated : item))).catch(() => onNotice({ kind: "error", message: t("notice.visibilityFailed") }))}
                    onTogglePin={() => void client.notes.setPinned(note.id, !note.is_pinned).then(refresh).catch(() => onNotice({ kind: "error", message: t("notice.pinFailed") }))}
                    onToggleArchive={() => void client.notes.setArchived(note.id, !note.is_archived).then(refresh).then(() => onNotice({ kind: "success", message: t(note.is_archived ? "notice.unarchived" : "notice.archived") })).catch(() => onNotice({ kind: "error", message: t("notice.archiveFailed") }))}
                    onWander={() => void wanderNote(note)}
                    onTrash={() => setConfirmingNote(note)}
                  />
                </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
