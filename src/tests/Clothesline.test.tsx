import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, expect, it, vi } from "vitest";
import { Clothesline } from "../features/clothesline/Clothesline";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
});

const { invoke, listeners } = vi.hoisted(() => ({
  invoke: vi.fn(),
  listeners: new Map<string, (event: { payload: unknown }) => void>(),
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/api/event", () => ({
  emit: vi.fn(async () => undefined),
  listen: vi.fn(async (event: string, callback: (event: { payload: unknown }) => void) => {
    listeners.set(event, callback);
    return () => listeners.delete(event);
  }),
}));

const baseNote = {
  id: 8,
  group_id: null,
  title: "今日待办",
  content_md: "正文",
  content_html: "<p>写好晾衣绳的复盘</p>",
  word_count: 6,
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

function mockCommands(overrides: Record<string, unknown> = {}) {
  invoke.mockImplementation(async (command: string) => {
    if (command in overrides) return overrides[command];
    if (command === "clothesline_list") return [];
    if (command === "clothesline_is_open") return true;
    if (command === "notes_get") return baseNote;
    return undefined;
  });
}

beforeEach(() => {
  invoke.mockReset();
  listeners.clear();
  localStorage.clear();
  mockCommands();
});

it("shows the empty state when no notes are hung", async () => {
  render(<Clothesline />);
  await waitFor(() => expect(listeners.has("tidbit://clothesline-changed")).toBe(true));
  expect(screen.getByText("绳上空空如也")).toBeInTheDocument();
  expect(screen.getByText("回到主窗口，点便签上的衣架按钮把它挂到绳上。")).toBeInTheDocument();
});

it("adopts the backend list instead of overwriting it from stale local storage", async () => {
  mockCommands({ clothesline_list: [8] });
  render(<Clothesline />);

  await screen.findByText("今日待办");
  expect(invoke).toHaveBeenCalledWith("clothesline_list");
  expect(invoke).not.toHaveBeenCalledWith("clothesline_set_notes", { noteIds: [] });
});

it("reacts to backend broadcasts and updates the rendered list", async () => {
  render(<Clothesline />);
  await waitFor(() => expect(listeners.has("tidbit://clothesline-changed")).toBe(true));
  act(() => {
    listeners.get("tidbit://clothesline-changed")?.({ payload: [8] });
  });
  await screen.findByText("今日待办");
});

it("removes a note when the × button is clicked", async () => {
  mockCommands({ clothesline_list: [8] });
  render(<Clothesline />);
  await screen.findByText("今日待办");
  fireEvent.click(screen.getByRole("button", { name: "取下便签" }));
  await waitFor(() => expect(invoke).toHaveBeenCalledWith("clothesline_set_notes", expect.objectContaining({ noteIds: [] })));
  expect(JSON.parse(localStorage.getItem("clothesline:note-ids") ?? "[]")).toEqual([]);
});

it("opens the editor when a card is clicked", async () => {
  mockCommands({ clothesline_list: [8] });
  render(<Clothesline />);
  await screen.findByText("今日待办");
  fireEvent.click(document.querySelector(".hanging-note__card") as HTMLElement);
  await waitFor(() =>
    expect(invoke).toHaveBeenCalledWith("wander_editor_open", expect.objectContaining({ noteId: 8 })),
  );
});

it("does not open a hidden hanging note", async () => {
  mockCommands({
    clothesline_list: [8],
    clothesline_positions: [],
    notes_get: { ...baseNote, is_content_hidden: true },
  });
  render(<Clothesline />);
  await screen.findByText("隐私便签");

  fireEvent.click(document.querySelector(".hanging-note__card") as HTMLElement);
  expect(invoke).not.toHaveBeenCalledWith("wander_editor_open", expect.anything());
});

it("retracts to a centered peek and only reveals from that strip", async () => {
  render(<Clothesline />);
  await waitFor(() => expect(listeners.has("tidbit://clothesline-retracting")).toBe(true));

  fireEvent.pointerLeave(document.querySelector(".clothesline-shell") as HTMLElement);
  await waitFor(() => expect(invoke).toHaveBeenCalledWith("clothesline_arm_hide"));

  act(() => {
    listeners.get("tidbit://clothesline-retracting")?.({ payload: undefined });
  });
  const peek = screen.getByRole("button", { name: "展开桌面晾衣绳" });
  expect(document.querySelector(".clothesline__panel")).not.toBeInTheDocument();
  expect(peek).toBeInTheDocument();

  fireEvent.pointerEnter(peek);
  await waitFor(() => expect(invoke).toHaveBeenCalledWith("clothesline_reveal"));
});

it("never wires card or window dragging", async () => {
  mockCommands({ clothesline_list: [8] });
  render(<Clothesline />);
  await screen.findByText("今日待办");

  expect(document.querySelector("[data-tauri-drag-region]")).not.toBeInTheDocument();
  const card = document.querySelector(".hanging-note__card") as HTMLElement;
  expect(card).not.toHaveAttribute("draggable", "true");
  fireEvent.pointerDown(card, { button: 0, pointerId: 1, clientX: 400 });
  fireEvent.pointerMove(window, { pointerId: 1, clientX: 520 });
  fireEvent.pointerUp(window, { pointerId: 1, clientX: 520 });

  await act(async () => {
    await Promise.resolve();
  });
  expect(invoke).not.toHaveBeenCalledWith("clothesline_set_positions", expect.anything());
});

it("persists a free horizontal position when the user drags a card along the rope", async () => {
  mockCommands({ clothesline_list: [8], clothesline_positions: [] });
  render(<Clothesline />);
  const article = (await screen.findByText("今日待办")).closest(".hanging-note") as HTMLElement;
  expect(article).toBeTruthy();

  // Drag starts on the article so pointer capture stays inside React.
  fireEvent.pointerDown(article, { button: 0, pointerId: 7, clientX: 320 });
  fireEvent.pointerMove(article, { pointerId: 7, clientX: 460 });
  fireEvent.pointerUp(article, { pointerId: 7, clientX: 460 });

  await waitFor(() =>
    expect(invoke).toHaveBeenCalledWith(
      "clothesline_set_positions",
      expect.objectContaining({
        positions: expect.arrayContaining([expect.objectContaining({ id: 8 })]),
      }),
    ),
  );
  expect(document.querySelector("[data-tauri-drag-region]")).not.toBeInTheDocument();
});

it("closes the window when the × button in the head is clicked", async () => {
  render(<Clothesline />);
  await waitFor(() => expect(listeners.has("tidbit://clothesline-changed")).toBe(true));
  fireEvent.click(screen.getByRole("button", { name: "关闭晾衣绳" }));
  await waitFor(() => expect(invoke).toHaveBeenCalledWith("clothesline_close"));
});

it("closes the window on Escape", async () => {
  render(<Clothesline />);
  await waitFor(() => expect(listeners.has("tidbit://clothesline-changed")).toBe(true));
  fireEvent.keyDown(window, { key: "Escape" });
  await waitFor(() => expect(invoke).toHaveBeenCalledWith("clothesline_close"));
});
