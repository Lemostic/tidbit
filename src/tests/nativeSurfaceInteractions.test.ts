import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "src/styles/globals.css"), "utf8");

describe("desktop-native interaction surface", () => {
  it("disables browser-like selection and dragging outside editable fields", () => {
    expect(css).toMatch(/#root,\s*#root \*\s*\{[^}]*-webkit-user-select:\s*none;[^}]*user-select:\s*none;/s);
    expect(css).toMatch(/#root img,\s*#root svg\s*\{[^}]*-webkit-user-drag:\s*none;/s);
    expect(css).toMatch(/#root input,\s*#root textarea,\s*#root \[contenteditable="true"\][^{]*\{[^}]*-webkit-user-select:\s*text;[^}]*user-select:\s*text;/s);
  });
});
