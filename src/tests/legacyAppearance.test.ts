import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it("keeps the rail canvas transparent while group tabs retain solid fallbacks", () => {
  const globalCss = readFileSync(resolve(process.cwd(), "src/styles/globals.css"), "utf8");
  const groupCss = readFileSync(resolve(process.cwd(), "src/features/groups/groups.css"), "utf8");

  expect(globalCss).toContain("html, body, #root { height: 100%; margin: 0; background: transparent; }");
  expect(globalCss).not.toContain(':root[data-runtime="tauri"][data-liquid-glass][data-liquid-glass-solid] body');
  expect(globalCss).toContain("border-left: 0");
  expect(groupCss).toContain("background: var(--group-tab-bg, var(--tab-idle-bg));");
  expect(groupCss).toContain("@supports (background: color-mix(in srgb, white 50%, black))");
});
