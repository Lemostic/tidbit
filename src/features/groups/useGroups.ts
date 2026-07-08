import { useEffect, useState } from "react";
import { client } from "../../ipc/client";
import type { Group } from "../../ipc/types";

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const refresh = () => client.groups.list().then(setGroups);
  useEffect(() => { refresh(); }, []);
  return {
    groups,
    create: async (name: string) => {
      const g = await client.groups.create(name);
      await refresh();
      return g;
    },
    refresh,
  };
}
