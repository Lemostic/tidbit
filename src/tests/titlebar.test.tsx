import { expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock Tauri window API before importing Titlebar
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    minimize: vi.fn(),
    toggleMaximize: vi.fn(),
    close: vi.fn(),
  }),
}));

import { Titlebar } from "../app/Titlebar";

test("renders window controls", () => {
  render(<Titlebar />);
  expect(screen.getByRole("button", { name: /minimize/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /maximize/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
});
