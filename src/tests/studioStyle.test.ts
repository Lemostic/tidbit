import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(`src/${file}`, "utf8");

describe("studio visual layer", () => {
  it("loads after the legacy layers", () => {
    const html = read("index.html");
    const globals = html.indexOf("./styles/globals.css");
    const atelier = html.indexOf("./styles/atelier.css");
    const studio = html.indexOf("./styles/studio.css");

    expect(globals).toBeGreaterThan(-1);
    expect(atelier).toBeGreaterThan(globals);
    expect(studio).toBeGreaterThan(atelier);
  });

  it("aggregates the four studio sheets", () => {
    const entry = read("styles/studio.css");

    expect(entry).toContain('@import "./studio-base.css"');
    expect(entry).toContain('@import "./studio-chrome.css"');
    expect(entry).toContain('@import "./studio-compact.css"');
    expect(entry).toContain('@import "./studio-onenote.css"');
  });

  it("defines the shared studio tokens", () => {
    const tokens = read("styles/tokens.css");

    for (const token of [
      "--studio-titlebar-h:",
      "--studio-rail-w:",
      "--studio-index-w:",
      "--studio-page-max:",
      "--studio-line:",
      "--studio-focus:",
    ]) {
      expect(tokens).toContain(token);
    }
  });

  it("scopes each layout to its window mode", () => {
    const compact = read("styles/studio-compact.css");
    const notebook = read("styles/studio-onenote.css");

    expect(compact).toContain(".app-shell.is-sticky .notes-workspace.is-sticky-board");
    expect(compact).toContain(".app-shell.is-sticky .notes__list .note-card");
    expect(compact).not.toContain(".app-shell.is-one-note");

    expect(notebook).toContain(
      ".app-shell.is-one-note .notes-workspace.is-one-note",
    );
    expect(notebook).toContain(
      "grid-template-columns: minmax(300px, var(--studio-index-w)) minmax(0, 1fr)",
    );
    expect(notebook).not.toContain(".app-shell.is-sticky");
  });
});
