import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import { client } from "../../ipc/client";
import type { Note } from "../../ipc/types";
import type { ToastState } from "../../ui/Toast";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { useGroups } from "../groups/useGroups";
import { writeStoredClotheslineIds } from "../clothesline/useClothesline";
import { CompactBoard } from "./CompactBoard";
import { OneNoteWorkspace } from "./OneNoteWorkspace";
import { NoteEditor } from "./NoteEditor";
import { useNotes } from "./useNotes";

interface NotesGridProps {
  groupId: number | null;
  createRequest: number;
  openNoteId: number | null;
  onOpenHandled: () => void;
  onNotice: (toast: ToastState) => void;
  refreshRequest: number;
  oneNoteMode?: boolean;
}

type DropPosition = "before" | "after";

const noteDragType = "application/x-tidbit-note-id";

export function NotesGrid({ groupId, createRequest, openNoteId, onOpenHandled, onNotice, refreshRequest, oneNoteMode = false }: NotesGridProps) {
  const archiveStorageKey = `show-archived:${groupId ?? "all"}`;
  const [showArchived, setShowArchived] = useState(() => localStorage.getItem(archiveStorageKey) === "true");
  const { notes, setNotes, loading, error, create, trash, refresh } = useNotes(groupId, showArchived);
  const { groups } = useGroups();
  const activeGroup = groups.find((group) => group.id === groupId);
  const collectionTitle = activeGroup?.name ?? "全部便签";
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [confirmingNote, setConfirmingNote] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [wanderedIds, setWanderedIds] = useState<Set<number>>(new Set());
  const [hangingIds, setHangingIds] = useState<Set<number>>(new Set());
  const [draggedNoteId, setDraggedNoteId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: number; position: DropPosition } | null>(null);
  const lastCreateRequest = useRef(createRequest);
  const lastRefreshRequest = useRef(refreshRequest);
  const suppressOpen = useRef(false);

  const refreshWandered = useCallback(async () => {
    try { setWanderedIds(new Set(await invoke<number[]>("wander_list"))); }
    catch { setWanderedIds(new Set()); }
  }, []);

  const refreshHanging = useCallback(async () => {
    try {
      const ids = await invoke<number[]>("clothesline_list");
      setHangingIds(new Set(ids));
    } catch { setHangingIds(new Set()); }
  }, []);

  useEffect(() => {
    void refreshWandered();
    void refreshHanging();
    let disposeWander: (() => void) | undefined;
    let disposeClothesline: (() => void) | undefined;
    let disposeUpdated: (() => void) | undefined;
    void listen("tidbit://wander-changed", () => void refreshWandered()).then((dispose) => { disposeWander = dispose; });
    void listen("tidbit://clothesline-changed", () => void refreshHanging()).then((dispose) => { disposeClothesline = dispose; });
    void listen("tidbit://note-updated", () => void refresh()).then((dispose) => { disposeUpdated = dispose; });
    return () => { disposeWander?.(); disposeClothesline?.(); disposeUpdated?.(); };
  }, [refresh, refreshWandered, refreshHanging]);

  useEffect(() => {
    setShowArchived(localStorage.getItem(archiveStorageKey) === "true");
  }, [archiveStorageKey]);

  useEffect(() => {
    if (refreshRequest === lastRefreshRequest.current) return;
    lastRefreshRequest.current = refreshRequest;
    void refresh();
  }, [refresh, refreshRequest]);

  const endDrag = () => {
    setDraggedNoteId(null);
    setDropTarget(null);
    window.setTimeout(() => { suppressOpen.current = false; }, 0);
  };

  const reorderNotes = async (targetId: number, position: DropPosition) => {
    if (draggedNoteId === null || draggedNoteId === targetId) return;
    const previous = notes;
    const dragged = notes.find((note) => note.id === draggedNoteId);
    if (!dragged) return;
    const next = notes.filter((note) => note.id !== draggedNoteId);
    const targetIndex = next.findIndex((note) => note.id === targetId);
    next.splice(targetIndex + (position === "after" ? 1 : 0), 0, dragged);
    setNotes(next);
    try {
      await client.notes.reorder(next.map((note) => note.id));
      onNotice({ kind: "success", message: "便签顺序已调整" });
    } catch {
      setNotes(previous);
      onNotice({ kind: "error", message: "便签排序失败" });
    } finally {
      endDrag();
    }
  };

  const toggleArchivedVisibility = (checked: boolean) => {
    setShowArchived(checked);
    localStorage.setItem(archiveStorageKey, String(checked));
  };

  const createNote = async () => {
    try {
      const note = await create("新便签");
      setEditingNote(note);
    } catch {
      onNotice({ kind: "error", message: "新建便签失败" });
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
        if (active.includes(openNoteId)) onNotice({ kind: "info", message: "云游中的便签请在桌面卡片中编辑" });
        else if (note.is_content_hidden) onNotice({ kind: "info", message: "内容已隐藏，请先显示后再打开" });
        else setEditingNote(note);
      })
      .catch(() => onNotice({ kind: "error", message: "无法打开这条便签" }))
      .finally(onOpenHandled);
  }, [openNoteId, onOpenHandled, onNotice]);

  const trashNote = async (id: number) => {
    setDeleting(true);
    try {
      await trash(id);
      setEditingNote((current) => current?.id === id ? null : current);
      onNotice({ kind: "success", message: "便签已移到回收站" });
    } catch {
      onNotice({ kind: "error", message: "删除失败" });
    } finally { setDeleting(false); }
  };

  const wanderNote = async (note: Note) => {
    if (hangingIds.has(note.id)) {
      onNotice({ kind: "info", message: "请先把便签从晾衣绳上取下" });
      return;
    }
    try {
      const opacity = Number(localStorage.getItem("wander-opacity") ?? "88");
      await invoke("wander_open", { noteId: note.id, opacity });
      setEditingNote((current) => current?.id === note.id ? null : current);
      await refreshWandered();
      onNotice({ kind: "success", message: "便签已在桌面云游" });
    } catch {
      onNotice({ kind: "error", message: "云游便签打开失败" });
    }
  };

  const hangNote = async (note: Note) => {
    if (wanderedIds.has(note.id)) {
      onNotice({ kind: "info", message: "请先关闭云游便签" });
      return;
    }
    try {
      const ids = await invoke<number[]>("clothesline_list");
      const next = hangingIds.has(note.id)
        ? ids.filter((value) => value !== note.id)
        : [...ids, note.id];
      await invoke("clothesline_set_notes", { noteIds: next });
      // Keep the same durable snapshot the clothesline window uses so opening
      // the board later cannot overwrite a newer list with stale storage.
      writeStoredClotheslineIds(next);
      await refreshHanging();
      onNotice({ kind: "success", message: hangingIds.has(note.id) ? "便签已从晾衣绳取下" : "便签已挂到晾衣绳" });
    } catch {
      onNotice({ kind: "error", message: "晾衣绳操作失败" });
    }
  };

  const openNote = (note: Note) => {
    if (suppressOpen.current || wanderedIds.has(note.id) || note.is_content_hidden) return;
    setEditingNote(note);
  };

  const toggleVisibility = (note: Note) => {
    void client.notes.setContentHidden(note.id, !note.is_content_hidden)
      .then((updated) => {
        setNotes((current) => current.map((item) => item.id === updated.id ? updated : item));
        if (updated.is_content_hidden) {
          setEditingNote((current) => current?.id === updated.id ? null : current);
        }
      })
      .catch(() => onNotice({ kind: "error", message: "内容显示状态更新失败" }));
  };

  const togglePin = (note: Note) => {
    void client.notes.setPinned(note.id, !note.is_pinned)
      .then(refresh)
      .catch(() => onNotice({ kind: "error", message: "置顶操作失败" }));
  };

  const toggleArchive = (note: Note) => {
    void client.notes.setArchived(note.id, !note.is_archived)
      .then(refresh)
      .then(() => onNotice({ kind: "success", message: note.is_archived ? "便签已取消归档" : "便签已归档" }))
      .catch(() => onNotice({ kind: "error", message: "归档操作失败" }));
  };

  const startNoteDrag = (note: Note, event: React.DragEvent<HTMLElement>) => {
    if (wanderedIds.has(note.id)) {
      event.preventDefault();
      return;
    }
    suppressOpen.current = true;
    setDraggedNoteId(note.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(noteDragType, String(note.id));
    event.dataTransfer.setData("text/plain", String(note.id));
  };

  const dragOverNote = (noteId: number, event: React.DragEvent<HTMLElement>) => {
    if (draggedNoteId === null || draggedNoteId === noteId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const bounds = event.currentTarget.getBoundingClientRect();
    setDropTarget({ id: noteId, position: event.clientY < bounds.top + bounds.height / 2 ? "before" : "after" });
  };

  const dragLeaveNote = (event: React.DragEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null);
  };

  const dropNote = (noteId: number, event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    const position = dropTarget?.id === noteId ? dropTarget.position : "after";
    void reorderNotes(noteId, position);
  };

  return (
    <>
      {editingNote && !oneNoteMode && (
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
        title="删除这条便签？"
        description={
          confirmingNote?.is_content_hidden
            ? "这条隐私便签将被移到回收站，可以稍后恢复。"
            : `「${confirmingNote?.title?.trim() || "无标题"}」将被移到回收站，可以稍后恢复。`
        }
        confirmAriaLabel="确认删除便签"
        busy={deleting}
        onCancel={() => setConfirmingNote(null)}
        onConfirm={async () => {
          if (!confirmingNote) return;
          await trashNote(confirmingNote.id);
          setConfirmingNote(null);
        }}
      />
      {oneNoteMode ? (
        <OneNoteWorkspace
          notes={notes}
          collectionTitle={collectionTitle}
          loading={loading}
          error={error}
          showArchived={showArchived}
          selectedId={editingNote?.id ?? null}
          wanderedIds={wanderedIds}
          hangingIds={hangingIds}
          draggedNoteId={draggedNoteId}
          dropTarget={dropTarget}
          pane={
            editingNote ? (
              <NoteEditor
                key={editingNote.id}
                note={editingNote}
                groups={groups}
                onClose={() => setEditingNote(null)}
                onChanged={refresh}
                onTrash={trashNote}
                pane
              />
            ) : undefined
          }
          onToggleArchived={toggleArchivedVisibility}
          onCreate={() => void createNote()}
          onRefresh={() => void refresh()}
          onOpen={openNote}
          onTogglePin={togglePin}
          onToggleVisibility={toggleVisibility}
          onToggleArchive={toggleArchive}
          onWander={(note) => void wanderNote(note)}
          onHang={(note) => void hangNote(note)}
          onTrash={(note) => setConfirmingNote(note)}
          onDragStart={startNoteDrag}
          onDragOver={dragOverNote}
          onDragLeave={dragLeaveNote}
          onDrop={dropNote}
          onDragEnd={endDrag}
        />
      ) : (
        <CompactBoard
          notes={notes}
          collectionTitle={collectionTitle}
          loading={loading}
          error={error}
          showArchived={showArchived}
          wanderedIds={wanderedIds}
          hangingIds={hangingIds}
          draggedNoteId={draggedNoteId}
          dropTarget={dropTarget}
          onToggleArchived={toggleArchivedVisibility}
          onCreate={() => void createNote()}
          onRefresh={() => void refresh()}
          onOpen={openNote}
          onTogglePin={togglePin}
          onToggleVisibility={toggleVisibility}
          onToggleArchive={toggleArchive}
          onWander={(note) => void wanderNote(note)}
          onHang={(note) => void hangNote(note)}
          onTrash={(note) => setConfirmingNote(note)}
          onDragStart={startNoteDrag}
          onDragOver={dragOverNote}
          onDragLeave={dragLeaveNote}
          onDrop={dropNote}
          onDragEnd={endDrag}
        />
      )}
    </>
  );
}
