import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it("keeps Markdown lists compact and consistent across note surfaces", () => {
  const css = readFileSync(resolve(process.cwd(), "src/styles/globals.css"), "utf8");
  const listBlock = css.match(/\.markdown-body ul,\s*\.markdown-body ol \{([\s\S]*?)\n\}/)?.[1] ?? "";
  const nestedListBlock = css.match(/\.markdown-body li > ul,\s*\.markdown-body li > ol \{([\s\S]*?)\n\}/)?.[1] ?? "";

  expect(listBlock).toContain("padding-inline-start: 1.25em");
  expect(listBlock).toContain("margin: 0.35em 0 0.68em");
  expect(nestedListBlock).toContain("padding-inline-start: 1.16em");
  expect(css).toContain(".markdown-body li > p { margin: 0; }");
});
