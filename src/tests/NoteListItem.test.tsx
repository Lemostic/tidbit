import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NoteListItem } from "../features/notes/NoteListItem";
import type { Note } from "../ipc/types";

const baseNote: Note = {
  id: 21,
  group_id: null,
  title: "项目计划",
  content_md: "本周完成纸本界面",
  content_html: "<p>本周完成纸本界面</p>",
  word_count: 9,
  is_pinned: false,
  is_content_hidden: false,
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
  clothesline_x: null,
};

function renderItem(overrides: Partial<Note> = {}, props: Partial<React.ComponentProps<typeof NoteListItem>> = {}) {
  const handlers = {
    onOpen: vi.fn(),
    onTogglePin: vi.fn(),
    onToggleVisibility: vi.fn(),
    onToggleArchive: vi.fn(),
    onWander: vi.fn(),
    onHang: vi.fn(),
    onTrash: vi.fn(),
  };
  const bubble = vi.fn();
  render(
    <div onClick={bubble}>
      <NoteListItem
        note={{ ...baseNote, ...overrides }}
        selected={false}
        wanderActive={false}
        hangingActive={false}
        index={0}
        {...handlers}
        {...props}
      />
    </div>,
  );
  return { ...handlers, bubble };
}

describe("NoteListItem actions", () => {
  it("runs every note action without opening or bubbling from the action rail", () => {
    const handlers = renderItem();

    fireEvent.click(screen.getByText("项目计划"));
    expect(handlers.onOpen).toHaveBeenCalledOnce();
    expect(handlers.bubble).toHaveBeenCalledOnce();

    const actions = [
      ["晾到绳上", handlers.onHang],
      ["云游便签", handlers.onWander],
      ["隐藏内容", handlers.onToggleVisibility],
      ["置顶", handlers.onTogglePin],
      ["归档便签", handlers.onToggleArchive],
      ["删除便签", handlers.onTrash],
    ] as const;

    for (const [name, handler] of actions) {
      fireEvent.click(screen.getByRole("button", { name }));
      expect(handler).toHaveBeenCalledOnce();
    }

    expect(handlers.onOpen).toHaveBeenCalledOnce();
    expect(handlers.bubble).toHaveBeenCalledOnce();
  });

  it("locks prohibited actions and opening while wandering but leaves pin available", () => {
    const handlers = renderItem({}, { wanderActive: true });
    const row = screen.getByRole("button", { name: "打开便签 项目计划" });

    expect(row).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "晾到绳上" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "云游便签" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "隐藏内容" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "归档便签" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "删除便签" })).toBeDisabled();

    fireEvent.click(screen.getByText("项目计划"));
    expect(handlers.onOpen).not.toHaveBeenCalled();

    const pin = screen.getByRole("button", { name: "置顶" });
    expect(pin).not.toBeDisabled();
    fireEvent.click(pin);
    expect(handlers.onTogglePin).toHaveBeenCalledOnce();
  });

  it("does not open a hidden note while keeping the visibility action available", () => {
    const handlers = renderItem({ is_content_hidden: true, title: "机密计划" });

    expect(screen.getByText("隐私便签")).toBeInTheDocument();
    expect(screen.queryByText("机密计划")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "打开便签 隐私便签" })).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(screen.getByText("隐私便签"));
    expect(handlers.onOpen).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "显示内容" }));
    expect(handlers.onToggleVisibility).toHaveBeenCalledOnce();
    expect(handlers.onOpen).not.toHaveBeenCalled();
  });

  it("toggles the hanger label while keeping wander locked for a hanging note", () => {
    const handlers = renderItem({}, { hangingActive: true });

    expect(screen.getByRole("button", { name: "从晾衣绳取下" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "云游便签" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "从晾衣绳取下" }));
    expect(handlers.onHang).toHaveBeenCalledOnce();
  });

  it("keeps expand/collapse and voice memo playback available in the index list", () => {
    const body = "这是一条足够长的便签正文，用来验证索引列表仍然可以展开阅读。".repeat(4);
    const content_html = `<p>${body}</p><div data-audio-recording="true"><audio controls src="data:audio/webm;base64,dm9pY2U="></audio></div>`;
    const handlers = renderItem({ content_md: body, content_html, word_count: body.length });

    fireEvent.click(screen.getByRole("button", { name: "展开全文" }));
    expect(screen.getByRole("button", { name: "收起内容" })).toHaveAttribute("aria-expanded", "true");

    const audio = document.querySelector(".note-list-item__expanded audio");
    expect(audio).not.toBeNull();
    fireEvent.click(audio as HTMLAudioElement);
    expect(handlers.onOpen).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "收起内容" }));
    expect(document.querySelector(".note-list-item__expanded audio")).not.toBeInTheDocument();
  });
});
