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
    <div role="dialog" aria-label="Command palette"
         style={{ position: "fixed", inset: "10% 25% auto 25%", background: "#fff", border: "1px solid #888", borderRadius: 8, padding: 8, zIndex: 100 }}>
      {showSearch && (
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button onClick={() => setTab("commands")} data-active={tab === "commands"}>命令</button>
          <button onClick={() => setTab("search")} data-active={tab === "search"}>便签</button>
        </div>
      )}
      <input autoFocus aria-label="搜索" value={q} onChange={e => setQ(e.target.value)} style={{ width: "100%" }} />
      {showSearch && tab === "search" ? (
        <SearchResults hits={searchHits} onOpen={(id) => { console.log("would open", id); onClose(); }} />
      ) : (
        <ul role="listbox" tabIndex={0} onKeyDown={async (e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((active+1) % Math.max(filtered.length, 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((active-1+filtered.length) % Math.max(filtered.length, 1)); }
          if (e.key === "Enter" && filtered[active]) { await filtered[active].run(); onClose(); }
        }}>
          {filtered.map((c, i) => <li key={c.id} aria-selected={i===active}>{c.title}</li>)}
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
