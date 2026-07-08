import { Titlebar } from "./app/Titlebar";
import { client } from "./ipc/client";
import { useEffect, useState } from "react";
import type { Group } from "./ipc/types";

export default function App() {
  const [groups, setGroups] = useState<Group[]>([]);
  useEffect(() => {
    client.groups.list().then(setGroups).catch(console.error);
  }, []);
  return (
    <>
      <Titlebar />
      <main style={{ padding: 16 }}>
        tidbit boot
        <pre data-testid="groups-debug">{JSON.stringify(groups, null, 2)}</pre>
      </main>
    </>
  );
}
