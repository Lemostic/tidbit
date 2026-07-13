import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import { SettingsPanel } from "../features/settings/SettingsPanel";
import "../styles/globals.css";

function renderSettings(overrides: Partial<Parameters<typeof SettingsPanel>[0]> = {}) {
  const props: Parameters<typeof SettingsPanel>[0] = {
    open: true,
    dockingEnabled: true,
    lockPin: "",
    busy: false,
    fonts: { group: "Segoe UI", noteTitle: "Segoe UI", noteBody: "Segoe UI" },
    wanderOpacity: 88,
    glassEnabled: false,
    glassOpacity: 80,
    onClose: vi.fn(),
    onDockingChange: vi.fn(),
    onLockPinChange: vi.fn(),
    onFontsChange: vi.fn(),
    onWanderOpacityChange: vi.fn(),
    onGlassChange: vi.fn(),
    onGlassOpacityChange: vi.fn(),
    onBackup: vi.fn(),
    onRestore: vi.fn(),
    onOpenBackups: vi.fn(),
    onShowHidden: vi.fn(),
    dataDirectory: "C:\\data",
    defaultDataDirectory: "C:\\default",
    dataDirectoryBusy: false,
    onDataDirectoryChange: vi.fn(),
    onPickDataDirectory: vi.fn(),
    onSaveDataDirectory: vi.fn(),
    onResetDataDirectory: vi.fn(),
    ...overrides,
  };
  const view = render(<SettingsPanel {...props} />);
  return { props, ...view };
}

it("changes each switch exactly once and only from its control", () => {
  const onGlassChange = vi.fn();
  const onGlassOpacityChange = vi.fn();
  const onDockingChange = vi.fn();
  renderSettings({ onGlassChange, onGlassOpacityChange, onDockingChange });

  fireEvent.click(screen.getByText("液态玻璃"));
  expect(onGlassChange).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("checkbox", { name: "液态玻璃" }));
  expect(onGlassChange).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole("checkbox", { name: "边缘吸附" }));
  expect(onDockingChange).toHaveBeenCalledTimes(1);

  fireEvent.change(screen.getByLabelText("液态玻璃不透明度"), { target: { value: "76" } });
  expect(onGlassOpacityChange).toHaveBeenCalledOnce();
  expect(onGlassOpacityChange).toHaveBeenCalledWith(76);
});

it("closes only when the empty scrim is clicked", () => {
  const onClose = vi.fn();
  const { container } = renderSettings({ onClose });
  fireEvent.mouseDown(screen.getByRole("dialog", { name: "设置" }));
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.click(container.querySelector(".modal-scrim")!);
  expect(onClose).toHaveBeenCalledTimes(1);
});

it("keeps the lower settings reachable through an internal scroll region", () => {
  renderSettings();
  const panel = screen.getByRole("dialog", { name: "设置" });
  expect(panel.querySelector(".settings-panel__body")).toBeInTheDocument();
  const styles = readFileSync(resolve(process.cwd(), "src/styles/globals.css"), "utf8");
  expect(styles).toContain(".settings-panel, .restore-panel { display: flex; flex-direction: column; }");
  expect(styles).toContain(".settings-panel__body { flex: 1; min-height: 0; overflow-y: auto;");
  expect(styles).toContain(".modal-scrim, .confirm-scrim { inset: 0; overflow: hidden; border-radius: var(--app-radius); }");
  expect(screen.getByLabelText("隐私锁定密码")).toBeInTheDocument();
});
