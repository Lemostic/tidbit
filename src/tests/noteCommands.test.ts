import { describe, it, expect } from "vitest";
import { buildCommandRegistry } from "../features/notes/noteCommands";

describe("noteCommands", () => {
  it("registers new-note command", () => {
    const r = buildCommandRegistry(() => {});
    expect(r.find((c) => c.id === "note.new")).toBeTruthy();
  });
});
