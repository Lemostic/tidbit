import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "src/styles/refinement.css"), "utf8");

describe("refined navigation transparency", () => {
  it("keeps the entire group rail substrate transparent", () => {
    expect(css).toMatch(/\.app-shell\s*\{[\s\S]*?background:\s*transparent\s*!important;/);
    expect(css).toMatch(/\.app-shell::before,[\s\S]*?\.app-shell::after\s*\{\s*display:\s*none\s*!important;/);
    expect(css).toMatch(/\.app-body\s*\{[\s\S]*?background:\s*transparent\s*!important;/);
    expect(css).toMatch(/\.groups-rail\s*\{[\s\S]*?background:\s*none\s*!important;[\s\S]*?backdrop-filter:\s*none\s*!important;/);
  });

  it("places the material only on the title and content panels", () => {
    expect(css).toMatch(/\.titlebar\s*\{[\s\S]*?background:\s*var\(--app-surface\);/);
    expect(css).toMatch(/\.app-main\s*\{[\s\S]*?background:\s*var\(--app-surface\);/);
  });

  it("keeps the filing-tab notch instead of rounding group labels", () => {
    expect(css).toMatch(/\.group-tab-wrap \.group-tab,[\s\S]*?clip-path:\s*polygon\(0 0, 100% 0, 100% 100%, 7px 100%, 0 calc\(100% - 7px\)\);/);
    expect(css).toMatch(/\.group-tab\.is-active\s*\{[\s\S]*?border-radius:\s*0;/);
    expect(css).toMatch(/:root\[data-liquid-glass\] \.group-tab,[\s\S]*?backdrop-filter:\s*none;/);
  });
});

describe("compact settings workspace", () => {
  it("uses a bounded desktop dialog with a dedicated scroll region", () => {
    expect(css).toMatch(/\.settings-panel\s*\{[\s\S]*?width:\s*min\(700px,[\s\S]*?height:\s*min\(700px, calc\(100dvh - 40px\)\);/);
    expect(css).toMatch(/\.settings-panel__workspace\s*\{[\s\S]*?grid-template-columns:\s*148px minmax\(0, 1fr\);/);
    expect(css).toMatch(/\.settings-panel__body\s*\{[\s\S]*?overflow-y:\s*auto;[\s\S]*?scrollbar-gutter:\s*stable;/);
    expect(css).toMatch(/@media \(max-width: 720px\)[\s\S]*?\.modal-scrim:has\(\.settings-panel\) \.settings-panel\s*\{[\s\S]*?height:\s*min\(760px, calc\(100dvh - 20px\)\);[\s\S]*?max-height:\s*calc\(100dvh - 20px\);/);
  });

  it("keeps an oversized settings window reachable instead of centering it into negative overflow", () => {
    expect(css).toMatch(/\.modal-scrim:has\(\.settings-panel\)\s*\{[\s\S]*?align-items:\s*flex-start;[\s\S]*?overflow-y:\s*auto;/);
    expect(css).toMatch(/\.settings-panel\s*\{[\s\S]*?height:\s*min\(700px, calc\(100vh - 40px\)\);[\s\S]*?margin-block:\s*auto;/);
  });

  it("keeps every horizontal settings tab inside a narrow dialog", () => {
    expect(css).toMatch(/@media \(max-width: 720px\)[\s\S]*?\.settings-panel__nav\s*\{[\s\S]*?overflow-x:\s*hidden;/);
    expect(css).toMatch(/@media \(max-width: 720px\)[\s\S]*?\.settings-panel__nav button\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?flex:\s*1 1 auto;[\s\S]*?padding:\s*0 4px;/);
  });
});

describe("responsive note editor bounds", () => {
  it("keeps a visible top and bottom inset in narrow desktop windows", () => {
    expect(css).toMatch(/@media \(max-width: 700px\)[\s\S]*?\.modal-scrim:has\(\.note-editor\)\s*\{\s*padding:\s*16px 9px;/);
    expect(css).toMatch(/@media \(max-width: 700px\)[\s\S]*?\.modal-scrim:has\(\.note-editor\) \.note-editor\s*\{[\s\S]*?height:\s*min\(780px, calc\(100dvh - 32px\)\);[\s\S]*?max-height:\s*calc\(100dvh - 32px\);/);
  });
});

describe("compact wander editor", () => {
  it("keeps the embedded toolbar on one row without main-editor spacing", () => {
    expect(css).toMatch(/\.wander-card__body \.note-editor--embedded \.note-editor__options\s*\{[\s\S]*?margin:\s*0;[\s\S]*?border-radius:\s*0;/);
    expect(css).toMatch(/\.wander-card__body \.note-editor--embedded \.toolbar\s*\{[\s\S]*?flex-wrap:\s*nowrap;[\s\S]*?overflow-x:\s*hidden;[\s\S]*?border-radius:\s*0;/);
    expect(css).toMatch(/\.wander-card__body \.note-editor--embedded \.toolbar__btn\s*\{[\s\S]*?flex:\s*0 0 27px;/);
    expect(css).toMatch(/\.wander-card__body \.note-editor--embedded \.editor-content\s*\{[\s\S]*?margin:\s*0;[\s\S]*?border:\s*0;/);
  });
});
