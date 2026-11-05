import { useCallback, useEffect, useState } from "react";
import changelogMarkdown from "../../../CHANGELOG.md?raw";
import packageJsonRaw from "../../../package.json?raw";
import {
  markChangelogSeen,
  parseLatestChangelog,
  shouldShowChangelog,
  type ChangelogEntry,
} from "./changelog";

const appVersion = (JSON.parse(packageJsonRaw) as { version: string }).version;

export function useChangelogOnUpdate() {
  const [entry, setEntry] = useState<ChangelogEntry | null>(null);

  useEffect(() => {
    let cancelled = false;
    const latest = parseLatestChangelog(changelogMarkdown);
    if (!latest || latest.version !== appVersion) return;
    if (!shouldShowChangelog(appVersion)) return;
    if (!cancelled) setEntry(latest);
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(() => {
    if (entry) markChangelogSeen(appVersion);
    setEntry(null);
  }, [entry]);

  return { entry, dismiss };
}
