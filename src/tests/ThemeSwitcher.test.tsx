import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { emit } from "@tauri-apps/api/event";
import { ThemeSwitcher } from "../features/settings/ThemeSwitcher";
import { appearanceChangedEvent, applyAppearance, loadAppearance } from "../ui/appearance";

vi.mock("@tauri-apps/api/event", () => ({ emit: vi.fn(async () => undefined) }));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  delete document.documentElement.dataset.theme;
});

it("cycles and applies the theme", () => {
  localStorage.setItem("theme", "light");
  render(<ThemeSwitcher />);
  fireEvent.click(screen.getByRole("button", { name: "主题" }));
  expect(document.documentElement.dataset.theme).toBe("dark");
});

it("offers tokyo night and wechat styles", () => {
  render(<ThemeSwitcher expanded />);
  expect(screen.getByRole("option", { name: "Tokyo Night" })).toBeTruthy();
  expect(screen.getByRole("option", { name: "微信风格" })).toBeTruthy();
});

it("cycles into the new themes", () => {
  localStorage.setItem("theme", "sepia");
  render(<ThemeSwitcher />);
  const button = screen.getByRole("button", { name: "主题" });
  fireEvent.click(button);
  expect(document.documentElement.dataset.theme).toBe("tokyo-night");
  fireEvent.click(button);
  expect(document.documentElement.dataset.theme).toBe("wechat");
  fireEvent.click(button);
  expect(document.documentElement.dataset.theme).toBe("evernote");
  fireEvent.click(button);
  // New programmer-classic themes follow the existing six.
  expect(document.documentElement.dataset.theme).toBe("one-dark");
  fireEvent.click(button);
  expect(document.documentElement.dataset.theme).toBe("dracula");
  fireEvent.click(button);
  expect(document.documentElement.dataset.theme).toBe("nord");
  fireEvent.click(button);
  expect(document.documentElement.dataset.theme).toBe("solarized-dark");
  fireEvent.click(button);
  expect(document.documentElement.dataset.theme).toBe("gruvbox-dark");
  fireEvent.click(button);
  expect(document.documentElement.dataset.theme).toBe("monokai");
  fireEvent.click(button);
  // Wraps back to the first entry in the themes array.
  expect(document.documentElement.dataset.theme).toBe("light");
});

it("persists the Evernote selection and restores it when remounted", () => {
  const { unmount } = render(<ThemeSwitcher expanded />);
  fireEvent.change(screen.getByRole("combobox", { name: "主题" }), { target: { value: "evernote" } });
  expect(localStorage.getItem("theme")).toBe("evernote");
  expect(document.documentElement.dataset.theme).toBe("evernote");
  expect(emit).toHaveBeenLastCalledWith(appearanceChangedEvent, expect.objectContaining({ theme: "evernote" }));
  unmount();
  delete document.documentElement.dataset.theme;
  render(<ThemeSwitcher expanded />);
  expect((screen.getByRole("option", { name: "印象笔记" }) as HTMLOptionElement).selected).toBe(true);
  expect(document.documentElement.dataset.theme).toBe("evernote");
});

it("normalizes an invalid stored theme in the controls, storage and broadcast", () => {
  localStorage.setItem("theme", "unknown-theme");
  render(<ThemeSwitcher />);
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(localStorage.getItem("theme")).toBe("light");
  expect(screen.getByRole("button", { name: "主题" }).title).toContain("当前浅色");
  expect(emit).toHaveBeenLastCalledWith(appearanceChangedEvent, expect.objectContaining({ theme: "light" }));
  fireEvent.click(screen.getByRole("button", { name: "主题" }));
  expect(document.documentElement.dataset.theme).toBe("dark");
});

it("synchronizes the picker after an external theme action", () => {
  render(<ThemeSwitcher expanded />);
  act(() => {
    localStorage.setItem("theme", "evernote");
    window.dispatchEvent(new Event("tidbit-theme"));
  });
  expect((screen.getByRole("option", { name: "印象笔记" }) as HTMLOptionElement).selected).toBe(true);
  expect(document.documentElement.dataset.theme).toBe("evernote");
});

it("loads and applies Evernote through the shared window appearance contract", () => {
  localStorage.setItem("theme", "evernote");
  const appearance = loadAppearance();
  expect(appearance.theme).toBe("evernote");
  applyAppearance(appearance);
  expect(document.documentElement.dataset.theme).toBe("evernote");
  localStorage.setItem("theme", "unknown-theme");
  expect(loadAppearance().theme).toBe("light");
});
