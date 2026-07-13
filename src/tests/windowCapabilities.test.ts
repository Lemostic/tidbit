import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

describe("desktop window capabilities", () => {
  test("allows the custom titlebar to drag and control the main window", () => {
    const capabilityPath = resolve(process.cwd(), "src-tauri/capabilities/default.json");
    const capability = JSON.parse(readFileSync(capabilityPath, "utf8")) as {
      windows: string[];
      permissions: string[];
    };

    expect(capability.windows).toContain("main");
    expect(capability.windows).toContain("wander-*");
    expect(capability.windows).toContain("wander-editor-*");
    expect(capability.permissions).toEqual(expect.arrayContaining([
      "core:event:allow-listen",
      "core:event:allow-unlisten",
      "core:event:allow-emit",
      "core:window:allow-start-dragging",
      "core:window:allow-current-monitor",
      "core:window:allow-outer-position",
      "core:window:allow-outer-size",
      "core:window:allow-set-size",
      "core:window:allow-toggle-maximize",
    ]));
  });
});
