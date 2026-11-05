import { ArrowsClockwise, PencilSimple, Tag as TagIcon, Trash, X } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { client } from "../../ipc/client";

interface TagManagerProps {
  open: boolean;
  tagCounts: Map<string, number>;
  onClose: () => void;
  onChanged: () => void;
  onNotice: (message: string, kind?: "success" | "error") => void;
}

interface EditState {
  tag: string;
  value: string;
}

export function TagManager({ open, tagCounts, onClose, onChanged, onNotice }: TagManagerProps) {
  const [editing, setEditing] = useState<EditState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) setEditing(null);
  }, [open]);

  const rename = useCallback(async () => {
    if (!editing) return;
    const next = editing.value.trim();
    if (!next || next === editing.tag) {
      setEditing(null);
      return;
    }
    setBusy(true);
    try {
      await client.tags.rename(editing.tag, next);
      onChanged();
      onNotice(`已将「${editing.tag}」重命名为「${next}」`, "success");
      setEditing(null);
    } catch {
      onNotice("重命名失败", "error");
    } finally {
      setBusy(false);
    }
  }, [editing, onChanged, onNotice]);

  const remove = useCallback(async (name: string) => {
    setBusy(true);
    try {
      const removed = await client.tags.delete(name);
      onChanged();
      onNotice(`已删除标签「${name}」${removed > 0 ? `（${removed} 处便签）` : ""}`, "success");
    } catch {
      onNotice("删除失败", "error");
    } finally {
      setBusy(false);
    }
  }, [onChanged, onNotice]);

  if (!open) return null;

  const tags = Array.from(tagCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="modal-scrim" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal tag-manager" role="dialog" aria-modal="true" aria-label="标签管理" onClick={(event) => event.stopPropagation()}>
        <header className="modal__head">
          <span className="tag-manager__icon"><TagIcon size={15} weight="duotone" /></span>
          <h2 className="modal__title">标签管理</h2>
          <button className="btn-icon" aria-label="关闭" title="关闭" onClick={onClose} disabled={busy}><X size={15} weight="bold" /></button>
        </header>
        <div className="modal__body tag-manager__body">
          {tags.length === 0 ? (
            <div className="tag-manager__empty">
              <TagIcon size={26} weight="duotone" />
              <p>暂无标签。在便签编辑器里给便签添加标签后会显示在这里。</p>
            </div>
          ) : (
            <ul className="tag-manager__list">
              {tags.map(([name, count]) => (
                <li key={name} className="tag-manager__row">
                  {editing?.tag === name ? (
                    <>
                      <input
                        className="field tag-manager__edit"
                        autoFocus
                        value={editing.value}
                        onChange={(event) => setEditing({ tag: name, value: event.target.value })}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void rename();
                          if (event.key === "Escape") setEditing(null);
                        }}
                        aria-label={`重命名标签 ${name}`}
                      />
                      <span className="tag-manager__count mono">{count}</span>
                      <button className="btn-icon" onClick={() => void rename()} disabled={busy} aria-label="保存重命名" title="保存"><ArrowsClockwise size={13} /></button>
                      <button className="btn-icon" onClick={() => setEditing(null)} disabled={busy} aria-label="取消" title="取消"><X size={13} /></button>
                    </>
                  ) : (
                    <>
                      <span className="tag-manager__name">{name}</span>
                      <span className="tag-manager__count mono">{count}</span>
                      <button className="btn-icon" onClick={() => setEditing({ tag: name, value: name })} disabled={busy} aria-label={`重命名 ${name}`} title="重命名"><PencilSimple size={13} /></button>
                      <button className="btn-icon is-danger" onClick={() => void remove(name)} disabled={busy} aria-label={`删除 ${name}`} title="从所有便签删除"><Trash size={13} /></button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <footer className="modal__head tag-manager__foot">
          <span className="tag-manager__hint">重命名会同步到所有使用该标签的便签。删除会从所有便签移除。</span>
          <button className="btn" onClick={onClose}>完成</button>
        </footer>
      </section>
    </div>
  );
}