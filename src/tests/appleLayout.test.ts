import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "src/styles/apple.css"), "utf8");

describe("Apple layout compatibility", () => {
  it("keeps the titlebar aligned with the note panel like v0.1.1", () => {
    expect(css).toContain("--shell-gap: 10px;");
    expect(css).toMatch(/\.titlebar\s*\{[\s\S]*?width:\s*calc\(100% - var\(--rail-w\) - var\(--shell-gap\)\);[\s\S]*?margin-left:\s*calc\(var\(--rail-w\) \+ var\(--shell-gap\)\);/);
  });

  it("restores the compact detached group tabs from v0.1.1", () => {
    expect(css).toMatch(/\.group-tab-wrap \.group-tab,[\s\S]*?\.group-tab\s*\{[\s\S]*?clip-path:\s*polygon/);
    expect(css).toMatch(/\.group-tab\.is-active\s*\{[\s\S]*?transform:\s*translateX\(-3px\) scaleX\(1\.055\)/);
    expect(css).toContain("@keyframes v011-tab-enter");
    expect(css).toMatch(/:root\[data-theme="light"\] \.groups-rail > \.group-tab\s*\{[\s\S]*?color:\s*#ffffff !important;[\s\S]*?background:\s*#168fe5 !important;/);
    expect(css).toMatch(/:root\[data-theme="light"\] \.groups-rail > \.group-tab\.is-active\s*\{[\s\S]*?background:\s*#087fe8 !important;/);
  });

  it("keeps the titlebar and main content inside one continuous shell", () => {
    expect(css).toMatch(/\.app-shell::before\s*\{[\s\S]*?top:\s*var\(--shell-pad\);[\s\S]*?bottom:\s*var\(--shell-pad\);[\s\S]*?background:\s*var\(--app-surface\)/);
    expect(css).toMatch(/\.app-body\s*\{[\s\S]*?margin-top:\s*0;[\s\S]*?gap:\s*0;/);
  });

  it("uses purpose-specific popup proportions instead of one generic modal", () => {
    expect(css).toMatch(/\.modal-scrim:has\(\.settings-panel\)[\s\S]*?justify-content:\s*flex-end/);
    expect(css).toMatch(/\.modal-scrim:has\(\.group-editor\)[\s\S]*?justify-content:\s*flex-start/);
    expect(css).toMatch(/\.note-editor\s*\{[\s\S]*?width:\s*min\(590px/);
  });

  it("clips every modal scrim to the rounded app window", () => {
    expect(css).toMatch(/\.modal-scrim,[\s\S]*?\.palette-scrim,[\s\S]*?\.confirm-scrim,[\s\S]*?\.lock-screen[\s\S]*?border-radius:\s*var\(--app-radius\);[\s\S]*?overflow:\s*hidden;/);
  });

  it("keeps equal top and bottom spacing around compact settings", () => {
    expect(css).toMatch(/@media \(max-width: 620px\) \{[\s\S]*?\.modal-scrim:has\(\.settings-panel\) \{[\s\S]*?align-items:\s*stretch;[\s\S]*?padding:\s*8px;[\s\S]*?\.modal-scrim:has\(\.settings-panel\) \.settings-panel \{[\s\S]*?height:\s*auto;[\s\S]*?max-height:\s*none;/);
  });

  it("uses solid surfaces unless liquid glass is explicitly enabled", () => {
    expect(css).toMatch(/\.app-main\s*\{[\s\S]*?background:\s*var\(--app-surface\);[\s\S]*?backdrop-filter:\s*none;/);
    expect(css).toMatch(/\.note-card\s*\{[\s\S]*?background:\s*var\(--card-surface\);[\s\S]*?backdrop-filter:\s*none;/);
    expect(css).toMatch(/:root\[data-liquid-glass\] \.app-main\s*\{[\s\S]*?backdrop-filter:\s*blur\(36px\)/);
  });

  it("keeps Markdown list markers visible with wide custom fonts", () => {
    expect(css).toMatch(/\.note-card__content,[\s\S]*?\.wander-card__content,[\s\S]*?\.editor-content \.ProseMirror[\s\S]*?min-width:\s*0;[\s\S]*?overflow-wrap:\s*anywhere;/);
    expect(css).toMatch(/\.note-card__content ol,[\s\S]*?\.wander-card__content ol,[\s\S]*?\.editor-content \.ProseMirror ol[\s\S]*?padding-inline-start:\s*max\(3em, 4ch\);/);
  });

  it("uses one interactive task-list treatment across all note surfaces", () => {
    expect(css).toMatch(/\.note-card__content ul\[data-type="taskList"\],[\s\S]*?\.wander-card__content ul\[data-type="taskList"\],[\s\S]*?\.editor-content \.ProseMirror ul\[data-type="taskList"\][\s\S]*?list-style:\s*none;/);
    expect(css).toMatch(/ul\[data-type="taskList"\] > li\[data-checked="true"\][\s\S]*?text-decoration:\s*line-through;/);
  });
});
