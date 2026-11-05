import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { DetachedNote } from "../features/notes/DetachedNote";
import type { Note } from "../ipc/types";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/api/event", () => ({ emit: vi.fn(async () => undefined) }));

const note: Note = {
  id: 12, group_id: null, title: "撕出便签", content_md: "正文内容", content_html: "<p>正文内容</p>",
  word_count: 4, is_pinned: false, is_content_hidden: false, is_archived: false, is_trashed: false, trashed_at: null,
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
    this.ondataavailable?.({ data: new Blob(["v"], { type: this.mimeType }) } as BlobEvent);
    this.onstop?.(new Event("stop"));
  }
}

beforeEach(() => {
  invoke.mockReset();
  invoke.mockImplementation(async (command: string) => {
    if (command === "notes_get") return note;
    if (command === "groups_list") return [];
    return undefined;
  });
  vi.stubGlobal("MediaRecorder", MediaRecorderMock);
  Object.defineProperty(Range.prototype, "getClientRects", { configurable: true, value: () => [] });
  Object.defineProperty(Range.prototype, "getBoundingClientRect", {
    configurable: true,
    value: () => ({ left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) }),
  });
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }) },
  });
});

it("renders the note editor for a detached window", async () => {
  render(<DetachedNote noteId={12} />);
  expect(await screen.findByLabelText("便签标题")).toHaveValue("撕出便签");
  expect(screen.getByLabelText("便签内容")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "关闭编辑器" })).toBeInTheDocument();
});

it("calls note_detach_close when the close button is clicked", async () => {
  render(<DetachedNote noteId={12} />);
  (await screen.findByRole("button", { name: "关闭编辑器" })).click();
  expect(invoke).toHaveBeenCalledWith("note_detach_close", { noteId: 12 });
});
