import { invoke } from "@tauri-apps/api/core";

export interface SearchHit {
    id: number;
    group_id: number | null;
    title: string | null;
    snippet: string;
    terms: string[];
    score: number;
}

export interface SearchOptions {
    tag?: string | undefined;
    includeArchived?: boolean;
}

export const SearchProvider = {
    query: (q: string, options: SearchOptions = {}) =>
        invoke<SearchHit[]>("search_query", { q, tag: options.tag ?? null, includeArchived: options.includeArchived ?? false }),
};
