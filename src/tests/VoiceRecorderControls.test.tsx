import { act, fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AudioRecording } from "../features/notes/AudioRecording";
import { VoiceRecorderControls } from "../features/notes/VoiceRecorderControls";
import type { CapturedVoice, CaptureSnapshot } from "../features/notes/voiceCapture";

const mock = vi.hoisted(() => ({ done: vi.fn<[CapturedVoice | null, string], void>(), update: vi.fn<[CaptureSnapshot], void>(), cancel: vi.fn(), start: vi.fn(async () => undefined) }));
vi.mock("../features/notes/voiceCapture", async importOriginal => {
  const actual = await importOriginal<typeof import("../features/notes/voiceCapture")>();
  return { ...actual, VoiceCapture: class {
    constructor(_options: unknown, update: typeof mock.update, done: typeof mock.done) { mock.update = update; mock.done = done; }
    start = mock.start;
    cancel = mock.cancel;
    finish = vi.fn(); pause = vi.fn();
  } };
});
let editor: Editor;
beforeEach(() => {
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:preview"), revokeObjectURL: vi.fn() }));
  mock.cancel.mockClear();
  editor = new Editor({ extensions: [StarterKit, AudioRecording], content: "<p>before</p><p>after</p>" });
  editor.commands.setTextSelection(7);
});
afterEach(() => { cleanup(); editor.destroy(); vi.unstubAllGlobals(); });
function openAndStart() {
  render(<VoiceRecorderControls editor={editor} />);
  fireEvent.click(screen.getByRole("button", { name: "开始录音" }));
  const panel = screen.getByRole("dialog");
  fireEvent.click(panel.querySelector("footer .voice-panel__primary")!);
}
const result: CapturedVoice = { blob: new Blob(["audio"], { type: "audio/webm" }), durationMs: 1200, startedAt: new Date(2026, 8, 19, 10, 0) };

it("previews without insertion and inserts once at the preserved selection", async () => {
  openAndStart();
  act(() => mock.done(result, ""));
  expect(screen.getByLabelText("试听录音")).toBeTruthy();
  expect(editor.getHTML()).not.toContain("data-audio-recording");
  fireEvent.click(screen.getByRole("button", { name: "插入笔记" }));
  await waitFor(() => expect(editor.getHTML()).toContain("data-audio-recording"));
  expect(editor.getJSON().content?.map(node => node.type)).toEqual(["paragraph", "audioRecording", "paragraph"]);
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("discard revokes the preview URL and never mutates the note", () => {
  openAndStart(); act(() => mock.done(result, ""));
  fireEvent.click(screen.getByRole("button", { name: "放弃" }));
  expect(editor.getHTML()).not.toContain("data-audio-recording");
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview");
});

it("cancels a pending permission request and ignores late callbacks", () => {
  openAndStart();
  fireEvent.click(screen.getByRole("button", { name: "取消录音" }));
  act(() => mock.done(result, ""));
  expect(mock.cancel).toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(editor.getHTML()).not.toContain("data-audio-recording");
});

it("aborts conversion on unmount and never inserts a late FileReader result", async () => {
  class PendingReader {
    static latest: PendingReader;
    result = "data:audio/webm;base64,YXVkaW8=";
    onload?: () => void;
    onloadend?: () => void;
    onabort?: () => void;
    readAsDataURL = vi.fn();
    abort = vi.fn(() => { this.onabort?.(); this.onloadend?.(); });
    constructor() { PendingReader.latest = this; }
  }
  vi.stubGlobal("FileReader", PendingReader);
  openAndStart();
  act(() => mock.done(result, ""));
  fireEvent.click(screen.getByRole("button", { name: "插入笔记" }));
  const reader = PendingReader.latest;
  expect(reader.readAsDataURL).toHaveBeenCalledWith(result.blob);
  cleanup();
  expect(reader.abort).toHaveBeenCalled();
  await act(async () => { reader.onload?.(); });
  expect(editor.getHTML()).not.toContain("data-audio-recording");
});
