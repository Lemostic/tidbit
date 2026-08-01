import { Fragment } from "react";
import type { SearchHit } from "./SearchProvider";
import { FileText, MagnifyingGlass } from "@phosphor-icons/react";

function splitByTerms(text: string, terms: string[]): string[] {
  const needles = [...new Set(terms.map((t) => t.toLowerCase()).filter((t) => t.length > 0))].sort(
    (a, b) => b.length - a.length,
  );
  if (needles.length === 0) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    const found = needles
      .map((needle) => {
        const idx = remaining.toLowerCase().indexOf(needle);
        return { needle, idx };
      })
      .filter((entry) => entry.idx >= 0)
      .sort((a, b) => a.idx - b.idx)[0];
    if (!found) {
      chunks.push(remaining);
      break;
    }
    if (found.idx > 0) chunks.push(remaining.slice(0, found.idx));
    chunks.push(remaining.slice(found.idx, found.idx + found.needle.length));
    remaining = remaining.slice(found.idx + found.needle.length);
  }
  return chunks.filter((chunk) => chunk.length > 0);
}

interface HighlightedSnippetProps {
  hit: SearchHit;
}

function HighlightedSnippet({ hit }: HighlightedSnippetProps) {
  const chunks = splitByTerms(hit.snippet, hit.terms);
  const isMatch = (chunk: string) =>
    hit.terms.some((t) => t.length > 0 && chunk.toLowerCase() === t.toLowerCase());
  return (
    <>
      {chunks.map((chunk, index) =>
        isMatch(chunk) ? (
          <mark key={index} className="search-result__mark">{chunk}</mark>
        ) : (
          <Fragment key={index}>{chunk}</Fragment>
        ),
      )}
    </>
  );
}

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
      {hits.map((h) => (
        <li key={h.id} className="search-result">
          <button onClick={() => onOpen(h.id)}>
            <FileText size={16} weight="duotone" />
            <span>
              <strong>{h.title ?? "无标题"}</strong>
              <small><HighlightedSnippet hit={h} /></small>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
