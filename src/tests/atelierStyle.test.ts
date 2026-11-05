import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

function readSource(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function installStyles() {
  const style = document.createElement("style");
  style.textContent = [
    readSource("src/styles/tokens.css"),
    readSource("src/features/groups/groups.css"),
    readSource("src/styles/globals.css").replace(/@import\s+[^;]+;/g, ""),
    readSource("src/styles/atelier.css"),
  ].join("\n");
  document.head.append(style);
  return () => style.remove();
}

describe("Atelier visual layer", () => {
  test("loads the Atelier visual layer after the behavioral baseline", () => {
    const html = readSource("src/index.html");
    const globalsIndex = html.indexOf("./styles/globals.css");
    const atelierIndex = html.indexOf("./styles/atelier.css");

    expect(globalsIndex).toBeGreaterThanOrEqual(0);
    expect(atelierIndex).toBeGreaterThan(globalsIndex);
  });

  test("defines the paper, ink and seal system with legacy aliases", () => {
    const tokens = readSource("src/styles/tokens.css");

    for (const token of ["--desk:", "--paper:", "--paper-raised:", "--ink-deep:", "--seal:", "--seal-soft:"]) {
      expect(tokens).toContain(token);
    }

    for (const alias of [
      "--bg: var(--desk);",
      "--surface: var(--paper);",
      "--fg: var(--ink);",
      "--border: var(--line);",
      "--accent: var(--seal);",
      "--note-bg: var(--paper-raised);",
    ]) {
      expect(tokens).toContain(alias);
    }
  });

  test("keeps the note list beside the paper editor in OneNote mode", () => {
    const css = readSource("src/styles/atelier.css");
    const workspace = css.match(/\.notes-workspace\.is-one-note \{([\s\S]*?)\n\}/)?.[1] ?? "";

    expect(workspace).toContain("grid-template-columns: minmax(330px, 392px) minmax(0, 1fr);");
    expect(css).toContain(".notes-workspace.is-one-note > .notes {");
    expect(css).toContain(".one-note-pane__paper {");
  });

  test("fills the OneNote right pane with the writing surface", () => {
    const css = readSource("src/styles/atelier.css");
    const pane = css.match(/\.one-note-pane \.note-editor--pane \{([\s\S]*?)\n\}/)?.[1] ?? "";
    const cardCue = css.match(/\.one-note-pane \.note-editor--pane::before \{([\s\S]*?)\n\}/)?.[1] ?? "";
    const content = css.match(/\.one-note-pane \.note-editor--pane \.editor-content \{([\s\S]*?)\n\}/)?.[1] ?? "";
    const emptySheet = css.match(/\.one-note-pane__paper \{([\s\S]*?)\n\}/)?.[1] ?? "";

    expect(pane).toContain("width: 100%;");
    expect(pane).toContain("height: 100%;");
    expect(pane).toContain("max-width: none;");
    expect(pane).toContain("max-height: none;");
    expect(pane).toContain("margin: 0;");
    expect(pane).toContain("border: 0;");
    expect(pane).toContain("border-radius: 0;");
    expect(pane).toContain("box-shadow: none;");
    expect(pane).toContain("animation: none;");
    expect(cardCue).toContain("content: none;");
    expect(cardCue).toContain("display: none;");

    expect(content).toContain("width: 100%;");
    expect(content).toContain("max-width: none;");
    expect(content).toContain("margin: 0;");
    expect(emptySheet).toContain("width: 100%;");
    expect(emptySheet).toContain("height: 100%;");
    expect(emptySheet).toContain("border: 0;");
    expect(emptySheet).toContain("border-radius: 0;");
    expect(emptySheet).toContain("box-shadow: none;");

    expect(css).not.toContain("min(930px, calc(100% - 54px))");
    expect(css).not.toContain("calc(100% - 38px)");
    expect(css).not.toContain("margin-block: 19px;");
  });

  test("resolves the OneNote pane as full-bleed with and without glass", () => {
    const cleanup = installStyles();
    const editor = document.createElement("section");
    editor.className = "note-editor note-editor--pane";
    const pane = document.createElement("div");
    pane.className = "one-note-pane";
    pane.append(editor);
    document.body.append(pane);

    try {
      for (const glass of [false, true]) {
        if (glass) document.documentElement.dataset.liquidGlass = "";
        else delete document.documentElement.dataset.liquidGlass;

        const style = getComputedStyle(editor);
        expect(style.width).toBe("100%");
        expect(style.height).toBe("100%");
        expect(style.maxWidth).toBe("none");
        expect(style.maxHeight).toBe("none");
        expect(style.margin).toBe("0px");
        expect(style.borderWidth).toBe("0px");
        expect(style.borderRadius).toBe("0px");
        expect(style.boxShadow).toBe("none");
        expect(style.animationName).toBe("none");
      }

      const css = readSource("src/styles/atelier.css");
      const glassRuleStart = css.lastIndexOf(":root[data-liquid-glass] .one-note-pane .note-editor--pane {");
      const glassRule = css.slice(glassRuleStart, css.indexOf("\n}", glassRuleStart) + 2);
      expect(glassRuleStart).toBeGreaterThanOrEqual(0);
      expect(glassRule).toContain("background-image: var(--atelier-paper-fiber);");
      expect(glassRule).toContain("box-shadow: none;");
    } finally {
      delete document.documentElement.dataset.liquidGlass;
      pane.remove();
      cleanup();
    }
  });

  test("keeps OneNote action focus and metadata readable", () => {
    const css = readSource("src/styles/atelier.css");

    expect(css).toContain(".note-list-item__action:focus-visible {");
    expect(css).toContain("outline-offset: -2px;");

    const meta = css.match(/\.note-list-item__meta \{([\s\S]*?)\n\}/)?.[1] ?? "";
    const count = css.match(/\.notes__count \{([\s\S]*?)\n\}/)?.[1] ?? "";
    expect(meta).toContain("color: var(--ink-soft);");
    expect(meta).toContain("font-size: 10px;");
    expect(count).toContain("color: var(--ink-soft);");
    expect(count).toContain("font-size: 10px;");
  });

  test("keeps note cards and editor paper opaque when liquid glass is enabled", () => {
    const css = readSource("src/styles/atelier.css");
    const contentStart = css.indexOf("/* Content layers stay opaque even when glass is enabled. */");
    const contentBlock = css.slice(contentStart, css.indexOf("\n}", contentStart) + 2);

    expect(contentStart).toBeGreaterThanOrEqual(0);
    expect(contentBlock).toContain(".note-card");
    expect(contentBlock).toContain(".note-editor");
    expect(contentBlock).toContain(".editor-content");
    expect(contentBlock).toContain("backdrop-filter: none;");
  });

  test("provides a reduced-motion fallback for the new surfaces", () => {
    const css = readSource("src/styles/atelier.css");
    const reducedMotionStart = css.indexOf("@media (prefers-reduced-motion: reduce)");
    const reducedMotion = css.slice(reducedMotionStart);

    expect(reducedMotionStart).toBeGreaterThanOrEqual(0);
    expect(reducedMotion).toContain(".titlebar");
    expect(reducedMotion).toContain(".note-card");
    expect(reducedMotion).toContain(".note-editor");
    expect(reducedMotion).toContain("animation: none !important;");
    expect(reducedMotion).toContain("transition-duration: 0.01ms !important;");
  });
});
