import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ThemeSwitcher } from "../features/settings/ThemeSwitcher";

it("cycles and applies the theme", () => {
  localStorage.setItem("theme", "light");
  render(<ThemeSwitcher />);
  fireEvent.click(screen.getByRole("button", { name: "主题" }));
  expect(document.documentElement.dataset.theme).toBe("dark");
});
