import { Check, Plus, Trash, X } from "@phosphor-icons/react";
import { FormEvent, useEffect, useRef, useState } from "react";
import type { Group } from "../../ipc/types";
import type { ToastState } from "../../ui/Toast";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { GroupItem } from "./GroupItem";
import { useGroups } from "./useGroups";

interface GroupsSidebarProps {
  selectedId: number | null;
  addRequest: number;
  onSelect: (id: number | null) => void;
  onNotice: (toast: ToastState) => void;
  onNoteDrop?: (noteId: number, groupId: number | null, groupName: string) => void;
}

const colors = [null, "#e34f5b", "#e0a52e", "#35a66f", "#3d86d8"] as const;

const noteDragType = "application/x-tidbit-note-id";

export function GroupsSidebar({ selectedId, addRequest, onSelect, onNotice, onNoteDrop }: GroupsSidebarProps) {
  const { groups, create, update, remove } = useGroups();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<Group | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string | null>(null);
  const [editBackgroundColor, setEditBackgroundColor] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [allDropActive, setAllDropActive] = useState(false);
  const lastAddRequest = useRef(addRequest);

  useEffect(() => {
    if (addRequest === lastAddRequest.current) return;
    lastAddRequest.current = addRequest;
    setAdding(true);
  }, [addRequest]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const group = await create(trimmed);
      setName("");
      setAdding(false);
      onSelect(group.id);
    } catch { onNotice({ kind: "error", message: "新建分组失败" }); }
  };

  const openEditor = (group: Group) => {
    setEditing(group);
    setEditName(group.name);
    setEditColor(group.color);
    setEditBackgroundColor(group.background_color ?? group.color);
  };

  const saveEditor = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing || !editName.trim()) return;
    try {
      await update(editing.id, editName.trim(), editColor, editBackgroundColor);
      setEditing(null);
      onNotice({ kind: "success", message: "分组已更新" });
    } catch { onNotice({ kind: "error", message: "分组更新失败" }); }
  };

  const deleteGroup = async () => {
    if (!editing) return;
    setDeleting(true);
    try {
      await remove(editing.id);
      if (selectedId === editing.id) onSelect(null);
      setEditing(null);
      onNotice({ kind: "success", message: "分组已删除，便签已保留" });
    } catch { onNotice({ kind: "error", message: "删除分组失败" }); }
    finally { setDeleting(false); setConfirmingDelete(false); }
  };

  return (
    <>
      <nav className="groups-rail" aria-label="便签分组">
        <button
          className={`group-tab${selectedId === null ? " is-active" : ""}${allDropActive ? " is-drop-target" : ""}`}
          aria-selected={selectedId === null}
          title="全部便签"
          onClick={() => onSelect(null)}
          onDragEnter={(event) => { event.preventDefault(); setAllDropActive(true); }}
          onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setAllDropActive(true); }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setAllDropActive(false); }}
          onDrop={(event) => {
            event.preventDefault();
            setAllDropActive(false);
            const noteId = Number(event.dataTransfer.getData(noteDragType) || event.dataTransfer.getData("text/plain"));
            if (Number.isSafeInteger(noteId)) onNoteDrop?.(noteId, null, "全部");
          }}
        >
          <span className="group-tab__label">全部</span>
        </button>
        {groups.map((group) => (
          <GroupItem
            key={group.id}
            group={group}
            selected={selectedId === group.id}
            onClick={() => onSelect(group.id)}
            onEdit={() => openEditor(group)}
            onNoteDrop={(noteId, groupId) => onNoteDrop?.(noteId, groupId, group.name)}
          />
        ))}
        {adding ? (
          <form onSubmit={submit}>
            <input className="groups-rail__new" autoFocus value={name} placeholder="名称" aria-label="新分组名" onChange={(e) => setName(e.target.value)} onBlur={() => { if (!name.trim()) setAdding(false); }} onKeyDown={(e) => { if (e.key === "Escape") { setName(""); setAdding(false); } }} />
          </form>
        ) : (
          <button className="groups-rail__add" aria-label="新增分组" title="新增分组" onClick={() => setAdding(true)}><Plus size={16} /></button>
        )}
      </nav>

      {editing && (
        <div className="modal-scrim" onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) setEditing(null); }}>
          <form className="group-editor" onSubmit={saveEditor}>
            <header><strong>编辑分组</strong><button type="button" className="btn-icon" onClick={() => setEditing(null)} aria-label="关闭分组编辑"><X size={15} /></button></header>
            <label><span>分组名称</span><input className="field" autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} /></label>
            <div className="settings-field"><label>标记颜色</label><div className="color-swatches">
              {colors.map((color) => <button type="button" key={color ?? "default"} className={`color-swatch${editColor === color ? " is-active" : ""}`} style={{ background: color ?? "var(--surface-2)" }} onClick={() => setEditColor(color)} aria-label={color ? `标记颜色 ${color}` : "默认标记颜色"}>{editColor === color && <Check size={11} />}</button>)}
            </div></div>
            <div className="settings-field"><label>标签背景颜色</label><div className="color-swatches">
              {colors.map((color) => <button type="button" key={color ?? "default"} className={`color-swatch${editBackgroundColor === color ? " is-active" : ""}`} style={{ background: color ?? "var(--surface-2)" }} onClick={() => setEditBackgroundColor(color)} aria-label={color ? `背景颜色 ${color}` : "默认背景颜色"}>{editBackgroundColor === color && <Check size={11} />}</button>)}
            </div></div>
            <footer><button type="button" className="btn btn-ghost is-danger" onClick={() => setConfirmingDelete(true)}><Trash size={14} />删除</button><button className="btn btn-primary" type="submit">保存</button></footer>
          </form>
        </div>
      )}
      <ConfirmDialog
        open={confirmingDelete}
        title="删除这个分组？"
        description={`「${editing?.name ?? "该分组"}」中的便签不会删除，将统一移动到「全部便签」。`}
        confirmAriaLabel="确认删除分组"
        busy={deleting}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={deleteGroup}
      />
    </>
  );
}
