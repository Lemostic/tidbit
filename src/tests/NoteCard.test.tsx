import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { NoteCard } from "../features/notes/NoteCard";
import type { Note } from "../ipc/types";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => { vi.stubGlobal("ResizeObserver", ResizeObserverMock); });

const hiddenNote: Note = {
  id: 7,
  group_id: null,
  title: "机密计划",
  content_md: "**不能显示**",
  content_html: "<p><strong>不能显示</strong></p>",
  word_count: 5,
  is_pinned: false,
  is_content_hidden: true,
  is_archived: false,
  is_trashed: false,
  trashed_at: null,
  geom_x: null,
  geom_y: null,
  geom_w: 280,
  geom_h: 360,
  edge_dock: "none",
  created_at: 0,
  updated_at: 0,
  color: null,
  sort_order: 0,
};

describe("NoteCard privacy", () => {
  it("masks hidden note content until the eye action is used", () => {
    const onToggleVisibility = vi.fn();
    render(<NoteCard note={hiddenNote} onOpen={() => {}} onTogglePin={() => {}} onToggleVisibility={onToggleVisibility} onToggleArchive={() => {}} onWander={() => {}} onTrash={() => {}} />);
    expect(screen.getByText("隐私便签")).toBeInTheDocument();
    expect(screen.getByText("该条便签内容已加密")).toBeInTheDocument();
    expect(screen.queryByText("机密计划")).not.toBeInTheDocument();
    expect(screen.queryByText("不能显示")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "显示内容" }));
    expect(onToggleVisibility).toHaveBeenCalledOnce();
  });

  it("offers archive and unarchive actions", () => {
    const onToggleArchive = vi.fn();
    const { rerender } = render(<NoteCard note={{ ...hiddenNote, is_content_hidden: false }} onOpen={() => {}} onTogglePin={() => {}} onToggleVisibility={() => {}} onToggleArchive={onToggleArchive} onWander={() => {}} onTrash={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "归档便签" }));
    expect(onToggleArchive).toHaveBeenCalledOnce();

    rerender(<NoteCard note={{ ...hiddenNote, is_content_hidden: false, is_archived: true }} onOpen={() => {}} onTogglePin={() => {}} onToggleVisibility={() => {}} onToggleArchive={onToggleArchive} onWander={() => {}} onTrash={() => {}} />);
    expect(screen.getByText("已归档")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "取消归档" })).toBeInTheDocument();
  });

  it("opens a note as a desktop wander card", () => {
    const onWander = vi.fn();
    render(<NoteCard note={{ ...hiddenNote, is_content_hidden: false }} onOpen={() => {}} onTogglePin={() => {}} onToggleVisibility={() => {}} onToggleArchive={() => {}} onWander={onWander} onTrash={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "云游便签" }));
    expect(onWander).toHaveBeenCalledOnce();
  });

  it("locks all main-list actions except pin while wandering", () => {
    const onOpen = vi.fn();
    const onTogglePin = vi.fn();
    render(<NoteCard note={{ ...hiddenNote, is_content_hidden: false }} wanderActive onOpen={onOpen} onTogglePin={onTogglePin} onToggleVisibility={() => {}} onToggleArchive={() => {}} onWander={() => {}} onTrash={() => {}} />);
    expect(screen.getByText("桌面云游中")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "云游便签" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "隐藏内容" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "归档便签" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "删除便签" })).toBeDisabled();
    fireEvent.click(screen.getByText("机密计划"));
    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "置顶" }));
    expect(onTogglePin).toHaveBeenCalledOnce();
  });

  it("plays an embedded voice memo without opening the editor", () => {
    const onOpen = vi.fn();
    const content_html = '<div data-audio-recording="true" data-name="晨会" data-duration-ms="1000"><span data-audio-name="true">晨会</span><audio controls src="data:audio/webm;base64,dm9pY2U="></audio></div>';
    const { container } = render(<NoteCard note={{ ...hiddenNote, is_content_hidden: false, content_html }} onOpen={onOpen} onTogglePin={() => {}} onToggleVisibility={() => {}} onToggleArchive={() => {}} onWander={() => {}} onTrash={() => {}} />);
    const audio = container.querySelector("audio");
    expect(audio).not.toBeNull();
    fireEvent.click(audio!);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("checks a task directly without opening the editor", () => {
    const onOpen = vi.fn();
    const onToggleTask = vi.fn(async () => undefined);
    const taskHtml = '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>提交周报</p></div></li></ul>';
    render(<NoteCard note={{ ...hiddenNote, is_content_hidden: false, content_md: "- [ ] 提交周报", content_html: taskHtml }} onOpen={onOpen} onTogglePin={() => {}} onToggleVisibility={() => {}} onToggleArchive={() => {}} onWander={() => {}} onTrash={() => {}} onToggleTask={onToggleTask} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "标记待办为已完成" }));
    expect(onToggleTask).toHaveBeenCalledWith(0, true);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("renders a timeline card as part of the note preview", () => {
    const timelineHtml = '<div data-timeline-card="true"><ol data-timeline-items="true"><li data-timeline-item="true" data-datetime="2026-08-01T09:30"><time data-timeline-date="true" datetime="2026-08-01T09:30">2026-08-01 09:30</time><div data-timeline-content="true"><strong data-timeline-item-title="true">开始内测</strong><p data-timeline-item-description="true">邀请首批用户</p></div></li><li data-timeline-item="true" data-datetime="2026-08-15T14:00"><time data-timeline-date="true" datetime="2026-08-15T14:00">2026-08-15 14:00</time><div data-timeline-content="true"><strong data-timeline-item-title="true">正式发布</strong></div></li></ol></div>';
    const { container } = render(<NoteCard note={{ ...hiddenNote, is_content_hidden: false, content_html: timelineHtml }} onOpen={() => {}} onTogglePin={() => {}} onToggleVisibility={() => {}} onToggleArchive={() => {}} onWander={() => {}} onTrash={() => {}} />);

    expect(container.querySelector("[data-timeline-header]")).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-timeline-item="true"]')).toHaveLength(2);
    expect(screen.getByText("2026-08-01 09:30")).toBeInTheDocument();
    expect(screen.getByText("开始内测")).toBeInTheDocument();
    expect(screen.getByText("邀请首批用户")).toBeInTheDocument();
    expect(screen.getByText("正式发布")).toBeInTheDocument();
  });
});
