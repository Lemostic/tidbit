export type WindowMode =
  | { kind: "main" }
  | { kind: "wander"; noteId: number }
  | { kind: "wander-editor"; noteId: number }
  | { kind: "clothesline" };

export function resolveWindowMode(label: string): WindowMode {
  if (label === "clothesline") return { kind: "clothesline" };
  const editor = /^wander-editor-(\d+)$/.exec(label);
  if (editor) return { kind: "wander-editor", noteId: Number(editor[1]) };
  const wander = /^wander-(\d+)$/.exec(label);
  if (wander) return { kind: "wander", noteId: Number(wander[1]) };
  return { kind: "main" };
}

/**
 * The working surface follows the window state: a floating window is the
 * sticky-note desk, while a maximized or fullscreen window becomes the
 * three-column notebook. Plain window width never changes the mode, so a wide
 * floating window still behaves like a sticky-note desk.
 */
export function shouldUseOneNoteLayout(
  innerWidth: number,
  maximized: boolean,
  fullscreen: boolean,
): boolean {
  return maximized || fullscreen;
}
