import type { Command } from "../../app/CommandPalette";

export function buildCommandRegistry(create: () => void): Command[] {
  return [
    { id: "note.new", title: "新建便签", group: "note", run: () => create() },
  ];
}
