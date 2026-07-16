import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

describe("Tauri production build", () => {
  test("uses v0.1.2 consistently", () => {
    const packageConfig = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as { version: string };
    const tauriConfig = JSON.parse(readFileSync(resolve(process.cwd(), "src-tauri/tauri.conf.json"), "utf8")) as { version: string };
    const cargoManifest = readFileSync(resolve(process.cwd(), "src-tauri/Cargo.toml"), "utf8");

    expect(packageConfig.version).toBe("0.1.2");
    expect(tauriConfig.version).toBe(packageConfig.version);
    expect(cargoManifest).toMatch(/^version = "0\.1\.2"$/m);
  });

  test("rebuilds the frontend before packaging", () => {
    const configPath = resolve(process.cwd(), "src-tauri/tauri.conf.json");
    const config = JSON.parse(readFileSync(configPath, "utf8")) as {
      build?: { beforeBuildCommand?: string };
    };

    expect(config.build?.beforeBuildCommand).toBe("pnpm build");
  });

  test("uses the roomier default window size", () => {
    const configPath = resolve(process.cwd(), "src-tauri/tauri.conf.json");
    const config = JSON.parse(readFileSync(configPath, "utf8")) as {
      app: { windows: Array<{ width: number; height: number; center: boolean }> };
    };
    expect(config.app.windows[0]).toMatchObject({ width: 500, height: 780, center: true });
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
});
