import { useCallback, useEffect, useState } from "react";
import { client } from "../../ipc/client";
import type { Group } from "../../ipc/types";

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try { setGroups(await client.groups.list()); }
    catch { setError("分组加载失败"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return {
    groups,
    loading,
    error,
    create: async (name: string) => { const group = await client.groups.create(name); await refresh(); return group; },
    update: async (id: number, name: string, color: string | null, backgroundColor: string | null) => { const group = await client.groups.update(id, name, color, backgroundColor); await refresh(); return group; },
    remove: async (id: number) => { await client.groups.delete(id); await refresh(); },
    refresh,
  };
}
