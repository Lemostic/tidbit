import { Warning, X } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmAriaLabel?: string;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "确认删除",
  confirmAriaLabel,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();
    return () => previousFocus?.focus();
  }, [open]);

  if (!open) return null;
  return (
    <div className="confirm-scrim" onKeyDown={(event) => { event.stopPropagation(); if (event.key === "Escape" && !busy) onCancel(); }} onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget && !busy) onCancel(); }}>
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description" onClick={(event) => event.stopPropagation()}>
        <button className="confirm-dialog__close" onClick={onCancel} disabled={busy} aria-label="关闭确认框" title="关闭确认框"><X size={14} /></button>
        <div className="confirm-dialog__icon"><Warning size={22} weight="fill" /></div>
        <div className="confirm-dialog__copy">
          <h2 id="confirm-title">{title}</h2>
          <p id="confirm-description">{description}</p>
        </div>
        <footer>
          <button ref={cancelRef} className="btn btn-ghost" onClick={onCancel} disabled={busy}>取消</button>
          <button className="btn confirm-dialog__danger" aria-label={confirmAriaLabel} onClick={() => void onConfirm()} disabled={busy}>{busy ? "正在处理" : confirmLabel}</button>
        </footer>
      </section>
    </div>
  );
}
