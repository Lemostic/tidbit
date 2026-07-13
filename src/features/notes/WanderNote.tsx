import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { CaretDown, CaretUp, Cloud, LockKey, ToggleLeft, ToggleRight, X } from "@phosphor-icons/react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { useEffect, useMemo, useState } from "react";
import { client } from "../../ipc/client";
import type { Note } from "../../ipc/types";
import type { Group } from "../../ipc/types";
import { applyFontPreferences, loadFontPreferences } from "../../ui/fontPreferences";
import { appearanceChangedEvent, applyAppearance, loadAppearance, type AppearancePreferences } from "../../ui/appearance";
import { sanitizeNoteHtml } from "./sanitizeNoteHtml";
import { NoteEditor } from "./NoteEditor";

interface WanderNoteProps {
  noteId: number;
  initialOpacity: number;
}

export function WanderNote({ noteId, initialOpacity }: WanderNoteProps) {
  const [note, setNote] = useState<Note | null>(null);
  const [error, setError] = useState(false);
  const [opacity, setOpacity] = useState(initialOpacity);
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [titleDraft, setTitleDraft] = useState("");
  const renderedHtml = useMemo(() => sanitizeNoteHtml(note?.content_html ?? ""), [note?.content_html]);

  useEffect(() => {
    applyAppearance(loadAppearance());
    applyFontPreferences(loadFontPreferences());
    const refresh = async () => {
      try {
        const nextNote = await client.notes.get(noteId);
        setNote(nextNote);
        setTitleDraft(nextNote.title ?? "");
        try { setGroups(await client.groups.list()); } catch { setGroups([]); }
        setError(false);
        await invoke("wander_ready", { noteId });
      } catch { setError(true); void invoke("wander_ready", { noteId }); }
    };
    void refresh();
    let disposeOpacity: (() => void) | undefined;
    let disposeAppearance: (() => void) | undefined;
    let disposeUpdated: (() => void) | undefined;
    void listen<number>("tidbit://wander-opacity", (event) => setOpacity(event.payload)).then((unlisten) => { disposeOpacity = unlisten; });
    void listen<AppearancePreferences>(appearanceChangedEvent, (event) => applyAppearance(event.payload)).then((unlisten) => { disposeAppearance = unlisten; });
    void listen<{ id: number }>("tidbit://note-updated", (event) => { if (event.payload.id === noteId) void refresh(); }).then((unlisten) => { disposeUpdated = unlisten; });
    return () => { disposeOpacity?.(); disposeAppearance?.(); disposeUpdated?.(); };
  }, [noteId]);

  const toggleCollapsed = async () => {
    const next = !collapsed;
    if (next) setEditing(false);
    setCollapsed(next);
    await getCurrentWindow().setSize(new LogicalSize(340, next ? 62 : 360));
  };

  const toggleEditing = async () => {
    const next = !editing;
    if (next && collapsed) {
      setCollapsed(false);
      await getCurrentWindow().setSize(new LogicalSize(340, 360));
    }
    setEditing(next);
  };

  const updateTitle = async () => {
    if (!note) return;
    const next = titleDraft.trim() || "无标题";
    if (next === (note.title ?? "")) return;
    try {
      const updated = await client.notes.updateTitle(note.id, next);
      setNote(updated);
      setTitleDraft(updated.title ?? next);
      await emit("tidbit://note-updated", { id: noteId });
    } catch { setTitleDraft(note.title ?? ""); }
  };

  const refreshAfterEdit = async () => {
    try { setNote(await client.notes.get(noteId)); } catch { setError(true); }
    await emit("tidbit://note-updated", { id: noteId });
  };

  return (
    <main className="wander-shell" style={{ "--wander-opacity": opacity / 100 } as React.CSSProperties}>
      <article className={`wander-card${collapsed ? " is-collapsed" : ""}`}>
        <header className="wander-card__head">
          <span data-tauri-drag-region className="wander-card__mark"><Cloud size={15} weight="duotone" /></span>
          {editing && note ? <input className="wander-card__title-input" aria-label="云游便签标题" value={titleDraft} onMouseDown={(event) => event.stopPropagation()} onChange={(event) => setTitleDraft(event.target.value)} onBlur={() => void updateTitle()} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /> : <strong data-tauri-drag-region>{note?.is_content_hidden ? "隐私便签" : note?.title?.trim() || "云游便签"}</strong>}
          {note && <button className={`wander-card__mode${editing ? " is-active" : ""}`} aria-label={editing ? "切换为只读" : "切换为编辑"} aria-pressed={editing} title={editing ? "只读模式" : "编辑模式"} onMouseDown={(event) => event.stopPropagation()} onClick={() => void toggleEditing()}>{editing ? <ToggleRight size={18} weight="fill" /> : <ToggleLeft size={18} />}</button>}
          <button aria-label={collapsed ? "展开云游便签" : "折叠云游便签"} title={collapsed ? "展开" : "只显示标题"} onMouseDown={(event) => event.stopPropagation()} onClick={() => void toggleCollapsed()}>{collapsed ? <CaretDown size={14} /> : <CaretUp size={14} />}</button>
          <button aria-label="关闭云游便签" title="关闭" onMouseDown={(event) => event.stopPropagation()} onClick={() => void invoke("wander_close", { noteId })}><X size={14} weight="bold" /></button>
        </header>
        {!collapsed && <section className={`wander-card__body${editing ? " is-editing" : ""}`}>
          {editing && note ? <NoteEditor note={note} groups={groups} onClose={() => setEditing(false)} onChanged={() => void refreshAfterEdit()} onTrash={async () => undefined} allowTrash={false} embedded /> : <>
          {error ? <p className="wander-card__state">便签加载失败</p> : !note ? <div className="wander-card__skeleton"><span /><span /><span /></div> : note.is_content_hidden ? (
            <div className="wander-card__private"><LockKey size={18} /><span>该条便签内容已加密</span></div>
          ) : renderedHtml ? (
            <div className="wander-card__content" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
          ) : <p className="wander-card__state">暂无正文</p>}
          </>}
        </section>}
        {!collapsed && !editing && note && <footer className="wander-card__foot"><span>{note.word_count} 字</span><span>#{note.id}</span></footer>}
      </article>
    </main>
  );
}
