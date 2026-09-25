import "./MaximizedNotesLayout.css";
import { Plus } from "@phosphor-icons/react";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Note } from "../../ipc/types";
import type { ToastState } from "../../ui/Toast";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { client } from "../../ipc/client";
import { NavColumn } from "./NavColumn";
import { NoteEditorPane } from "./NoteEditorPane";
import { NoteListRow } from "./NoteListRow";
import { NoteTabs, type NoteTab } from "./NoteTabs";
import { TrashView } from "./TrashView";
import { useGroups } from "../groups/useGroups";

/** A freshly-created note is "empty" until the user has typed something into
 *  the title or the body. We treat it as such when the title is still the
 *  default "新便签" and content_md is blank (after trim). */
const DEFAULT_NEW_TITLE = "新便签";
function isEmptyNewNote(note: Note): boolean {
  return (note.title ?? "").trim() === DEFAULT_NEW_TITLE && note.content_md.trim() === "";
}

interface MaximizedNotesLayoutProps {
  groupId: number | null;
  createNoteRequest: number;
  createGroupRequest: number;
  openNoteId: number | null;
  onOpenHandled: () => void;
  onNotice: (toast: ToastState) => void;
  notesRefreshRequest: number;
  view: "notes" | "trash";
  onShowTrash: () => void;
  onSelectGroup: (id: number | null) => void;
  onTrashNote: (id: number) => Promise<void>;
  onTrashChanged: () => void;
}

/**
 * True OneNote-style 3-pane layout used when the main window is wide / maximized.
 *   col 1: NavColumn   (groups + trash, INSIDE the main content)
   col 2: NoteListRow  (compact one-row-per-note list, no cards)
   col 3: EditorPane  (multi-tab editor; never a modal popup)
 */
export function MaximizedNotesLayout(props: MaximizedNotesLayoutProps) {
  const {
    groupId,
    createNoteRequest,
    createGroupRequest,
    openNoteId,
    onOpenHandled,
    onNotice,
    notesRefreshRequest,
    view,
    onShowTrash,
    onSelectGroup,
    onTrashNote,
    onTrashChanged,
  } = props;

const { groups } = useGroups();
  const [tabs, setTabs] = useState<Note[]>([]);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [pendingTrash, setPendingTrash] = useState<Note | null>(null);
  const [trashing, setTrashing] = useState(false);
  /** Ids of freshly-created notes that the user has not edited yet. These are
   *  candidates to be silently dropped when the user leaves the current list
   *  (or closes the tab). Once the user types into the title or body the id
   *  is removed via handleTabChanged. */
  const [emptyNoteIds, setEmptyNoteIds] = useState<Set<number>>(() => new Set());
  /** Mirror of `emptyNoteIds` so effects and event handlers can read the
   *  latest set without re-subscribing on every change. */
  const emptyNoteIdsRef = useRef<Set<number>>(new Set());
  useEffect(() => { emptyNoteIdsRef.current = emptyNoteIds; }, [emptyNoteIds]);
  



  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? null,
    [tabs, activeTabId],
  );

  // Load the page list for the selected group.
  useEffect(() => {
    if (view === "trash") return;
    let cancelled = false;
    setNotesLoading(true);
    setListError(null);
    client.notes.list(groupId).then((list) => {
      if (cancelled) return;
      setNotes(list);
      setNotesLoading(false);
    }).catch((error: unknown) => {
      if (cancelled) return;
      const msg = error instanceof Error ? error.message : String(error);
      setListError(msg);
      setNotesLoading(false);
    });
    return () => { cancelled = true; };
  }, [groupId, notesRefreshRequest, view]);

  const handleSelectNote = useCallback((note: Note) => {
    setTabs((current) => current.some((t) => t.id === note.id) ? current : [...current, note]);
    setActiveTabId(note.id);
  }, []);

