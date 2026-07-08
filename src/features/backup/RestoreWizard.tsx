import { useEffect, useState } from "react";
import { useBackupStatus } from "./useBackupStatus";

export function RestoreWizard({ onDone }: { onDone: (path: string) => void }) {
  const [files, setFiles] = useState<string[]>([]);
  const api = useBackupStatus();

  useEffect(() => {
    api.list().then(setFiles);
  }, []);

  return (
    <div role="dialog" aria-label="恢复">
      <h3>选择备份</h3>
      <ul>
        {files.map((f) => (
          <li key={f}>
            <button onClick={() => api.restore(f).then(onDone)}>{f}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
