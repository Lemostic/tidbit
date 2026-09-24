import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

describe("Tauri production build", () => {
  test("uses v0.2.10 consistently", () => {
    const packageConfig = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as { version: string };
    const tauriConfig = JSON.parse(readFileSync(resolve(process.cwd(), "src-tauri/tauri.conf.json"), "utf8")) as { version: string };
    const cargoManifest = readFileSync(resolve(process.cwd(), "src-tauri/Cargo.toml"), "utf8");

    expect(packageConfig.version).toBe("0.2.10");
    expect(tauriConfig.version).toBe(packageConfig.version);
    expect(cargoManifest).toContain(`version = "${packageConfig.version}"`);
  });

  test("keeps the taskbar icon frame large enough for Windows", () => {
    const iconPath = resolve(process.cwd(), "src-tauri/icons/icon.ico");
    const icon = readFileSync(iconPath);
    const frameCount = icon.readUInt16LE(4);

    expect(frameCount).toBeGreaterThan(0);
    const width = icon[6] === 0 ? 256 : icon[6];
    const height = icon[7] === 0 ? 256 : icon[7];
    expect(width).toBeGreaterThanOrEqual(32);
    expect(height).toBeGreaterThanOrEqual(32);
  });

  test("rebuilds the frontend before packaging", () => {
    const configPath = resolve(process.cwd(), "src-tauri/tauri.conf.json");
    const config = JSON.parse(readFileSync(configPath, "utf8")) as {
      build?: { beforeBuildCommand?: string };
    };

    expect(config.build?.beforeBuildCommand).toBe("pnpm build");
  });

  test("enables Tauri custom protocol for release builds", () => {
    const cargoManifest = readFileSync(resolve(process.cwd(), "src-tauri/Cargo.toml"), "utf8");
    expect(cargoManifest).toMatch(/^custom-protocol = \["tauri\/custom-protocol"\]$/m);
  });

  test("uses the roomier default window size", () => {
    const configPath = resolve(process.cwd(), "src-tauri/tauri.conf.json");
    const config = JSON.parse(readFileSync(configPath, "utf8")) as {
      app: { windows: Array<{ width: number; height: number; center: boolean }> };
    };
    expect(config.app.windows[0]).toMatchObject({ width: 780, height: 820, center: true });
  });

  test("uses tidbit as the application data directory identifier", () => {
    const configPath = resolve(process.cwd(), "src-tauri/tauri.conf.json");
    const config = JSON.parse(readFileSync(configPath, "utf8")) as { identifier: string };
    expect(config.identifier).toBe("tidbit");
  });

  test("allows locally recorded audio without broadening script access", () => {
    const configPath = resolve(process.cwd(), "src-tauri/tauri.conf.json");
    const config = JSON.parse(readFileSync(configPath, "utf8")) as { app: { security: { csp: string } } };
    expect(config.app.security.csp).toContain("media-src 'self' data: blob:");
    expect(config.app.security.csp).toContain("script-src 'self'");
  });

  test("allows pasted and stored images through data and Windows attachment protocol sources", () => {
    const configPath = resolve(process.cwd(), "src-tauri/tauri.conf.json");
    const config = JSON.parse(readFileSync(configPath, "utf8")) as { app: { security: { csp: string } } };
    expect(config.app.security.csp).toContain("img-src 'self' asset: data: http://tidbit-img.localhost");
    expect(config.app.security.csp).toContain("default-src 'self'");
  });

  test("allows detached notes to read and update their window size when collapsing", () => {
    const capabilityPath = resolve(process.cwd(), "src-tauri/capabilities/default.json");
    const capability = JSON.parse(readFileSync(capabilityPath, "utf8")) as { permissions: string[] };

    expect(capability.permissions).toEqual(expect.arrayContaining([
      "core:window:allow-inner-size",
      "core:window:allow-scale-factor",
      "core:window:allow-set-size",
    ]));
  });
});
