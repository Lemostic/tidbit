import { invoke } from "@tauri-apps/api/core";

export interface SearchHit {
    id: number;
    group_id: number | null;
    title: string | null;
    snippet: string;
}

export const SearchProvider = {
    query: (q: string) => invoke<SearchHit[]>("search_query", { q }),
};
