import type { SearchHit } from "./SearchProvider";
import { FileText, MagnifyingGlass } from "@phosphor-icons/react";

interface SearchResultsProps {
  hits: SearchHit[];
  onOpen: (id: number) => void;
}

export function SearchResults({ hits, onOpen }: SearchResultsProps) {
  if (hits.length === 0) {
    return <div className="search-empty"><MagnifyingGlass size={20} /><span>没有找到匹配便签</span></div>;
  }
  return (
    <ul role="listbox" aria-label="搜索结果" className="search-results">
      {hits.map(h => (
        <li key={h.id} className="search-result">
          <button onClick={() => onOpen(h.id)}>
            <FileText size={16} weight="duotone" />
            <span>
              <strong>{h.title ?? "无标题"}</strong>
              <small>{h.snippet || "空白便签"}</small>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
