import { CheckCircle, WarningCircle, X } from "@phosphor-icons/react";
import { useI18n } from "../i18n";

export type ToastState = {
  kind: "success" | "error" | "info";
  message: string;
} | null;

export function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  const { t } = useI18n();
  if (!toast) return null;
  const Icon = toast.kind === "error" ? WarningCircle : CheckCircle;
  return (
    <div className={`toast toast--${toast.kind}`} role="status">
      <Icon size={17} weight="fill" aria-hidden="true" />
      <span>{toast.message}</span>
      <button className="toast__close" onClick={onClose} aria-label={t("common.closeNotification")} title={t("common.closeNotification")}>
        <X size={13} weight="bold" />
      </button>
    </div>
  );
}
