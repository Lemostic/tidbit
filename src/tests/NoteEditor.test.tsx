import { fireEvent, render, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, expect, it, vi } from "vitest";
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

beforeAll(() => {
  Object.defineProperty(Range.prototype, "getClientRects", { configurable: true, value: () => [] });
  Object.defineProperty(Range.prototype, "getBoundingClientRect", {
    configurable: true,
    value: () => ({ left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) }),
  });
});

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
  expect(getByLabelText("待办清单")).toBeInTheDocument();
});

it("does not write or reorder a note when closed without changes", () => {
  const { unmount } = render(
    <NoteEditor note={note} groups={[]} onClose={() => {}} onChanged={() => {}} onTrash={async () => {}} />
  );
  unmount();
  expect(invoke).not.toHaveBeenCalledWith("notes_update_content", expect.anything());
});

it("parses standard Markdown task lists into interactive editor checkboxes", async () => {
  const taskNote = { ...note, content_md: "- [ ] 未完成\n- [x] 已完成", content_html: "" };
  const { container, getByLabelText } = render(
    <NoteEditor note={taskNote} groups={[]} onClose={() => {}} onChanged={() => {}} onTrash={async () => {}} />
  );

  expect(getByLabelText("待办清单")).toBeInTheDocument();
  await waitFor(() => expect(container.querySelectorAll('ul[data-type="taskList"] li input[type="checkbox"]')).toHaveLength(2));
  expect(container.querySelectorAll('ul[data-type="taskList"] li[data-checked="true"]')).toHaveLength(1);
});

it("creates and saves a task list from the toolbar", async () => {
  const { container, getByLabelText } = render(
    <NoteEditor note={note} groups={[]} onClose={() => {}} onChanged={() => {}} onTrash={async () => {}} />
  );

  fireEvent.click(getByLabelText("待办清单"));
  await waitFor(() => expect(container.querySelector('ul[data-type="taskList"] input[type="checkbox"]')).toBeInTheDocument());
  await waitFor(() => expect(invoke).toHaveBeenCalledWith("notes_update_content", expect.objectContaining({
    md: expect.stringContaining("- [ ] test content"),
    html: expect.stringContaining('data-type="taskList"'),
  })), { timeout: 2_000 });
});

it("creates, edits, and saves a compact timeline from the toolbar", async () => {
  const { container, getByLabelText } = render(
    <NoteEditor note={note} groups={[]} onClose={() => {}} onChanged={() => {}} onTrash={async () => {}} />
  );

  fireEvent.click(getByLabelText("插入时间轴"));
  await waitFor(() => expect(container.querySelector('[data-timeline-card="true"]')).toBeInTheDocument());

  expect(container.querySelector('[aria-label="时间轴标题"]')).not.toBeInTheDocument();
  fireEvent.change(getByLabelText("时间节点 1 时间"), { target: { value: "2026-08-01T09:30" } });
  const eventTitle = getByLabelText("时间节点 1 标题");
  fireEvent.change(eventTitle, { target: { value: "开始内测" } });
  fireEvent.blur(eventTitle);
  const eventDescription = getByLabelText("时间节点 1 详情");
  fireEvent.change(eventDescription, { target: { value: "邀请首批用户" } });
  fireEvent.blur(eventDescription);
  fireEvent.click(getByLabelText("添加时间节点"));

  expect(container.querySelectorAll('[data-timeline-item="true"]')).toHaveLength(2);
  await waitFor(() => {
    expect(invoke).toHaveBeenCalledWith("notes_update_content", expect.objectContaining({
      md: expect.not.stringContaining("时间轴："),
      html: expect.stringContaining('data-timeline-card="true"'),
    }));
    expect(invoke).toHaveBeenCalledWith("notes_update_content", expect.objectContaining({
      md: expect.stringContaining("- 2026-08-01 09:30 **开始内测**\n  邀请首批用户"),
    }));
  }, { timeout: 2_000 });
});

it("restores a saved timeline card and keeps its node controls functional", async () => {
  const timelineNote = {
    ...note,
    content_md: "时间轴：版本计划\n- 2026-08-01 09:30 内测\n- 2026-08-15 14:00 发布",
    content_html: '<div data-timeline-card="true" data-title="版本计划"><div data-timeline-header="true"><span data-timeline-title="true">版本计划</span></div><ol data-timeline-items="true"><li data-timeline-item="true" data-id="alpha" data-date="2026-08-01" data-time="09:30"><time data-timeline-date="true" datetime="2026-08-01T09:30">2026-08-01 09:30</time><div data-timeline-content="true"><strong data-timeline-item-title="true">内测</strong></div></li><li data-timeline-item="true" data-id="release" data-date="2026-08-15" data-time="14:00"><time data-timeline-date="true" datetime="2026-08-15T14:00">2026-08-15 14:00</time><div data-timeline-content="true"><strong data-timeline-item-title="true">发布</strong></div></li></ol></div>',
  };
  const { container, getByLabelText } = render(
    <NoteEditor note={timelineNote} groups={[]} onClose={() => {}} onChanged={() => {}} onTrash={async () => {}} />
  );

  expect(container.querySelector('[aria-label="时间轴标题"]')).not.toBeInTheDocument();
  expect(getByLabelText("时间节点 1 时间")).toHaveValue("2026-08-01T09:30");
  expect(getByLabelText("时间节点 1 标题")).toHaveValue("内测");
  expect(container.querySelectorAll('[data-timeline-item="true"]')).toHaveLength(2);

  fireEvent.click(getByLabelText("添加时间节点"));
  await waitFor(() => {
    expect(invoke).toHaveBeenCalledWith("notes_update_content", expect.objectContaining({
      md: expect.stringMatching(/内测[\s\S]*发布[\s\S]*新时间节点/),
      html: expect.stringContaining('data-datetime="2026-08-01T09:30"'),
    }));
    expect(invoke).toHaveBeenCalledWith("notes_update_content", expect.objectContaining({
      html: expect.not.stringContaining("[object Object]"),
    }));
  }, { timeout: 2_000 });
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
