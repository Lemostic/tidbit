import { ArrowsDownUp, SortAscending, SortDescending } from "@phosphor-icons/react";
import type { NoteSortField, NoteSortPreference } from "./noteSort";
import { useI18n } from "../../i18n";

interface NoteSortControlProps {
  preference: NoteSortPreference;
  onChange: (preference: NoteSortPreference) => void;
}

function naturalDirection(field: NoteSortField): NoteSortPreference["direction"] {
  return field === "title" ? "asc" : "desc";
}

export function NoteSortControl({ preference, onChange }: NoteSortControlProps) {
  const { t } = useI18n();
  const label = preference.field === "manual" ? t("sort.drag") : preference.field === "title" ? t(preference.direction === "asc" ? "sort.titleAsc" : "sort.titleDesc") : t(preference.direction === "desc" ? "sort.newest" : "sort.oldest");
  return (
    <div className="notes__sortbar" aria-label={t("sort.label")}>
      <span className="notes__sort-label"><ArrowsDownUp size={13} />{t("sort.label")}</span>
      <select
        className="notes__sort-select"
        aria-label={t("sort.field")}
        value={preference.field}
        onChange={(event) => {
          const field = event.target.value as NoteSortField;
          onChange({ field, direction: naturalDirection(field) });
        }}
      >
        <option value="updated_at">{t("sort.updated")}</option>
        <option value="created_at">{t("sort.created")}</option>
        <option value="title">{t("sort.title")}</option>
      </select>
      <button
        type="button"
        className="notes__sort-direction"
        disabled={preference.field === "manual"}
        aria-label={t("sort.direction", { label })}
        title={t(preference.field === "manual" ? "sort.dragHint" : "sort.toggleHint")}
        onClick={() => onChange({ ...preference, direction: preference.direction === "asc" ? "desc" : "asc" })}
      >
        {preference.direction === "asc" ? <SortAscending size={14} /> : <SortDescending size={14} />}
        <span>{label}</span>
      </button>
    </div>
  );
}
