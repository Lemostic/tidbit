import { render, fireEvent } from "@testing-library/react";
import { ThemeSwitcher } from "../features/settings/ThemeSwitcher";

it("applies theme attribute", () => {
  render(<ThemeSwitcher />);
  fireEvent.change(document.querySelector("select")!, { target: { value: "dark" } });
  expect(document.documentElement.dataset.theme).toBe("dark");
});
