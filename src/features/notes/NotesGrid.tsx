import { Archive, ArrowClockwise, NotePencil, Plus, WarningCircle } from "@phosphor-icons/react";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
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
import { toggleTaskContent } from "./taskList";
import { useNotes } from "./useNotes";

interface NotesGridProps {
  groupId: number | null;
  createRequest: number;
  openNoteId: number | null;
  onOpenHandled: () => void;
  onNotice: (toast: ToastState) => void;
  refreshRequest: number;
}

export function NotesGrid({ groupId, createRequest, openNoteId, onOpenHandled, onNotice, refreshRequest }: NotesGridProps) {
  const archiveStorageKey = `show-archived:${groupId ?? "all"}`;
  const [showArchived, setShowArchived] = useState(() => localStorage.getItem(archiveStorageKey) === "true");
  const [sortPreference, setSortPreference] = useState(loadNoteSortPreference);
  const { notes, setNotes, loading, error, create, trash, refresh } = useNotes(groupId, showArchived);
  const sortedNotes = useMemo(() => sortNotes(notes, sortPreference), [notes, sortPreference]);
  const { groups } = useGroups();
  const activeGroupName = groupId === null ? "所有便签" : groups.find((group) => group.id === groupId)?.name ?? "便签";
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [confirmingNote, setConfirmingNote] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [wanderedIds, setWanderedIds] = useState<Set<number>>(new Set());
  const lastCreateRequest = useRef(createRequest);
  const lastRefreshRequest = useRef(refreshRequest);

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
        else setEditingNote(note);
      })
      .catch(() => onNotice({ kind: "error", message: "无法打开这条便签" }))
      .finally(onOpenHandled);
  }, [openNoteId, onOpenHandled, onNotice]);

  const trashNote = async (id: number) => {
    setDeleting(true);
    try {
      await trash(id);
      onNotice({ kind: "success", message: "便签已移到回收站" });
    } catch {
      onNotice({ kind: "error", message: "删除失败" });
    } finally { setDeleting(false); }
  };

  const wanderNote = async (note: Note) => {
    try {
      const opacity = Number(localStorage.getItem("wander-opacity") ?? "88");
      await invoke("wander_open", { noteId: note.id, opacity });
      await refreshWandered();
      onNotice({ kind: "success", message: "便签已在桌面云游" });
    } catch {
      onNotice({ kind: "error", message: "云游便签打开失败" });
    }
  };

  const changeSort = (preference: NoteSortPreference) => {
    setSortPreference(preference);
    saveNoteSortPreference(preference);
  };

  const toggleTask = async (note: Note, taskIndex: number, checked: boolean) => {
    const update = toggleTaskContent(note.content_md, note.content_html, taskIndex, checked);
    if (!update) return;
    const optimistic = { ...note, content_md: update.markdown, content_html: update.html, word_count: update.words };
    setNotes((current) => current.map((item) => item.id === note.id ? optimistic : item));
    try {
      const updated = await client.notes.updateContent(note.id, update.markdown, update.html, update.words);
      setNotes((current) => current.map((item) => item.id === updated.id ? updated : item));
      await emit("tidbit://note-updated", { id: updated.id });
    } catch (error) {
      setNotes((current) => current.map((item) => item.id === note.id ? note : item));
      onNotice({ kind: "error", message: "待办状态保存失败" });
      throw error;
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
        title="删除这条便签？"
        description={`「${confirmingNote?.title?.trim() || "无标题"}」将被移到回收站，可以稍后恢复。`}
        confirmAriaLabel="确认删除便签"
        busy={deleting}
        onCancel={() => setConfirmingNote(null)}
        onConfirm={async () => {
          if (!confirmingNote) return;
          await trashNote(confirmingNote.id);
          setConfirmingNote(null);
        }}
      />
      <section className="notes">
        <header className="notes__head">
          <div className="notes__heading">
            <span className="notes__eyebrow">MY NOTES</span>
            <div className="notes__title-row">
              <h1 className="notes__title">{activeGroupName}</h1>
              <span className="notes__count mono">{notes.length}</span>
            </div>
          </div>
          <div className="notes__head-actions">
            <div className="notes__archive-toggle" title="显示归档便签">
              <Archive size={13} />
              <span>显示归档</span>
              <input type="checkbox" className="switch" checked={showArchived} onChange={(event) => toggleArchivedVisibility(event.target.checked)} />
            </div>
            <button className="btn btn-primary" onClick={() => void createNote()}><Plus size={15} weight="bold" />新建</button>
          </div>
        </header>

        <NoteSortControl preference={sortPreference} onChange={changeSort} />

        {loading ? (
          <div className="notes__body"><div className="note-skeleton"><span /><span /><span /></div></div>
        ) : error ? (
          <div className="notes__empty">
            <WarningCircle size={28} />
            <div><p className="notes__empty-title">便签加载失败</p><p>{error}</p></div>
            <button className="btn" onClick={() => void refresh()}><ArrowClockwise size={15} />重试</button>
          </div>
        ) : notes.length === 0 ? (
          <div className="notes__empty">
            <div className="notes__empty-glyph"><NotePencil size={23} weight="duotone" /></div>
            <div><p className="notes__empty-title">这里还没有便签</p><p>新建一条，随手记下今天的事项。</p></div>
            <button className="btn btn-primary" onClick={() => void createNote()}><Plus size={15} />新建便签</button>
          </div>
        ) : (
          <div className="notes__body">
            <div className="notes__list">
              {sortedNotes.map((note, index) => {
                const wanderActive = wanderedIds.has(note.id);
                return (
                <div
                  key={note.id}
                  className="note-card"
                  style={{ "--i": index, "--card-accent": note.color ?? "var(--accent)" } as React.CSSProperties}
                >
                  <NoteCard
                    note={note}
                    wanderActive={wanderActive}
                    onOpen={() => setEditingNote(note)}
                    onToggleVisibility={() => void client.notes.setContentHidden(note.id, !note.is_content_hidden).then((updated) => setNotes((current) => current.map((item) => item.id === updated.id ? updated : item))).catch(() => onNotice({ kind: "error", message: "内容显示状态更新失败" }))}
                    onTogglePin={() => void client.notes.setPinned(note.id, !note.is_pinned).then(refresh).catch(() => onNotice({ kind: "error", message: "置顶操作失败" }))}
                    onToggleArchive={() => void client.notes.setArchived(note.id, !note.is_archived).then(refresh).then(() => onNotice({ kind: "success", message: note.is_archived ? "便签已取消归档" : "便签已归档" })).catch(() => onNotice({ kind: "error", message: "归档操作失败" }))}
                    onWander={() => void wanderNote(note)}
                    onTrash={() => setConfirmingNote(note)}
                    onToggleTask={(taskIndex, checked) => toggleTask(note, taskIndex, checked)}
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
