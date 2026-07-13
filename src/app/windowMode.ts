export type WindowMode =
  | { kind: "main" }
  | { kind: "wander"; noteId: number }
  | { kind: "wander-editor"; noteId: number };

export function resolveWindowMode(label: string): WindowMode {
  const editor = /^wander-editor-(\d+)$/.exec(label);
  if (editor) return { kind: "wander-editor", noteId: Number(editor[1]) };
  const wander = /^wander-(\d+)$/.exec(label);
  if (wander) return { kind: "wander", noteId: Number(wander[1]) };
  return { kind: "main" };
}
