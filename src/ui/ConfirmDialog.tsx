import { Warning, X } from "@phosphor-icons/react";
import { useEffect } from "react";
import { useI18n } from "../i18n";

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
  confirmLabel,
  confirmAriaLabel,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useI18n();
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel, open]);

  if (!open) return null;
  return (
    <div className="confirm-scrim" onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget && !busy) onCancel(); }}>
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description">
        <button className="confirm-dialog__close" onClick={onCancel} disabled={busy} aria-label={t("common.close")} title={t("common.close")}><X size={14} /></button>
        <div className="confirm-dialog__icon"><Warning size={22} weight="fill" /></div>
        <div className="confirm-dialog__copy">
          <h2 id="confirm-title">{title}</h2>
          <p id="confirm-description">{description}</p>
        </div>
        <footer>
          <button className="btn btn-ghost" onClick={onCancel} disabled={busy}>{t("common.cancel")}</button>
          <button className="btn confirm-dialog__danger" aria-label={confirmAriaLabel} onClick={() => void onConfirm()} disabled={busy}>{busy ? t("common.processing") : confirmLabel ?? t("common.confirmDelete")}</button>
        </footer>
      </section>
    </div>
  );
}
