import { useEffect, useState } from "react";
import { Archive, ArrowCounterClockwise, X } from "@phosphor-icons/react";
import { useBackupStatus } from "./useBackupStatus";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { useI18n } from "../../i18n";

export function RestoreWizard({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const { t } = useI18n();
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restoring, setRestoring] = useState("");
  const [confirmFile, setConfirmFile] = useState("");
  const api = useBackupStatus();

  useEffect(() => {
    api.list().then(setFiles).catch(() => setError(t("restore.listError"))).finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const restore = async (file: string) => {
    setRestoring(file);
    setError("");
    try {
      await api.restore(file);
      onDone();
    } catch {
      setError(t("restore.failed"));
      setRestoring("");
    }
  };

  return (
    <div className="modal-scrim" onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}>
      <section className="restore-panel" role="dialog" aria-label={t("restore.label")}>
        <header className="modal__head">
          <Archive size={18} weight="duotone" />
          <span className="modal__title">{t("restore.title")}</span>
          <button className="btn-icon" onClick={onClose} aria-label={t("common.close")} title={t("common.close")}><X size={15} /></button>
        </header>
        <div className="restore-panel__body">
          {loading && <div className="skeleton-list"><span /><span /><span /></div>}
          {!loading && files.length === 0 && <div className="search-empty"><Archive size={22} /><span>{t("restore.empty")}</span></div>}
          {error && <div className="inline-error">{error}</div>}
          <ul className="backup-list">
            {files.map((file) => {
              const name = file.split(/[\\/]/).pop() ?? file;
              return (
                <li key={file}>
                  <div><strong>{name}</strong><small>{file}</small></div>
                  <button className="btn btn-ghost" disabled={Boolean(restoring)} onClick={() => setConfirmFile(file)}>
                    <ArrowCounterClockwise size={15} />{restoring === file ? t("restore.restoring") : t("restore.action")}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
      <ConfirmDialog
        open={Boolean(confirmFile)}
        title={t("restore.confirmTitle")}
        description={t("restore.confirmDescription")}
        confirmLabel={t("restore.confirm")}
        confirmAriaLabel={t("restore.confirm")}
        busy={Boolean(restoring)}
        onCancel={() => setConfirmFile("")}
        onConfirm={() => restore(confirmFile)}
      />
    </div>
  );
}
