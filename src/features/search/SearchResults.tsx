import type { SearchHit } from "./SearchProvider";

interface SearchResultsProps {
  hits: SearchHit[];
  onOpen: (id: number) => void;
}

export function SearchResults({ hits, onOpen }: SearchResultsProps) {
  return (
    <ul role="listbox" aria-label="搜索结果">
      {hits.map(h => (
        <li key={h.id}>
          <button onClick={() => onOpen(h.id)}>
            {h.title ?? "Untitled"} — {h.snippet}
          </button>
        </li>
      ))}
    </ul>
  );
}
