import { useState } from "react";
import { SearchProvider } from "./SearchProvider";

export type { SearchHit as Hit } from "./SearchProvider";

export function useSearch() {
    const [hits, setHits] = useState<ReturnType<typeof SearchProvider.query> extends Promise<infer T> ? T : never>([]);

    return {
        hits,
        query: (q: string) => SearchProvider.query(q).then(setHits),
    };
}
