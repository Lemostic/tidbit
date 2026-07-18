import { ArrowsDownUp, SortAscending, SortDescending } from "@phosphor-icons/react";
import type { NoteSortField, NoteSortPreference } from "./noteSort";

interface NoteSortControlProps {
  preference: NoteSortPreference;
  onChange: (preference: NoteSortPreference) => void;
}

function naturalDirection(field: NoteSortField): NoteSortPreference["direction"] {
  return field === "title" ? "asc" : "desc";
}

export function NoteSortControl({ preference, onChange }: NoteSortControlProps) {
  const label = preference.field === "updated_at"
    ? (preference.direction === "desc" ? "更新时间（新到旧）" : "更新时间（旧到新）")
    : preference.field === "created_at"
      ? (preference.direction === "desc" ? "创建时间（新到旧）" : "创建时间（旧到新）")
      : (preference.direction === "asc" ? "标题（A 到 Z）" : "标题（Z 到 A）");

  return (
    <div className="notes__sortbar" aria-label="便签排序">
      <span className="notes__sort-label"><ArrowsDownUp size={13} />排序</span>
      <select
        className="notes__sort-select"
        aria-label="排序字段"
        value={preference.field}
        onChange={(event) => {
          const field = event.target.value as NoteSortField;
          onChange({ field, direction: naturalDirection(field) });
        }}
      >
        <option value="updated_at">更新时间</option>
        <option value="created_at">创建时间</option>
        <option value="title">标题名称</option>
      </select>
      <button
        type="button"
        className="notes__sort-direction"
        aria-label={`当前排序：${label}，点击切换方向`}
        title={`当前排序：${label}，点击切换方向`}
        onClick={() => onChange({ ...preference, direction: preference.direction === "asc" ? "desc" : "asc" })}
      >
        {preference.direction === "asc" ? <SortAscending size={14} /> : <SortDescending size={14} />}
        <span>{label}</span>
      </button>
    </div>
  );
}
