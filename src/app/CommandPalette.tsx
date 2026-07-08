import { useEffect, useState } from "react";
import type { Command } from "./CommandPalette";

export function CommandPalette({ open, commands, onClose }: { open: boolean; commands: Command[]; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const filtered = commands.filter(c => c.title.toLowerCase().includes(q.toLowerCase()));
  useEffect(() => { if (open) { setQ(""); setActive(0); } }, [open]);
  useEffect(() => { setActive(0); }, [q]);
  if (!open) return null;
  return (
    <div role="dialog" aria-label="Command palette"
         style={{ position: "fixed", inset: "10% 25% auto 25%", background: "#fff", border: "1px solid #888", borderRadius: 8, padding: 8, zIndex: 100 }}>
      <input autoFocus aria-label="搜索" value={q} onChange={e => setQ(e.target.value)} style={{ width: "100%" }} />
      <ul role="listbox" tabIndex={0} onKeyDown={async (e) => {
        if (e.key === "Escape") onClose();
        if (e.key === "ArrowDown") { e.preventDefault(); setActive((active+1) % Math.max(filtered.length, 1)); }
        if (e.key === "ArrowUp") { e.preventDefault(); setActive((active-1+filtered.length) % Math.max(filtered.length, 1)); }
        if (e.key === "Enter" && filtered[active]) { await filtered[active].run(); onClose(); }
      }}>
        {filtered.map((c, i) => <li key={c.id} aria-selected={i===active}>{c.title}</li>)}
      </ul>
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
