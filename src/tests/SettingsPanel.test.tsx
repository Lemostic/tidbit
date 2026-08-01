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
    autostartEnabled: false,
    autostartBusy: false,
    lockPin: "",
    busy: false,
    fonts: { group: "Segoe UI", noteTitle: "Segoe UI", noteBody: "Segoe UI" },
    availableFonts: ["Arial", "Microsoft YaHei UI", "Segoe UI"],
    fontsLoading: false,
    wanderOpacity: 88,
    glassEnabled: false,
    glassOpacity: 80,
    windowWidth: 780,
    windowHeight: 1100,
    windowSizeBusy: false,
    onClose: vi.fn(),
    onDockingChange: vi.fn(),
    onAutostartChange: vi.fn(),
    onLockPinChange: vi.fn(),
    onFontsChange: vi.fn(),
    onWanderOpacityChange: vi.fn(),
    onGlassChange: vi.fn(),
    onGlassOpacityChange: vi.fn(),
    onApplyWindowSize: vi.fn(),
    onResetWindowSize: vi.fn(),
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
  const onAutostartChange = vi.fn();
  renderSettings({ onGlassChange, onGlassOpacityChange, onDockingChange, onAutostartChange });

  fireEvent.click(screen.getByText("液态玻璃"));
  expect(onGlassChange).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("checkbox", { name: "液态玻璃" }));
  expect(onGlassChange).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole("checkbox", { name: "边缘吸附" }));
  expect(onDockingChange).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByText("开机自动启动"));
  expect(onAutostartChange).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("checkbox", { name: "开机自动启动" }));
  expect(onAutostartChange).toHaveBeenCalledTimes(1);
  expect(onAutostartChange).toHaveBeenCalledWith(true);

  fireEvent.change(screen.getByLabelText("液态玻璃不透明度"), { target: { value: "76" } });
  expect(onGlassOpacityChange).toHaveBeenCalledOnce();
  expect(onGlassOpacityChange).toHaveBeenCalledWith(76);
});

it("keeps autostart off by default and disables the switch while updating", () => {
  const { rerender, props } = renderSettings();
  expect(screen.getByRole("checkbox", { name: "开机自动启动" })).not.toBeChecked();

  rerender(<SettingsPanel {...props} autostartBusy />);
  expect(screen.getByRole("checkbox", { name: "开机自动启动" })).toBeDisabled();
});

it("applies, tracks, and resets the main window dimensions", () => {
  const onApplyWindowSize = vi.fn();
  const onResetWindowSize = vi.fn();
  const { rerender, props } = renderSettings({ onApplyWindowSize, onResetWindowSize });

  fireEvent.change(screen.getByLabelText("软件主体宽度"), { target: { value: "920" } });
  fireEvent.change(screen.getByLabelText("软件主体高度"), { target: { value: "1280" } });
  fireEvent.click(screen.getByRole("button", { name: "应用尺寸" }));
  expect(onApplyWindowSize).toHaveBeenCalledWith(920, 1280);

  rerender(<SettingsPanel {...props} windowWidth={860} windowHeight={1240} />);
  expect(screen.getByLabelText("软件主体宽度")).toHaveValue(860);
  expect(screen.getByLabelText("软件主体高度")).toHaveValue(1240);

  fireEvent.click(screen.getByRole("button", { name: "恢复默认窗口尺寸" }));
  expect(onResetWindowSize).toHaveBeenCalledOnce();
  expect(screen.getByLabelText("软件主体宽度")).toHaveValue(780);
  expect(screen.getByLabelText("软件主体高度")).toHaveValue(820);
});

it("blocks invalid window dimensions and explains the accepted range", () => {
  const onApplyWindowSize = vi.fn();
  renderSettings({ onApplyWindowSize });

  fireEvent.change(screen.getByLabelText("软件主体宽度"), { target: { value: "400" } });
  expect(screen.getByLabelText("软件主体宽度")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByText("宽度需在 520-3840 之间。")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "应用尺寸" })).toBeDisabled();
  expect(onApplyWindowSize).not.toHaveBeenCalled();
});

it("shows the loaded Windows font list in every font selector", () => {
  const onFontsChange = vi.fn();
  renderSettings({ availableFonts: ["Arial", "Consolas", "Microsoft YaHei UI"], onFontsChange });

  const groupFont = screen.getByRole("combobox", { name: "左侧分组字体" });
  expect(groupFont).toContainElement(screen.getAllByRole("option", { name: "Consolas" })[0]!);
  fireEvent.change(groupFont, { target: { value: "Consolas" } });
  expect(onFontsChange).toHaveBeenCalledWith({ group: "Consolas", noteTitle: "Segoe UI", noteBody: "Segoe UI" });
  expect(screen.getByText(/已加载 \d+ 种可用字体/)).toBeInTheDocument();
});

it("reports while the Windows font list is loading", () => {
  renderSettings({ fontsLoading: true });
  expect(screen.getByText("正在读取 Windows 系统字体…")).toBeInTheDocument();
});

it("provides a compact category navigator for the settings scroll region", () => {
  renderSettings();
  expect(screen.getByRole("navigation", { name: "设置分类" })).toBeInTheDocument();
  const windowSectionButton = screen.getByRole("button", { name: "窗口" });
  fireEvent.click(windowSectionButton);
  expect(windowSectionButton).toHaveClass("is-active");
  expect(windowSectionButton).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("button", { name: "外观" })).not.toHaveClass("is-active");
});

it("moves focus into the dialog and wraps keyboard focus within it", () => {
  const onClose = vi.fn();
  renderSettings({ onClose });
  const close = screen.getByRole("button", { name: "关闭设置" });
  const last = screen.getByRole("button", { name: /显示窗口/ });

  expect(close).toHaveFocus();
  last.focus();
  fireEvent.keyDown(last, { key: "Tab" });
  expect(close).toHaveFocus();
  fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
  expect(last).toHaveFocus();
  fireEvent.keyDown(close, { key: "Escape" });
  expect(onClose).toHaveBeenCalledOnce();
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

it("routes wheel input from the settings panel to its scroll region", () => {
  renderSettings();
  const panel = screen.getByRole("dialog", { name: "设置" });
  const body = screen.getByLabelText("设置内容");
  Object.defineProperties(body, {
    clientHeight: { configurable: true, value: 400 },
    scrollHeight: { configurable: true, value: 1200 },
  });

  const wheel = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 240 });
  fireEvent(panel, wheel);

  expect(body.scrollTop).toBe(240);
  expect(wheel.defaultPrevented).toBe(true);
});

it("supports keyboard paging without trapping wheel input at a scroll boundary", () => {
  renderSettings();
  const panel = screen.getByRole("dialog", { name: "设置" });
  const body = screen.getByLabelText("设置内容");
  Object.defineProperties(body, {
    clientHeight: { configurable: true, value: 400 },
    scrollHeight: { configurable: true, value: 1200 },
  });

  fireEvent.keyDown(body, { key: "PageDown" });
  expect(body.scrollTop).toBe(352);
  fireEvent.keyDown(body, { key: "End" });
  expect(body.scrollTop).toBe(1200);
  expect(screen.getByRole("button", { name: "维护" })).toHaveAttribute("aria-current", "page");

  body.scrollTop = 800;
  const boundaryWheel = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 120 });
  fireEvent(panel, boundaryWheel);
  expect(body.scrollTop).toBe(800);
  expect(boundaryWheel.defaultPrevented).toBe(false);
});
