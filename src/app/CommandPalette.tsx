import { Command as CommandIcon, FileText, MagnifyingGlass, X } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { SearchResults } from "../features/search/SearchResults";
import { useSearch } from "../features/search/useSearch";
import { useI18n } from "../i18n";

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
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [tab, setTab] = useState<"commands" | "search">("commands");
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
    clear();
  }, [open, clear]);

  useEffect(() => {
    if (!open || !q.trim()) {
      clear();
      return;
    }
    const timer = window.setTimeout(() => void query(q.trim()), 180);
    return () => window.clearTimeout(timer);
  }, [open, q, query, clear]);

  useEffect(() => { setActive(0); }, [q, tab]);
  if (!open) return null;

  const runActive = async () => {
    const command = filtered[active];
    if (!command) return;
    await command.run();
    onClose();
  };

  return (
    <div className="palette-scrim" onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-label={t("palette.label")} className="palette">
        <header className="palette__head">
          <MagnifyingGlass size={17} />
          <input
            autoFocus
            aria-label={t("titlebar.search")}
            placeholder={t("palette.placeholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((value) => (value + 1) % Math.max(filtered.length, 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((value) => (value - 1 + filtered.length) % Math.max(filtered.length, 1)); }
              if (e.key === "Enter" && tab === "commands") void runActive();
            }}
          />
          <button className="btn-icon" onClick={onClose} aria-label={t("common.close")} title={t("common.close")}><X size={15} /></button>
        </header>

        <div className="palette__tabs">
          <button className="palette__tab" onClick={() => setTab("commands")} data-active={tab === "commands"}>
            <CommandIcon size={14} /> {t("palette.commands")} <span>{filtered.length}</span>
          </button>
          <button className="palette__tab" onClick={() => setTab("search")} data-active={tab === "search"}>
            <FileText size={14} /> {t("palette.notes")} <span>{hits.length}</span>
          </button>
        </div>

        {tab === "search" ? (
          <div className="palette__content">
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
              <li key={command.id} className="palette__item" aria-selected={index === active}>
                <button onMouseEnter={() => setActive(index)} onClick={() => { void command.run(); onClose(); }}>
                  <span><strong>{command.title}</strong>{command.hint && <small>{command.hint}</small>}</span>
                  {command.shortcut && <kbd>{command.shortcut}</kbd>}
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="palette__empty">{t("palette.empty")}</li>}
          </ul>
        )}
      </section>
    </div>
  );
}
