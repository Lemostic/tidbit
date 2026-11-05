export interface ChangelogEntry {
  version: string;
  date: string | null;
  body: string;
}

export interface ChangelogStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const CHANGELOG_SEEN_KEY = "changelog-seen-version";

const VERSION_HEADING = /^##\s+\[([^\]]+)\](?:\s+-\s+(.*))?$/;
const DATE_IN_HEADING = /-\s*(\d{4}-\d{2}-\d{2})/;

export function parseLatestChangelog(markdown: string): ChangelogEntry | null {
  const lines = markdown.split(/\r?\n/);
  let start = -1;
  let end = lines.length;

  for (let index = 0; index < lines.length; index += 1) {
    const heading = lines[index]?.match(VERSION_HEADING);
    if (!heading?.[1]) continue;
    if (/unreleased/i.test(heading[1])) continue;
    start = index;
    break;
  }

  if (start < 0) return null;

  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^##\s+\[/.test(lines[index] ?? "")) {
      end = index;
      break;
    }
  }

  const headingLine = lines[start] ?? "";
  const version = headingLine.match(/^##\s+\[([^\]]+)\]/)?.[1]?.trim() ?? "";
  const date = headingLine.match(DATE_IN_HEADING)?.[1] ?? null;
  const body = lines.slice(start + 1, end).join("\n").trim();

  return version ? { version, date, body } : null;
}

export function shouldShowChangelog(version: string, storage: ChangelogStorage = window.localStorage): boolean {
  return Boolean(version) && storage.getItem(CHANGELOG_SEEN_KEY) !== version;
}

export function markChangelogSeen(version: string, storage: ChangelogStorage = window.localStorage): void {
  storage.setItem(CHANGELOG_SEEN_KEY, version);
}
