import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it("ships separate high-resolution application and tray icon assets", () => {
  const appIcon = readFileSync(resolve(process.cwd(), "src-tauri/icons/icon.png"));
  const trayIcon = readFileSync(resolve(process.cwd(), "src-tauri/icons/tray-icon.png"));
  const ico = readFileSync(resolve(process.cwd(), "src-tauri/icons/icon.ico"));
  expect(appIcon.length).toBeGreaterThan(20_000);
  expect(trayIcon.length).toBeGreaterThan(500);
  expect(ico.length).toBeGreaterThan(20_000);
  expect(readFileSync(resolve(process.cwd(), "src-tauri/src/tray.rs"), "utf8")).toContain("icons/tray-icon.png");
});
