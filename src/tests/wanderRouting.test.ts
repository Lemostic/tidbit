import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveWindowMode } from "../app/windowMode";

describe("wander window routing", () => {
  it("derives note ids from Tauri window labels", () => {
    expect(resolveWindowMode("main")).toEqual({ kind: "main" });
    expect(resolveWindowMode("wander-18")).toEqual({ kind: "wander", noteId: 18 });
    expect(resolveWindowMode("wander-editor-18")).toEqual({ kind: "wander-editor", noteId: 18 });
  });

  it("creates dynamic WebView2 windows asynchronously with the bundled app entry", () => {
    const rust = readFileSync(resolve(process.cwd(), "src-tauri/src/ipc/wander.rs"), "utf8");
    expect(rust).toContain("pub async fn wander_open");
    expect(rust).toContain("pub async fn wander_editor_open");
    expect(rust).toContain('WebviewUrl::App(PathBuf::from("index.html"))');
    expect(rust).toContain(".visible(false)");
    expect(rust).toContain("pub fn wander_ready");
    expect(rust).toContain("snap_wander_window");
    expect(rust).toContain("schedule_wander_snap");
    expect(rust).toContain("WANDER_SNAP_DELAY");
    expect(rust).not.toContain("navigate_when_ready");
    expect(rust).not.toContain("WebviewUrl::External");
  });
});
