import type { SearchHit } from "./SearchProvider";
import { FileText, MagnifyingGlass } from "@phosphor-icons/react";
import { useI18n } from "../../i18n";

interface SearchResultsProps {
  hits: SearchHit[];
  onOpen: (id: number) => void;
}

export function SearchResults({ hits, onOpen }: SearchResultsProps) {
  const { t } = useI18n();
  if (hits.length === 0) {
    return <div className="search-empty"><MagnifyingGlass size={20} /><span>{t("search.empty")}</span></div>;
  }
  return (
    <ul role="listbox" aria-label={t("search.results")} className="search-results">
      {hits.map(h => (
        <li key={h.id} className="search-result">
          <button onClick={() => onOpen(h.id)}>
            <FileText size={16} weight="duotone" />
            <span>
              <strong>{h.title ?? t("notes.untitled")}</strong>
              <small>{h.snippet || t("search.blank")}</small>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
