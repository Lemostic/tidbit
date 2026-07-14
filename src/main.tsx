import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { disableDefaultContextMenu } from "./app/disableDefaultContextMenu";
import { WanderNote } from "./features/notes/WanderNote";
import { WanderEditor } from "./features/notes/WanderEditor";
import { applyGlassEffect, applyGlassOpacity, loadGlassEffect, loadGlassOpacity } from "./ui/glassEffect";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { resolveWindowMode } from "./app/windowMode";

disableDefaultContextMenu();
applyGlassEffect(loadGlassEffect());
applyGlassOpacity(loadGlassOpacity());
const mode = resolveWindowMode(getCurrentWindow().label);
const wanderOpacity = Number(localStorage.getItem("wander-opacity") ?? "94");
if (mode.kind !== "main") document.documentElement.dataset.window = mode.kind;
createRoot(document.getElementById("root")!).render(
  mode.kind === "wander"
    ? <WanderNote noteId={mode.noteId} initialOpacity={wanderOpacity} />
    : mode.kind === "wander-editor"
      ? <WanderEditor noteId={mode.noteId} />
      : <App />,
);
