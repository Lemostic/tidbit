import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it("keeps the search control on one line and removes the shortcut before the titlebar becomes cramped", () => {
  const css = readFileSync(resolve(process.cwd(), "src/styles/globals.css"), "utf8");
  const searchBlock = css.match(/\.titlebar__search \{([\s\S]*?)\n\}/)?.[1] ?? "";

  expect(searchBlock).toContain("white-space: nowrap");
  expect(searchBlock).toContain("min-width: 0");
  expect(css).toMatch(/@media \(max-width: 520px\)[\s\S]*?\.titlebar__kbd \{ display: none; \}/);
});
