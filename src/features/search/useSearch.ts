import { useCallback, useState } from "react";
import { SearchProvider, type SearchOptions } from "./SearchProvider";

export type { SearchHit as Hit } from "./SearchProvider";

export function useSearch() {
    const [hits, setHits] = useState<ReturnType<typeof SearchProvider.query> extends Promise<infer T> ? T : never>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const query = useCallback(async (q: string, options?: SearchOptions) => {
        setLoading(true);
        setError("");
        try {
            setHits(await SearchProvider.query(q, options));
        } catch {
            setHits([]);
            setError("搜索失败，请稍后重试");
        } finally {
            setLoading(false);
        }
    }, []);

    const clear = useCallback(() => {
        setHits([]);
        setError("");
        setLoading(false);
    }, []);

    return {
        hits,
        loading,
        error,
        query,
        clear,
    };
}