const handleCreateNew = useCallback(async () => {
    try {
      const note = await client.notes.create(groupId, DEFAULT_NEW_TITLE);
      handleSelectNote(note);
      setNotes((current) => [note, ...current]);
      setEmptyNoteIds((prev) => {
        if (prev.has(note.id)) return prev;
        const next = new Set(prev);
        next.add(note.id);
        return next;
      });
      onNotice({ kind: "success", message: "已新建便签" });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      onNotice({ kind: "error", message: "新建便签失败：" + msg });
    }
  }, [groupId, handleSelectNote, onNotice]);

  // Listen for createNoteRequest from Ctrl+N or palette.
  useEffect(() => {
    if (createNoteRequest === 0) return;
    void handleCreateNew();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createNoteRequest]);

  

  // Listen for external openNoteId (Ctrl+K -> "打开便签").
  useEffect(() => {
    if (openNoteId === null) return;
    void (async () => {
      try {
        const note = await client.notes.get(openNoteId);
        handleSelectNote(note);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        onNotice({ kind: "error", message: "加载便签失败：" + msg });
      }
    })();
    onOpenHandled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNoteId]);

  // When in trash view, clear the tabs to avoid stale references.
  useEffect(() => {
    if (view === "trash") {
      setTabs([]);
      setActiveTabId(null);
    }
  }, [view]);

  // Drop freshly-created, never-edited notes when the user leaves the current
  // list (changes group / switches to trash). The 700ms delay gives the
  // NoteEditor's 500ms autosave debounce a chance to flush, so notes the
  // user has just typed into aren't accidentally discarded.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const ids = Array.from(emptyNoteIdsRef.current);
      if (ids.length === 0) return;
      void Promise.all(
        ids.map((id) => client.notes.get(id).catch(() => null)),
      ).then((results) => {
        const stillEmpty: Note[] = [];
        const edited: number[] = [];
        for (const note of results) {
          if (!note) continue;
          if (isEmptyNewNote(note)) stillEmpty.push(note);
          else edited.push(note.id);
        }
        if (edited.length > 0) {
          setEmptyNoteIds((prev) => {
            const next = new Set(prev);
            for (const id of edited) next.delete(id);
            return next;
          });
        }
        if (stillEmpty.length === 0) return;

        const toTrashIds = new Set(stillEmpty.map((n) => n.id));
        setEmptyNoteIds((prev) => {
          const next = new Set(prev);
          for (const id of toTrashIds) next.delete(id);
          return next;
        });
        setTabs((current) => {
          const remaining = current.filter((t) => !toTrashIds.has(t.id));
          // If the active tab is being dropped, fall back to the closest
          // remaining tab.
          if (activeTabId !== null && toTrashIds.has(activeTabId)) {
            const idx = current.findIndex((t) => t.id === activeTabId);
            const fallback = remaining[idx] ?? remaining[idx - 1] ?? null;
            setActiveTabId(fallback?.id ?? null);
          }
          return remaining;
        });
        void Promise.all(
          stillEmpty.map((n) => onTrashNote(n.id).catch(() => undefined)),
        ).then(() => {
          onNotice({
            kind: "info",
            message: stillEmpty.length === 1
              ? "已丢弃空白便签"
              : `已丢弃 ${stillEmpty.length} 条空白便签`,
          });
        });
      });
    }, 700);
    return () => window.clearTimeout(timer);
    // Intentionally not listing `tabs` / `activeTabId` — we read the latest
    // value via refs/state at the time the timer fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, view]);

  // Refresh the active tab data after external note updates.
  useEffect(() => {
    if (activeTabId === null) return;
    let cancelled = false;
    client.notes.get(activeTabId).then((note) => {
      if (cancelled) return;
      setTabs((current) => current.map((t) => (t.id === note.id ? note : t)));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [notesRefreshRequest, activeTabId]);

  const handleTabChanged = useCallback(async () => {
    if (activeTabId === null) return;
    try {
      const note = await client.notes.get(activeTabId);
      setTabs((current) => current.map((t) => (t.id === note.id ? note : t)));
      // Once the user has actually typed something, drop the note from the
      // "empty" set so the cleanup effect won't drop it later.
      if (!isEmptyNewNote(note)) {
        setEmptyNoteIds((prev) => {
          if (!prev.has(note.id)) return prev;
          const next = new Set(prev);
          next.delete(note.id);
          return next;
        });
      }
    } catch { /* ignore */ }
  }, [activeTabId]);

  const closeTab = useCallback((id: number) => {
    // Closing a tab is an explicit user action, so any empty fresh note that
    // gets closed here is treated as discarded without a confirm dialog.
    const shouldTrash = emptyNoteIdsRef.current.has(id);
    setEmptyNoteIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setTabs((current) => {
      const idx = current.findIndex((t) => t.id === id);
      if (idx < 0) return current;
      const next = current.filter((t) => t.id !== id);
      if (activeTabId !== id) return next;
      const fallback = next[idx] ?? next[idx - 1] ?? null;
      setActiveTabId(fallback?.id ?? null);
      return next;
    });
    if (shouldTrash) {
      void onTrashNote(id).catch(() => undefined);
    }
  }, [activeTabId, onTrashNote]);

  const activateTab = useCallback((id: number) => setActiveTabId(id), []);

  const handleTrash = useCallback(async (id: number) => {
    // The note is being deleted on purpose; remove it from the empty set so
    // closeTab won't fire a redundant trash call.
    setEmptyNoteIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await onTrashNote(id);
    closeTab(id);
    setNotes((current) => current.filter((n) => n.id !== id));
  }, [closeTab, onTrashNote]);

  const confirmTrash = useCallback(async () => {
    if (!pendingTrash) return;
    setTrashing(true);
    try {
      await onTrashNote(pendingTrash.id);
      // Drop the empty-set membership so closeTab's auto-trash path doesn't
      // call notes_trash a second time.
      setEmptyNoteIds((prev) => {
        if (!prev.has(pendingTrash.id)) return prev;
        const next = new Set(prev);
        next.delete(pendingTrash.id);
        return next;
      });
      closeTab(pendingTrash.id);
      setNotes((current) => current.filter((n) => n.id !== pendingTrash.id));
      setPendingTrash(null);
    } catch {
      onNotice({ kind: "error", message: "移到回收站失败" });
    } finally {
      setTrashing(false);
    }
  }, [closeTab, onNotice, onTrashNote, pendingTrash]);

  const tabModels: NoteTab[] = useMemo(
    () => tabs.map((t) => ({ id: t.id, title: t.title || "无标题", color: t.color })),
    [tabs],
  );

  const currentGroup = useMemo(
    () => groupId === null ? null : groups.find((g) => g.id === groupId) ?? null,
    [groupId, groups],
  );

  const headerTitle = currentGroup?.name ?? "全部便签";

  return (
    <div className="maximized-layout">
      <ConfirmDialog
        open={pendingTrash !== null}
        title="删除这条便签？"
        description={
          pendingTrash
            ? `「${pendingTrash.title?.trim() || "无标题"}」将被移到回收站，可以稍后恢复。`
            : ""
        }
        confirmAriaLabel="确认删除便签"
        busy={trashing}
        onCancel={() => { if (!trashing) setPendingTrash(null); }}
        onConfirm={() => void confirmTrash()}
      />
      <aside className="maximized-layout__nav">
        <NavColumn
          selectedId={groupId}
          onSelect={onSelectGroup}
          trashActive={view === "trash"}
          onShowTrash={onShowTrash}
          addRequest={createGroupRequest}
          onNotice={onNotice}
        />
      </aside>
      {view === "trash" ? (
        <section className="maximized-layout__list maximized-layout__list--wide">
          <TrashView onNotice={onNotice} onRestored={onTrashChanged} />
        </section>
      ) : (
        <>
          <section className="maximized-layout__list">
            <header className="maximized-list-head">
              <div className="maximized-list-head__title">
                <span className="maximized-list-head__eyebrow">Section</span>
                <h2 className="maximized-list-head__name"
                  style={{ "--hdr-color": currentGroup?.color ?? "var(--accent)" } as CSSProperties}>
                  {headerTitle}
                </h2>
              </div>
              <div className="maximized-list-head__count mono">{notes.length}</div>
              <button
                type="button"
                className="maximized-list-head__new"
                onClick={handleCreateNew}
                title="新建便签 (Ctrl+N)"
                aria-label="新建便签"
              >
                <Plus size={14} weight="bold" />
                <span>新建</span>
              </button>
            </header>
            <div className="note-list">
              {notesLoading ? (
                <div className="note-list__empty">加载中…</div>
              ) : listError ? (
                <div className="note-list__empty">加载失败：{listError}</div>
              ) : notes.length === 0 ? (
                <div className="note-list__empty">
                  这个分组还没有便签,<br />
                  <span style={{ fontSize: "10.5px", color: "var(--fg-subtle)" }}>
                    按 Ctrl + N 新建一条
                  </span>
                </div>
              ) : (
                notes.map((note) => (
                  <NoteListRow
                    key={note.id}
                    note={note}
                    active={note.id === activeTabId}
                    onOpen={handleSelectNote}
                    onTrash={(n) => setPendingTrash(n)}
                  />
                ))
              )}
            </div>
          </section>
          <section className="maximized-layout__pane">
            <NoteTabs
              tabs={tabModels}
              activeTabId={activeTabId}
              onActivate={activateTab}
              onClose={closeTab}
              onNewNote={handleCreateNew}
            />
            <div className="maximized-layout__pane-body">
              {activeTab ? (
                <NoteEditorPane
                  key={activeTab.id}
                  note={activeTab}
                  groups={groups}
                  onChanged={handleTabChanged}
                  onTrash={handleTrash}
                />
              ) : (
                <div className="note-pane note-pane--empty">
                  <div className="note-pane__placeholder">
                    <div className="note-pane__placeholder-glyph" aria-hidden="true" />
                    <h2>选择一个便签开始</h2>
                    <p>从中间列表点选，或按 Ctrl + N 新建一条。</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
