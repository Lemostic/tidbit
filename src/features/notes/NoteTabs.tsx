import "./NoteTabs.css";
import { Plus, X } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";

export interface NoteTab {
  id: number;
  title: string;
  color: string | null;
  isDirty?: boolean;
}

interface NoteTabsProps {
  tabs: NoteTab[];
  activeTabId: number | null;
  onActivate: (id: number) => void;
  onClose: (id: number) => void;
  onNewNote?: () => void;
  canClose?: (id: number) => boolean;
}

export function NoteTabs({ tabs, activeTabId, onActivate, onClose, onNewNote }: NoteTabsProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll active tab into view when it changes.
  useEffect(() => {
    const node = activeRef.current;
    const scroller = scrollerRef.current;
    if (!node || !scroller) return;
    const nodeRect = node.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    if (nodeRect.left < scrollerRect.left) {
      scroller.scrollTo({ left: node.offsetLeft - 12, behavior: "smooth" });
    } else if (nodeRect.right > scrollerRect.right) {
      scroller.scrollTo({ left: node.offsetLeft + node.offsetWidth - scroller.clientWidth + 12, behavior: "smooth" });
    }
  }, [activeTabId, tabs.length]);

  if (tabs.length === 0) return null;

  return (
    <div className="note-tabs" role="tablist" aria-label="打开的便签">
      <div className="note-tabs__scroller" ref={scrollerRef}>
        {tabs.map((tab) => {
          const active = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={active}
              className={`note-tab${active ? " is-active" : ""}`}
              onClick={() => onActivate(tab.id)}
              onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); onClose(tab.id); } }}
            >
              <button
                ref={active ? activeRef : undefined}
                type="button"
                className="note-tab__btn"
                title={tab.title}
              >
                <span className="note-tab__color" style={{ background: tab.color ?? "var(--accent)" }} aria-hidden="true" />
                <span className="note-tab__title">{tab.title || "无标题"}</span>
                {tab.isDirty && <span className="note-tab__dirty" aria-label="未保存" />}
              </button>
              <button
                type="button"
                className="note-tab__close"
                aria-label={`关闭 ${tab.title || "无标题"}`}
                onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
              ><X size={11} weight="bold" /></button>
            </div>
          );
        })}
      </div>
      {onNewNote && (
        <button
          type="button"
          className="note-tabs__new"
          onClick={onNewNote}
          aria-label="新建便签"
          title="新建便签 (Ctrl+N)"
        ><Plus size={13} weight="bold" /></button>
      )}
    </div>
  );
}
