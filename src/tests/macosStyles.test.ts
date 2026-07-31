import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

test("loads an isolated macOS stylesheet after the shared styles", () => {
  const html = readFileSync(resolve(process.cwd(), "src/index.html"), "utf8");

  expect(html).toContain('<link rel="stylesheet" href="./styles/macos.css" />');
  expect(html.indexOf("./styles/macos.css")).toBeGreaterThan(html.indexOf("./styles/apple.css"));
});

test("roots every macOS style rule at the platform attribute", () => {
  const css = readFileSync(resolve(process.cwd(), "src/styles/macos.css"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const selectors = Array.from(css.matchAll(/(?:^|})\s*([^@][^{]+)\{/g), (match) => match[1] ?? "")
    .flatMap((selector) => selector.split(","))
    .map((selector) => selector.trim());

  expect(selectors.length).toBeGreaterThan(0);
  expect(selectors.every((selector) => selector.startsWith(':root[data-platform="macos"]'))).toBe(true);
});
