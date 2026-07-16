import { fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { NoteEditor } from "../features/notes/NoteEditor";
import type { Note } from "../ipc/types";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

const note: Note = {
  id: 1, group_id: null, title: "测试便签", content_md: "test content", content_html: "<p>test content</p>",
  word_count: 12, is_pinned: false, is_content_hidden: false, is_archived: false, is_trashed: false, trashed_at: null,
  geom_x: null, geom_y: null, geom_w: 280, geom_h: 360, edge_dock: "none",
  created_at: 0, updated_at: 0, color: null, sort_order: 0,
};

class MediaRecorderMock {
  static isTypeSupported() { return true; }
  state: RecordingState = "inactive";
  mimeType: string;
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onstop: ((event: Event) => void) | null = null;

  constructor(_stream: MediaStream, options?: MediaRecorderOptions) {
    this.mimeType = options?.mimeType ?? "audio/webm";
  }

  start() { this.state = "recording"; }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["voice"], { type: this.mimeType }) } as BlobEvent);
    this.onstop?.(new Event("stop"));
  }
}

beforeEach(() => {
  invoke.mockReset();
  invoke.mockResolvedValue(note);
  vi.stubGlobal("MediaRecorder", MediaRecorderMock);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }) },
  });
});

it("renders note title and editor controls", () => {
  const { getByLabelText } = render(
    <NoteEditor note={note} groups={[]} onClose={() => {}} onChanged={() => {}} onTrash={async () => {}} />
  );
  expect(getByLabelText("便签标题")).toHaveValue("测试便签");
  expect(getByLabelText("便签内容")).toBeInTheDocument();
});

it("does not write or reorder a note when closed without changes", () => {
  const { unmount } = render(
    <NoteEditor note={note} groups={[]} onClose={() => {}} onChanged={() => {}} onTrash={async () => {}} />
  );
  unmount();
  expect(invoke).not.toHaveBeenCalledWith("notes_update_content", expect.anything());
});

it("records, inserts, and renames a voice memo block", async () => {
  const { getByLabelText } = render(
    <NoteEditor note={note} groups={[]} onClose={() => {}} onChanged={() => {}} onTrash={async () => {}} />
  );

  fireEvent.click(getByLabelText("开始录音"));
  await waitFor(() => expect(getByLabelText("停止并插入录音")).toBeInTheDocument());
  fireEvent.click(getByLabelText("停止并插入录音"));

  const nameInput = await waitFor(() => getByLabelText("录音名称"));
  expect((nameInput as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  fireEvent.change(nameInput, { target: { value: "产品站会要点" } });
  fireEvent.blur(nameInput);

  await waitFor(() => {
    expect(invoke).toHaveBeenCalledWith("notes_update_content", expect.objectContaining({
      md: expect.stringContaining("[语音备忘录：产品站会要点]"),
      html: expect.stringContaining('data-name="产品站会要点"'),
    }));
  }, { timeout: 2_000 });
});
