import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

test("opens settings when the desktop application menu requests it", () => {
  const appSource = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");

  expect(appSource).toContain('listen("tidbit://open-settings"');
});

test("returns before every auto-hide command when the capability is unavailable", () => {
  const appSource = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");

  expect(appSource).toContain([
    "if (!profile.capabilities.edgeAutoHide) return;",
    "    if (!dockingEnabled || interactionLocked) {",
  ].join("\n"));
  expect(appSource).toContain("profile.capabilities.edgeAutoHide && <EdgePresence");
});
