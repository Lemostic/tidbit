import { useEffect, useState } from "react";
import { Archive, ArrowCounterClockwise, X } from "@phosphor-icons/react";
import { useBackupStatus } from "./useBackupStatus";
import { ConfirmDialog } from "../../ui/ConfirmDialog";

export function RestoreWizard({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restoring, setRestoring] = useState("");
  const [confirmFile, setConfirmFile] = useState("");
  const api = useBackupStatus();

  useEffect(() => {
    api.list().then(setFiles).catch(() => setError("无法读取备份列表")).finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const restore = async (file: string) => {
    setRestoring(file);
    setError("");
    try {
      await api.restore(file);
      onDone();
    } catch {
      setError("恢复失败，请确认备份文件完整。当前数据未被修改。");
      setRestoring("");
    }
  };

  return (
    <div className="modal-scrim" onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}>
      <section className="restore-panel" role="dialog" aria-label="恢复">
        <header className="modal__head">
          <Archive size={18} weight="duotone" />
          <span className="modal__title">恢复备份</span>
          <button className="btn-icon" onClick={onClose} aria-label="关闭恢复" title="关闭恢复"><X size={15} /></button>
        </header>
        <div className="restore-panel__body">
          {loading && <div className="skeleton-list"><span /><span /><span /></div>}
          {!loading && files.length === 0 && <div className="search-empty"><Archive size={22} /><span>还没有可用备份</span></div>}
          {error && <div className="inline-error">{error}</div>}
          <ul className="backup-list">
            {files.map((file) => {
              const name = file.split(/[\\/]/).pop() ?? file;
              return (
                <li key={file}>
                  <div><strong>{name}</strong><small>{file}</small></div>
                  <button className="btn btn-ghost" disabled={Boolean(restoring)} onClick={() => setConfirmFile(file)}>
                    <ArrowCounterClockwise size={15} />{restoring === file ? "正在恢复" : "恢复"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
      <ConfirmDialog
        open={Boolean(confirmFile)}
        title="恢复这个备份？"
        description="应用将重启并使用所选备份替换当前数据，恢复前会保留一份现有数据库副本。"
        confirmLabel="确认恢复"
        confirmAriaLabel="确认恢复备份"
        busy={Boolean(restoring)}
        onCancel={() => setConfirmFile("")}
        onConfirm={() => restore(confirmFile)}
      />
    </div>
  );
}
