import { useCallback, useState } from "react";
import { SearchProvider } from "./SearchProvider";
import { useI18n } from "../../i18n";

export type { SearchHit as Hit } from "./SearchProvider";

export function useSearch() {
    const { t } = useI18n();
    const [hits, setHits] = useState<ReturnType<typeof SearchProvider.query> extends Promise<infer T> ? T : never>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const query = useCallback(async (q: string) => {
        setLoading(true);
        setError("");
        try {
            setHits(await SearchProvider.query(q));
        } catch {
            setHits([]);
            setError(t("search.failed"));
        } finally {
            setLoading(false);
        }
    }, [t]);

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
