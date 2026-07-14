import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { expect, it } from "vitest";
import { NoteSortControl } from "../features/notes/NoteSortControl";
import { defaultNoteSort, type NoteSortPreference } from "../features/notes/noteSort";

function Harness() {
  const [preference, setPreference] = useState<NoteSortPreference>(defaultNoteSort);
  return <NoteSortControl preference={preference} onChange={setPreference} />;
}

it("switches sort fields and directions using natural defaults", () => {
  render(<Harness />);
  expect(screen.getByLabelText("排序字段")).toHaveValue("updated_at");
  fireEvent.click(screen.getByRole("button", { name: "排序方向：最新优先" }));
  expect(screen.getByRole("button", { name: "排序方向：最早优先" })).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("排序字段"), { target: { value: "title" } });
  expect(screen.getByRole("button", { name: "排序方向：名称升序" })).toBeInTheDocument();
  expect(screen.queryByRole("option", { name: "手动排序" })).not.toBeInTheDocument();
});
