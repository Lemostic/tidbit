import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveWindowMode, shouldUseOneNoteLayout } from "../app/windowMode";

describe("wander window routing", () => {
  it("derives note ids from Tauri window labels", () => {
    expect(resolveWindowMode("main")).toEqual({ kind: "main" });
    expect(resolveWindowMode("wander-18")).toEqual({ kind: "wander", noteId: 18 });
    expect(resolveWindowMode("wander-editor-18")).toEqual({ kind: "wander-editor", noteId: 18 });
    expect(resolveWindowMode("clothesline")).toEqual({ kind: "clothesline" });
  });

  it("uses OneNote columns for maximized and fullscreen windows", () => {
    expect(shouldUseOneNoteLayout(1024, false, false)).toBe(false);
    expect(shouldUseOneNoteLayout(1024, true, false)).toBe(true);
    expect(shouldUseOneNoteLayout(1024, false, true)).toBe(true);
    expect(shouldUseOneNoteLayout(1280, false, false)).toBe(false);
    expect(shouldUseOneNoteLayout(900, true, true)).toBe(true);
    expect(shouldUseOneNoteLayout(900, true, false)).toBe(true);
    expect(shouldUseOneNoteLayout(900, false, true)).toBe(true);
    expect(shouldUseOneNoteLayout(500, false, true)).toBe(true);
    expect(shouldUseOneNoteLayout(900, false, false)).toBe(false);
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

  it("ships a clothesline IPC module with the right entry points", () => {
    const rust = readFileSync(resolve(process.cwd(), "src-tauri/src/ipc/clothesline.rs"), "utf8");
    expect(rust).toContain("pub async fn clothesline_open");
    expect(rust).toContain("pub fn clothesline_close");
    expect(rust).toContain("pub async fn clothesline_toggle");
    expect(rust).toContain("pub fn clothesline_set_notes");
    expect(rust).toContain("pub fn clothesline_list");
    expect(rust).toContain("pub fn clothesline_is_open");
    expect(rust).toContain('WebviewUrl::App(std::path::PathBuf::from("index.html"))');
    expect(rust).toContain("tidbit://clothesline-changed");
  });

  it("includes clothesline in the default capabilities window allowlist", () => {
    const json = readFileSync(resolve(process.cwd(), "src-tauri/capabilities/default.json"), "utf8");
    expect(json).toContain('"clothesline"');
  });
});
