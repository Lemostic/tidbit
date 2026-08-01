import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ThemeSwitcher } from "../features/settings/ThemeSwitcher";

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
});
