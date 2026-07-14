import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it("keeps new-group input text, caret, and placeholder visible on the dark rail", () => {
  const css = readFileSync(resolve(process.cwd(), "src/features/groups/groups.css"), "utf8");
  const inputBlock = css.match(/\.groups-rail__new \{([\s\S]*?)\n\}/)?.[1] ?? "";

  expect(inputBlock).toContain("color: var(--rail-fg)");
  expect(inputBlock).toContain("caret-color: #ffffff");
  expect(css).toContain(".groups-rail__new::placeholder");
  expect(css).toContain(".groups-rail__new:focus");
});
