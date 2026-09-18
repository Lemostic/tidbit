import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import changelogMarkdown from "../../CHANGELOG.md?raw";
import packageJsonRaw from "../../package.json?raw";
import {
  CHANGELOG_SEEN_KEY,
  markChangelogSeen,
  parseLatestChangelog,
  shouldShowChangelog,
} from "../features/changelog/changelog";
import { ChangelogDialog } from "../features/changelog/ChangelogDialog";
import { useChangelogOnUpdate } from "../features/changelog/useChangelogOnUpdate";

function ChangelogProbe() {
  const { entry, dismiss } = useChangelogOnUpdate();
  return (
    <div>
      <div data-testid="changelog-probe">{entry?.version ?? "none"}</div>
      <button type="button" onClick={dismiss}>dismiss</button>
    </div>
  );
}

describe("changelog helpers", () => {
  it("parses only the latest released version section", () => {
    const markdown = [
      "# Changelog",
      "",
      "## [Unreleased]",
      "",
      "- 未发布内容",
      "",
      "## [0.2.1] - 2026-08-02",
      "",
      "### 新增",
      "",
      "- 新功能。",
      "- 另一个改进。",
      "",
      "### 修复",
      "",
      "- 修复问题。",
      "",
      "## [0.2.0] - 2026-08-01",
      "",
      "- 旧版本内容。",
    ].join("\n");

    expect(parseLatestChangelog(markdown)).toEqual({
      version: "0.2.1",
      date: "2026-08-02",
      body: "### 新增\n\n- 新功能。\n- 另一个改进。\n\n### 修复\n\n- 修复问题。",
    });
  });

  it("remembers the version that was already shown", () => {
    const storage = {
      getItem: vi.fn(() => "0.2.1" as string | null),
      setItem: vi.fn(),
    };

    expect(shouldShowChangelog("0.2.1", storage)).toBe(false);
    expect(shouldShowChangelog("0.2.0", storage)).toBe(true);
    markChangelogSeen("0.2.0", storage);
    expect(storage.setItem).toHaveBeenCalledWith(CHANGELOG_SEEN_KEY, "0.2.0");
  });

  it("bundles a section for the current app version", () => {
    const appVersion = (JSON.parse(packageJsonRaw) as { version: string }).version;
    expect(parseLatestChangelog(changelogMarkdown)?.version).toBe(appVersion);
  });

  it("shows the bundled release once until it is dismissed", async () => {
    localStorage.clear();
    const appVersion = (JSON.parse(packageJsonRaw) as { version: string }).version;
    const first = render(<ChangelogProbe />);
    await waitFor(() => expect(screen.getByTestId("changelog-probe")).toHaveTextContent(appVersion));
    expect(localStorage.getItem(CHANGELOG_SEEN_KEY)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "dismiss" }));
    expect(localStorage.getItem(CHANGELOG_SEEN_KEY)).toBe(appVersion);

    first.unmount();
    render(<ChangelogProbe />);
    expect(screen.getByTestId("changelog-probe")).toHaveTextContent("none");
  });
});

describe("ChangelogDialog", () => {
  it("renders the latest release only and closes", () => {
    const onClose = vi.fn();
    render(
      <ChangelogDialog
        entry={{
          version: "0.2.1",
          date: "2026-08-02",
          body: "### 新增\n\n- 新功能。\n- 修复问题。",
        }}
        onClose={onClose}
      />,
    );

    expect(screen.getByRole("dialog", { name: "新版本 v0.2.1" })).toBeInTheDocument();
    expect(screen.getByText("新功能。")).toBeInTheDocument();
    expect(screen.getByText("修复问题。")).toBeInTheDocument();
    expect(screen.queryByText("旧版本内容。")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "知道了" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders nothing without an entry", () => {
    const { container } = render(<ChangelogDialog entry={null} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});
