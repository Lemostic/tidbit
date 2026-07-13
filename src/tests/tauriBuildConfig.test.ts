import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

describe("Tauri production build", () => {
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
});
