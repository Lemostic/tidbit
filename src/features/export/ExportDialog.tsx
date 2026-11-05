import { CircleNotch, Export, FilePdf, FileText, FolderSimple, X } from "@phosphor-icons/react";
import { useEffect, useState, type KeyboardEvent, useRef } from "react";
import type { Group } from "../../ipc/types";
import { client, type ExportFormat, type ExportResult, type ExportScope } from "../../ipc/client";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  onDone: (result: ExportResult) => void;
}

export function ExportDialog({ open, onClose, onDone }: ExportDialogProps) {
  const [scope, setScope] = useState<ExportScope>("all");
  const [groupId, setGroupId] = useState<number | undefined>();
  const [format, setFormat] = useState<ExportFormat>("markdown");
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<ExportResult | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaved(null);
    setBusy(false);
    closeRef.current?.focus({ preventScroll: true });
    void client.groups.list().then((next) => {
      setGroups(next);
      setGroupId((current) => current ?? next[0]?.id);
    }).catch(() => setError("无法读取分组列表"));
  }, [open]);

  if (!open) return null;

  const submit = async () => {
    if (scope === "group" && groupId === undefined) {
      setError("请选择要导出的分组");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await client.exports.run({
        scope,
        format,
        includeMetadata,
        ...(scope === "group" && groupId !== undefined ? { groupId } : {}),
      });
      if (result) {
        setSaved(result);
        onDone(result);
      }
    } catch {
      setError("导出失败，请检查目标路径和磁盘空间");
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !busy) onClose();
  };

  return (
    <div className="modal-scrim export-dialog-scrim" onKeyDown={handleKeyDown} onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section className="export-dialog" role="dialog" aria-modal="true" aria-labelledby="export-dialog-title" onClick={(event) => event.stopPropagation()}>
        <header className="export-dialog__head">
          <div className="export-dialog__title"><span className="settings-panel__eyebrow">TIDBIT / MAINTENANCE</span><h2 id="export-dialog-title">导出便签</h2></div>
          <button ref={closeRef} className="btn-icon" onClick={onClose} disabled={busy} aria-label="关闭导出" title="关闭导出"><X size={16} weight="bold" /></button>
        </header>
        <div className="export-dialog__body">
          <div className="export-dialog__intro"><Export size={18} /><span>保留分组、标题和正文层级，生成可继续编辑的文档。</span></div>
          <fieldset className="export-dialog__field">
            <legend>导出范围</legend>
            <div className="export-dialog__segmented" role="radiogroup" aria-label="导出范围">
              <button type="button" className={scope === "all" ? "is-active" : ""} onClick={() => setScope("all")} aria-pressed={scope === "all"}>全部便签</button>
              <button type="button" className={scope === "group" ? "is-active" : ""} onClick={() => setScope("group")} aria-pressed={scope === "group"}>指定分组</button>
              <button type="button" className={scope === "ungrouped" ? "is-active" : ""} onClick={() => setScope("ungrouped")} aria-pressed={scope === "ungrouped"}>未分组</button>
            </div>
            {scope === "group" && <label className="export-dialog__select-label"><FolderSimple size={16} /><span>分组</span><select className="select" value={groupId ?? ""} onChange={(event) => setGroupId(Number(event.target.value))} disabled={groups.length === 0}><option value="" disabled>选择分组</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>}
          </fieldset>
          <fieldset className="export-dialog__field">
            <legend>文件格式</legend>
            <div className="export-dialog__format-grid">
              <button type="button" className={`export-dialog__format ${format === "markdown" ? "is-active" : ""}`} onClick={() => setFormat("markdown")} aria-pressed={format === "markdown"}><FileText size={21} /><span><strong>Markdown</strong><small>适合继续编辑和版本管理</small></span></button>
              <button type="button" className={`export-dialog__format ${format === "pdf" ? "is-active" : ""}`} onClick={() => setFormat("pdf")} aria-pressed={format === "pdf"}><FilePdf size={21} /><span><strong>PDF</strong><small>适合打印和分享</small></span></button>
            </div>
          </fieldset>
          <label className="export-dialog__checkbox"><input type="checkbox" checked={includeMetadata} onChange={(event) => setIncludeMetadata(event.target.checked)} /><span><strong>导出标签元数据</strong><small>创建时间、更新时间、归档、置顶、隐私状态和字数</small></span></label>
          {error && <p className="export-dialog__message is-error" role="alert">{error}</p>}
          {saved && <p className="export-dialog__message is-success" role="status">已导出 {saved.noteCount} 条便签：{saved.path}</p>}
        </div>
        <footer className="export-dialog__foot"><button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>取消</button><button type="button" className="btn btn-primary" onClick={() => void submit()} disabled={busy || (scope === "group" && groups.length === 0)}>{busy ? <><CircleNotch className="is-spinning" size={16} />正在生成</> : <><Export size={16} />选择位置并导出</>}</button></footer>
      </section>
    </div>
  );
}
