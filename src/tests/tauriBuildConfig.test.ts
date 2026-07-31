import { existsSync, readFileSync } from "node:fs";
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
    expect(config.app.windows[0]).toMatchObject({ width: 780, height: 1100, center: true });
  });

  test("uses tidbit as the application data directory identifier", () => {
    const configPath = resolve(process.cwd(), "src-tauri/tauri.conf.json");
    const config = JSON.parse(readFileSync(configPath, "utf8")) as {
      identifier: string;
      app: Record<string, unknown>;
    };
    expect(config.identifier).toBe("tidbit");
    expect(config.app).not.toHaveProperty("macOSPrivateApi");
  });

  test("allows locally recorded audio without broadening script access", () => {
    const configPath = resolve(process.cwd(), "src-tauri/tauri.conf.json");
    const config = JSON.parse(readFileSync(configPath, "utf8")) as { app: { security: { csp: string } } };
    expect(config.app.security.csp).toContain("media-src 'self' data: blob:");
    expect(config.app.security.csp).toContain("script-src 'self'");
  });

  test("uses a native transparent macOS shell and GitHub distribution identity", () => {
    const config = JSON.parse(readFileSync(
      resolve(process.cwd(), "src-tauri/tauri.macos.conf.json"),
      "utf8",
    )) as {
      identifier: string;
      app: {
        macOSPrivateApi: boolean;
        windows: Array<{
          decorations: boolean;
          titleBarStyle: string;
          hiddenTitle: boolean;
          transparent: boolean;
          shadow: boolean;
        }>;
      };
      bundle: {
        targets: string[];
        icon: string[];
        macOS: { minimumSystemVersion: string; infoPlist: string };
      };
    };

    expect(config.identifier).toBe("com.tidbit.app");
    expect(config.app.macOSPrivateApi).toBe(true);
    expect(config.app.windows[0]).toMatchObject({
      decorations: true,
      titleBarStyle: "Overlay",
      hiddenTitle: true,
      transparent: true,
      shadow: true,
    });
    expect(config.bundle.targets).toEqual(["app", "dmg"]);
    expect(config.bundle.macOS.minimumSystemVersion).toBe("12.0");
    expect(config.bundle.macOS.infoPlist).toBe("Info.plist");
    expect(config.bundle.icon).toContain("icons/icon.icns");
  });

  test("enables transparent macOS windows and declares microphone access", () => {
    const cargoManifest = readFileSync(resolve(process.cwd(), "src-tauri/Cargo.toml"), "utf8");
    const infoPlist = readFileSync(resolve(process.cwd(), "src-tauri/Info.plist"), "utf8");

    expect(cargoManifest).toContain('"macos-private-api"');
    expect(infoPlist).toContain("<key>NSMicrophoneUsageDescription</key>");
    expect(infoPlist).toMatch(/<string>[^<]+<\/string>/);
    expect(existsSync(resolve(process.cwd(), "src-tauri/icons/icon.icns"))).toBe(true);
  });
});
