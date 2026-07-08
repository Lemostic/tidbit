import { render } from "@testing-library/react";
import { NoteEditor } from "../features/notes/NoteEditor";

it("renders without crashing", () => {
  const { container } = render(
    <NoteEditor noteId={1} initialMd="test content" onClose={() => {}} />
  );
  expect(container).toBeTruthy();
});
