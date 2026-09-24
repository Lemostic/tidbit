import { Archive, Plus, Stack } from "@phosphor-icons/react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import type { ToastState } from "../../ui/Toast";
import { client } from "../../ipc/client";
import { useGroups } from "../groups/useGroups";

interface NavColumnProps {
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  trashActive: boolean;
  onShowTrash: () => void;
  addRequest: number;
  onNotice: (toast: ToastState) => void;
}

export function NavColumn({
  selectedId,
  onSelect,
  trashActive,
  onShowTrash,
  addRequest,
  onNotice,
}: NavColumnProps) {
  const { groups, create } = useGroups();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [counts, setCounts] = useState<Record<string, number>>({ all: 0 });
  const lastAddRequest = useRef(addRequest);

  useEffect(() => {
    if (addRequest === lastAddRequest.current) return;
    lastAddRequest.current = addRequest;
    setAdding(true);
  }, [addRequest]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      client.notes.list(null),
      ...groups.map((g) => client.notes.list(g.id)),
    ]).then(([all, ...perGroup]) => {
      if (cancelled) return;
      const next: Record<string, number> = { all: all.length };
      groups.forEach((g, i) => { next[String(g.id)] = perGroup[i]?.length ?? 0; });
      setCounts(next);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [groups]);

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

  const items = [
    {
      key: "all",
      label: "全部便签",
      color: "var(--accent)",
      count: counts.all ?? 0,
      onClick: () => onSelect(null),
      selected: selectedId === null && !trashActive,
      icon: <Stack size={15} weight="duotone" />,
    },
    ...groups.map((g) => ({
      key: String(g.id),
      label: g.name,
      color: g.color,
      count: counts[String(g.id)] ?? 0,
      onClick: () => onSelect(g.id),
      selected: selectedId === g.id && !trashActive,
      icon: <span className="nav-item__dot" />,
    })),
  ];

  return (
    <nav className="nav-column" aria-label="分组导航">
      <div className="nav-column__head">
        <span className="nav-column__eyebrow">分组</span>
        <button className="btn-icon" aria-label="新增分组" title="新增分组" onClick={() => setAdding(true)}>
          <Plus size={14} weight="bold" />
        </button>
      </div>
      {adding ? (
        <form className="nav-column__add" onSubmit={submit}>
          <input className="field" autoFocus value={name} placeholder="新分组名" aria-label="新分组名"
            onChange={(e) => setName(e.target.value)}
            onBlur={() => { if (!name.trim()) { setAdding(false); setName(""); } }}
            onKeyDown={(e) => { if (e.key === "Escape") { setName(""); setAdding(false); } }} />
        </form>
      ) : null}
      <ul className="nav-column__list">
        {items.map((item) => (
          <li key={item.key}>
            <button
              className={`nav-item${item.selected ? " is-active" : ""}`}
              onClick={item.onClick}
              aria-selected={item.selected}
              style={{ "--nav-color": item.color ?? "var(--border-strong)" } as React.CSSProperties}
            >
              <span className="nav-item__color" aria-hidden="true" />
              <span className="nav-item__icon" aria-hidden="true">{item.icon}</span>
              <span className="nav-item__label">{item.label}</span>
              <span className="nav-item__count mono">{item.count}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="nav-column__foot">
        <button
          className={`nav-item nav-item--trash${trashActive ? " is-active" : ""}`}
          onClick={onShowTrash}
          aria-selected={trashActive}
        >
          <span className="nav-item__color" aria-hidden="true" />
          <span className="nav-item__icon"><Archive size={15} /></span>
          <span className="nav-item__label">回收站</span>
        </button>
      </div>
    </nav>
  );
}
