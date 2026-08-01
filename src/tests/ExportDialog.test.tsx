import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const { listGroups, runExport } = vi.hoisted(() => ({
  listGroups: vi.fn(),
  runExport: vi.fn(),
}));

vi.mock("../ipc/client", () => ({
  client: { groups: { list: listGroups }, exports: { run: runExport } },
}));

import { ExportDialog } from "../features/export/ExportDialog";

beforeEach(() => {
  listGroups.mockReset().mockResolvedValue([{ id: 7, name: "工作" }]);
  runExport.mockReset().mockResolvedValue({ path: "D:\\工作.pdf", noteCount: 3 });
});

it("exports a selected group as PDF with the metadata option", async () => {
  const onDone = vi.fn();
  render(<ExportDialog open onClose={vi.fn()} onDone={onDone} />);
  await waitFor(() => expect(listGroups).toHaveBeenCalledOnce());
  fireEvent.click(screen.getByRole("button", { name: "指定分组" }));
  await screen.findByRole("option", { name: "工作" });
  fireEvent.click(screen.getByRole("button", { name: /PDF/ }));
  fireEvent.click(screen.getByRole("checkbox", { name: /导出标签元数据/ }));
  fireEvent.click(screen.getByRole("button", { name: /选择位置并导出/ }));

  await waitFor(() => expect(runExport).toHaveBeenCalledWith({ scope: "group", groupId: 7, format: "pdf", includeMetadata: false }));
  expect(onDone).toHaveBeenCalledWith({ path: "D:\\工作.pdf", noteCount: 3 });
});

it("keeps the dialog open when the native save dialog is cancelled", async () => {
  runExport.mockResolvedValueOnce(null);
  const onClose = vi.fn();
  const onDone = vi.fn();
  render(<ExportDialog open onClose={onClose} onDone={onDone} />);
  await waitFor(() => expect(listGroups).toHaveBeenCalledOnce());
  fireEvent.click(screen.getByRole("button", { name: /选择位置并导出/ }));

  await waitFor(() => expect(runExport).toHaveBeenCalledOnce());
  expect(onDone).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog", { name: "导出便签" })).toBeInTheDocument();
});
