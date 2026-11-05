import { X } from "@phosphor-icons/react";
import { useEffect, useRef, type ReactNode } from "react";
import type { ChangelogEntry } from "./changelog";

interface ChangelogDialogProps {
  entry: ChangelogEntry | null;
  onClose: () => void;
}

function renderChangelogBody(body: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const list: string[] = [];
  let key = 0;

  const flushList = () => {
    if (list.length === 0) return;
    const listKey = key;
    key += 1;
    nodes.push(
      <ul key={listKey}>
        {list.map((item, index) => (
          <li key={`${listKey}-${index}`}>{item}</li>
        ))}
      </ul>,
    );
    list.length = 0;
  };

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }
    if (line.startsWith("### ")) {
      flushList();
      nodes.push(<h3 key={key}>{line.slice(4)}</h3>);
      key += 1;
    } else if (line.startsWith("- ")) {
      list.push(line.slice(2));
    } else {
      flushList();
      nodes.push(<p key={key}>{line}</p>);
      key += 1;
    }
  }
  flushList();
  return nodes;
}

export function ChangelogDialog({ entry, onClose }: ChangelogDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, []);

  if (!entry) return null;

  return (
    <div
      className="modal-scrim changelog-scrim"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="note-editor changelog-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="changelog-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="note-editor__head changelog-dialog__head">
          <span className="note-editor__accent" />
          <div className="changelog-dialog__heading">
            <span className="changelog-dialog__eyebrow">TIDBIT / WHAT'S NEW</span>
            <h2 id="changelog-dialog-title">新版本 v{entry.version}</h2>
          </div>
          <button ref={closeRef} className="btn-icon" aria-label="关闭更新内容" title="关闭" onClick={onClose}>
            <X size={16} weight="bold" />
          </button>
        </header>
        <div className="changelog-dialog__body">
          <div className="changelog-dialog__meta">
            <span className="changelog-dialog__badge">最新版本</span>
            {entry.date && <span>{entry.date}</span>}
          </div>
          {renderChangelogBody(entry.body)}
        </div>
        <footer className="changelog-dialog__foot">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            知道了
          </button>
        </footer>
      </section>
    </div>
  );
}
