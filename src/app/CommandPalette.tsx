import { useEffect, useState } from "react";
import type { Command } from "./CommandPalette";
import { SearchResults } from "../features/search/SearchResults";
import type { SearchHit } from "../features/search/SearchProvider";

export function CommandPalette({ open, commands, onClose, searchHits }: {
  open: boolean;
  commands: Command[];
  onClose: () => void;
  searchHits?: SearchHit[];
}) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [tab, setTab] = useState<"commands" | "search">("commands");
  const filtered = commands.filter(c => c.title.toLowerCase().includes(q.toLowerCase()));
  const showSearch = searchHits && searchHits.length > 0;
  useEffect(() => { if (open) { setQ(""); setActive(0); setTab(showSearch ? "search" : "commands"); } }, [open, showSearch]);
  useEffect(() => { setActive(0); }, [q]);
  if (!open) return null;
  return (
    <div role="dialog" aria-label="命令面板" className="palette">
      {showSearch && (
        <div className="palette__tabs">
          <button className="palette__tab" onClick={() => setTab("commands")} data-active={tab === "commands"}>命令</button>
          <button className="palette__tab" onClick={() => setTab("search")} data-active={tab === "search"}>便签</button>
        </div>
      )}
      <input className="field" autoFocus aria-label="搜索" placeholder="输入命令或搜索便签…" value={q} onChange={e => setQ(e.target.value)} />
      {showSearch && tab === "search" ? (
        <SearchResults hits={searchHits} onOpen={(id) => { console.log("would open", id); onClose(); }} />
      ) : (
        <ul role="listbox" className="palette__list" tabIndex={0} onKeyDown={async (e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((active+1) % Math.max(filtered.length, 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((active-1+filtered.length) % Math.max(filtered.length, 1)); }
          if (e.key === "Enter" && filtered[active]) { await filtered[active].run(); onClose(); }
        }}>
          {filtered.map((c, i) => <li key={c.id} className="palette__item" aria-selected={i===active}>{c.title}</li>)}
        </ul>
      )}
    </div>
  );
}

export type Command = {
  id: string;
  title: string;
  hint?: string;
  group: "note" | "group" | "app" | "search";
  shortcut?: string;
  run: (ctx?: any) => void | Promise<void>;
};
