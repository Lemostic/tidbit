import { render, fireEvent } from "@testing-library/react";
import { CommandPalette } from "../app/CommandPalette";
import "../styles/globals.css";
import type { Command } from "../app/CommandPalette";
const cmd: Command = { id: "x", title: "X", group: "app", run: () => {} };
it("runs command on enter", () => {
  let ran = false;
  const c = { ...cmd, run: () => { ran = true; } };
  const { getByRole } = render(<CommandPalette open commands={[c]} onClose={() => {}} />);
  fireEvent.keyDown(getByRole("listbox"), { key: "Enter" });
  expect(ran).toBe(true);
});
