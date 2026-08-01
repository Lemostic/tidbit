import { Command as CommandIcon, FileText, MagnifyingGlass, X } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { SearchResults } from "../features/search/SearchResults";
import { useSearch } from "../features/search/useSearch";
import { client } from "../ipc/client";

export type Command = {
  id: string;
  title: string;
  hint?: string;
  group: "note" | "group" | "app" | "search";
  shortcut?: string;
  run: () => void | Promise<void>;
};

interface CommandPaletteProps {
  open: boolean;
  commands: Command[];
  onClose: () => void;
  onOpenNote?: (id: number) => void;
}

export function CommandPalette({ open, commands, onClose, onOpenNote }: CommandPaletteProps) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [tab, setTab] = useState<"commands" | "search">("commands");
  const [searchTag, setSearchTag] = useState<string | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const { hits, loading, error, query, clear } = useSearch();
  const filtered = useMemo(
    () => commands.filter((command) => command.title.toLowerCase().includes(q.toLowerCase())),
    [commands, q],
  );

  useEffect(() => {
    if (!open) return;
    setQ("");
    setActive(0);
    setTab("commands");
    setSearchTag(null);
    setIncludeArchived(false);
    clear();
  }, [open, clear]);

  useEffect(() => {
    void client.tags.list().then(setAvailableTags).catch(() => setAvailableTags([]));
  }, []);

  useEffect(() => {
    if (!open || !q.trim()) {
      clear();
      return;
    }
    const timer = window.setTimeout(
      () => void query(q.trim(), { tag: searchTag ?? undefined, includeArchived }),
      180,
    );
    return () => window.clearTimeout(timer);
  }, [open, q, query, clear, searchTag, includeArchived]);

  useEffect(() => { setActive(0); }, [q, tab]);
  if (!open) return null;

  const runActive = async () => {
    const command = filtered[active];
    if (!command) return;
    await command.run();
    onClose();
  };

  return (
    <div className="palette-scrim" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }} onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-label="命令面板" className="palette" onClick={(event) => event.stopPropagation()}>
        <header className="palette__head">
          <MagnifyingGlass size={17} />
          <input
            autoFocus
            aria-label="搜索"
            placeholder="搜索便签或执行命令"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((value) => (value + 1) % Math.max(filtered.length, 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((value) => (value - 1 + filtered.length) % Math.max(filtered.length, 1)); }
              if (e.key === "Enter" && tab === "commands") void runActive();
            }}
          />
          <button className="btn-icon" onClick={onClose} aria-label="关闭命令面板" title="关闭命令面板"><X size={15} /></button>
        </header>

        <div className="palette__tabs" role="tablist" aria-label="搜索范围">
          <button className="palette__tab" role="tab" aria-selected={tab === "commands"} onClick={() => setTab("commands")} data-active={tab === "commands"}>
            <CommandIcon size={14} /> 命令 <span>{filtered.length}</span>
          </button>
          <button className="palette__tab" role="tab" aria-selected={tab === "search"} onClick={() => setTab("search")} data-active={tab === "search"}>
            <FileText size={14} /> 便签 <span>{hits.length}</span>
          </button>
        </div>

        {tab === "search" ? (
          <div className="palette__content">
            <div className="palette__filters" aria-label="搜索范围">
              <label className="palette__filter-check">
                <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />
                <span>包含归档</span>
              </label>
              {availableTags.length > 0 && (
                <select
                  className="select"
                  aria-label="按标签筛选"
                  value={searchTag ?? ""}
                  onChange={(e) => setSearchTag(e.target.value || null)}
                >
                  <option value="">全部标签</option>
                  {availableTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                </select>
              )}
            </div>
            {loading ? <div className="skeleton-list"><span /><span /><span /></div> : error ? <div className="inline-error">{error}</div> : (
              <SearchResults hits={hits} onOpen={(id) => { onOpenNote?.(id); onClose(); }} />
            )}
          </div>
        ) : (
          <ul role="listbox" className="palette__list" tabIndex={0} onKeyDown={(e) => {
            if (e.key === "Enter") void runActive();
            if (e.key === "Escape") onClose();
          }}>
            {filtered.map((command, index) => (
              <li key={command.id} role="option" className="palette__item" aria-selected={index === active}>
                <button onMouseEnter={() => setActive(index)} onClick={() => { void command.run(); onClose(); }}>
                  <span><strong>{command.title}</strong>{command.hint && <small>{command.hint}</small>}</span>
                  {command.shortcut && <kbd>{command.shortcut}</kbd>}
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="palette__empty">没有匹配命令</li>}
          </ul>
        )}
      </section>
    </div>
  );
}
