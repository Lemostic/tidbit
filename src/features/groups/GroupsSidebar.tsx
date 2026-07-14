import { Check, Plus, Trash, X } from "@phosphor-icons/react";
import { FormEvent, useEffect, useRef, useState } from "react";
import type { Group } from "../../ipc/types";
import type { ToastState } from "../../ui/Toast";
import { configurableColors, readableTextColor } from "../../ui/colorPalette";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { GroupItem } from "./GroupItem";
import { useGroups } from "./useGroups";
import { useI18n } from "../../i18n";

interface GroupsSidebarProps {
  selectedId: number | null;
  addRequest: number;
  onSelect: (id: number | null) => void;
  onNotice: (toast: ToastState) => void;
  onNoteDrop?: (noteId: number, groupId: number | null, groupName: string) => void;
}

const noteDragType = "application/x-tidbit-note-id";

export function GroupsSidebar({ selectedId, addRequest, onSelect, onNotice, onNoteDrop }: GroupsSidebarProps) {
  const { t } = useI18n();
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
    } catch { onNotice({ kind: "error", message: t("notice.groupCreateFailed") }); }
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
      onNotice({ kind: "success", message: t("notice.groupUpdated") });
    } catch { onNotice({ kind: "error", message: t("notice.groupUpdateFailed") }); }
  };

  const deleteGroup = async () => {
    if (!editing) return;
    setDeleting(true);
    try {
      await remove(editing.id);
      if (selectedId === editing.id) onSelect(null);
      setEditing(null);
      onNotice({ kind: "success", message: t("notice.groupDeleted") });
    } catch { onNotice({ kind: "error", message: t("notice.groupDeleteFailed") }); }
    finally { setDeleting(false); setConfirmingDelete(false); }
  };

  return (
    <>
      <nav className="groups-rail" aria-label={t("groups.label")}>
        <button
          className={`group-tab${selectedId === null ? " is-active" : ""}${allDropActive ? " is-drop-target" : ""}`}
          aria-selected={selectedId === null}
          title={t("groups.allNotes")}
          onClick={() => onSelect(null)}
          onDragEnter={(event) => { event.preventDefault(); setAllDropActive(true); }}
          onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setAllDropActive(true); }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setAllDropActive(false); }}
          onDrop={(event) => {
            event.preventDefault();
            setAllDropActive(false);
            const noteId = Number(event.dataTransfer.getData(noteDragType) || event.dataTransfer.getData("text/plain"));
            if (Number.isSafeInteger(noteId)) onNoteDrop?.(noteId, null, t("groups.all"));
          }}
        >
          <span className="group-tab__label">{t("groups.all")}</span>
        </button>
        {groups.map((group) => (
          <GroupItem key={group.id} group={group} selected={selectedId === group.id} onClick={() => onSelect(group.id)} onEdit={() => openEditor(group)} onNoteDrop={(noteId, groupId) => onNoteDrop?.(noteId, groupId, group.name)} />
        ))}
        {adding ? (
          <form onSubmit={submit}>
            <input className="groups-rail__new" autoFocus value={name} placeholder={t("groups.namePlaceholder")} aria-label={t("groups.newName")} onChange={(e) => setName(e.target.value)} onBlur={() => { if (!name.trim()) setAdding(false); }} onKeyDown={(e) => { if (e.key === "Escape") { setName(""); setAdding(false); } }} />
          </form>
        ) : (
          <button className="groups-rail__add" aria-label={t("groups.add")} title={t("groups.add")} onClick={() => setAdding(true)}><Plus size={16} /></button>
        )}
      </nav>

      {editing && (
        <div className="modal-scrim" onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) setEditing(null); }}>
          <form className="group-editor" onSubmit={saveEditor}>
            <header><strong>{t("groups.edit")}</strong><button type="button" className="btn-icon" onClick={() => setEditing(null)} aria-label={t("common.close")}><X size={15} /></button></header>
            <label><span>{t("groups.groupName")}</span><input className="field" autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} /></label>
            <div className="settings-field"><label>{t("groups.markerColor")}</label><div className="color-swatches">
              {configurableColors.map((color) => <button type="button" key={color.name} className={`color-swatch${editColor === color.value ? " is-active" : ""}`} style={{ background: color.value ?? "var(--surface-2)", color: color.value ? readableTextColor(color.value) : "var(--fg)" }} onClick={() => setEditColor(color.value)} aria-label={color.value ? t("groups.markerChoice", { name: color.name, value: color.value }) : t("groups.defaultMarker")} title={color.name}>{editColor === color.value && <Check size={11} />}</button>)}
            </div></div>
            <div className="settings-field"><label>{t("groups.backgroundColor")}</label><div className="color-swatches">
              {configurableColors.map((color) => <button type="button" key={color.name} className={`color-swatch${editBackgroundColor === color.value ? " is-active" : ""}`} style={{ background: color.value ?? "var(--surface-2)", color: color.value ? readableTextColor(color.value) : "var(--fg)" }} onClick={() => setEditBackgroundColor(color.value)} aria-label={color.value ? t("groups.backgroundChoice", { name: color.name, value: color.value }) : t("groups.defaultBackground")} title={color.name}>{editBackgroundColor === color.value && <Check size={11} />}</button>)}
            </div></div>
            <footer><button type="button" className="btn btn-ghost is-danger" onClick={() => setConfirmingDelete(true)}><Trash size={14} />{t("common.delete")}</button><button className="btn btn-primary" type="submit">{t("common.save")}</button></footer>
          </form>
        </div>
      )}
      <ConfirmDialog
        open={confirmingDelete}
        title={t("groups.deleteTitle")}
        description={t("groups.deleteDescription", { name: editing?.name ?? t("groups.thisGroup") })}
        confirmAriaLabel={t("groups.confirmDelete")}
        busy={deleting}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={deleteGroup}
      />
    </>
  );
}
