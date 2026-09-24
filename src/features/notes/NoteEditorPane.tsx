import type { Group, Note } from "../../ipc/types";
import { NoteEditor } from "./NoteEditor";

interface NoteEditorPaneProps {
  note: Note;
  groups: Group[];
  onChanged: () => void | Promise<void>;
  onTrash: (id: number) => Promise<void>;
}

/**
 * Note mode (maximized) editor wrapper.
 * The NoteEditor renders its own head (title input + group/colors/tags + toolbar),
 * so this wrapper intentionally stays thin — no extra rail, no duplicate metadata.
 */
export function NoteEditorPane({ note, groups, onChanged, onTrash }: NoteEditorPaneProps) {
  return (
    <div className="note-pane">
      <NoteEditor
        note={note}
        groups={groups}
        onClose={() => { /* pane closing = parent deselects the tab */ }}
        onChanged={onChanged}
        onTrash={onTrash}
        allowTrash
        embedded
        showHead
      />
    </div>
  );
}
