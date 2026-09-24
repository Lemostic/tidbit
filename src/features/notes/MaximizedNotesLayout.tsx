import "./MaximizedNotesLayout.css";
import { Plus } from "@phosphor-icons/react";
import { type CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
import type { Note } from "../../ipc/types";
import type { ToastState } from "../../ui/Toast";
import { client } from "../../ipc/client";
import { NavColumn } from "./NavColumn";
import { NoteEditorPane } from "./NoteEditorPane";
import { NoteListRow } from "./NoteListRow";
import { NoteTabs, type NoteTab } from "./NoteTabs";
import { useGroups } from "../groups/useGroups";

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
  } = props;

const { groups } = useGroups();
  const [tabs, setTabs] = useState<Note[]>([]);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  



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
      const note = await client.notes.create(groupId, "新便签");
      handleSelectNote(note);
      setNotes((current) => [note, ...current]);
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
    } catch { /* ignore */ }
  }, [activeTabId]);

  const closeTab = useCallback((id: number) => {
    setTabs((current) => {
      const idx = current.findIndex((t) => t.id === id);
      if (idx < 0) return current;
      const next = current.filter((t) => t.id !== id);
      if (activeTabId !== id) return next;
      const fallback = next[idx] ?? next[idx - 1] ?? null;
      setActiveTabId(fallback?.id ?? null);
      return next;
    });
  }, [activeTabId]);

  const activateTab = useCallback((id: number) => setActiveTabId(id), []);

  const handleTrash = useCallback(async (id: number) => {
    await onTrashNote(id);
    closeTab(id);
    setNotes((current) => current.filter((n) => n.id !== id));
  }, [closeTab, onTrashNote]);

  const tabModels: NoteTab[] = useMemo(
    () => tabs.map((t) => ({ id: t.id, title: t.title || "无标题", color: t.color })),
    [tabs],
  );

  const currentGroup = useMemo(
    () => groupId === null ? null : groups.find((g) => g.id === groupId) ?? null,
    [groupId, groups],
  );

  const headerTitle = view === "trash" ? "回收站" : (currentGroup?.name ?? "全部便签");

  return (
    <div className="maximized-layout">
      <aside className="maximized-layout__nav">
        {view === "trash" ? (
          <div className="maximized-layout__trash-banner">
            <span className="maximized-layout__trash-title">回收站</span>
            <p>此处显示已删除的便签，30 天后自动清理。</p>
            <button className="btn" onClick={() => onSelectGroup(null)}>← 返回全部便签</button>
          </div>
        ) : (
          <NavColumn
            selectedId={groupId}
            onSelect={onSelectGroup}
            trashActive={false}
            onShowTrash={onShowTrash}
            addRequest={createGroupRequest}
            onNotice={onNotice}
          />
        )}
      </aside>
      <section className="maximized-layout__list">
        <header className="maximized-list-head">
          <div className="maximized-list-head__title">
            <span className="maximized-list-head__eyebrow">{view === "trash" ? "Trash" : "Section"}</span>
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
              {view === "trash" ? "回收站为空" : "这个分组还没有便签"},<br />
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
    </div>
  );
}
