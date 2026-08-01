import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { disableDefaultContextMenu } from "./app/disableDefaultContextMenu";
import { WanderNote } from "./features/notes/WanderNote";
import { WanderEditor } from "./features/notes/WanderEditor";
import { DetachedNote } from "./features/notes/DetachedNote";
import { applyGlassEffect, applyGlassOpacity, loadGlassEffect, loadGlassOpacity } from "./ui/glassEffect";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { resolveWindowMode } from "./app/windowMode";

disableDefaultContextMenu();
applyGlassEffect(loadGlassEffect());
applyGlassOpacity(loadGlassOpacity());
let mode: ReturnType<typeof resolveWindowMode> = { kind: "main" };
try {
  mode = resolveWindowMode(getCurrentWindow().label);
} catch {
  // Tauri window internals may not be ready on every webview (e.g. freshly
  // created detached windows). Fall back to the main app instead of a blank
  // screen when the label cannot be resolved.
  mode = { kind: "main" };
}
const wanderOpacity = Number(localStorage.getItem("wander-opacity") ?? "88");
if (mode.kind !== "main") document.documentElement.dataset.window = mode.kind;
createRoot(document.getElementById("root")!).render(
  mode.kind === "wander"
    ? <WanderNote noteId={mode.noteId} initialOpacity={wanderOpacity} />
    : mode.kind === "wander-editor"
      ? <WanderEditor noteId={mode.noteId} />
      : mode.kind === "detach"
        ? <DetachedNote noteId={mode.noteId} />
      : <App />,
);
