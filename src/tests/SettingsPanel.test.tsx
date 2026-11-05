import { fireEvent, render, screen, within } from "@testing-library/react";
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
    wanderOpacity: 88,
    glassEnabled: false,
    glassOpacity: 80,
    clotheslineAutoShow: false,
    onClose: vi.fn(),
    onDockingChange: vi.fn(),
    onAutostartChange: vi.fn(),
    onLockPinChange: vi.fn(),
    onFontsChange: vi.fn(),
    onWanderOpacityChange: vi.fn(),
    onGlassChange: vi.fn(),
    onGlassOpacityChange: vi.fn(),
    onClotheslineAutoShowChange: vi.fn(),
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
  const onClotheslineAutoShowChange = vi.fn();
  renderSettings({ onGlassChange, onGlassOpacityChange, onDockingChange, onAutostartChange, onClotheslineAutoShowChange });

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

  fireEvent.click(screen.getByRole("checkbox", { name: "启动时显示晾衣绳" }));
  expect(onClotheslineAutoShowChange).toHaveBeenCalledTimes(1);
  expect(onClotheslineAutoShowChange).toHaveBeenCalledWith(true);
});

it("keeps autostart off by default and disables the switch while updating", () => {
  const { rerender, props } = renderSettings();
  expect(screen.getByRole("checkbox", { name: "开机自动启动" })).not.toBeChecked();

  rerender(<SettingsPanel {...props} autostartBusy />);
  expect(screen.getByRole("checkbox", { name: "开机自动启动" })).toBeDisabled();
});

it("closes only when the empty scrim is clicked", () => {
  const onClose = vi.fn();
  const { container } = renderSettings({ onClose });
  fireEvent.mouseDown(screen.getByRole("dialog", { name: "设置" }));
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.click(container.querySelector(".modal-scrim")!);
  expect(onClose).toHaveBeenCalledTimes(1);
});

it("moves focus into the dialog, keeps Tab inside it, and closes on Escape", () => {
  const onClose = vi.fn();
  const trigger = document.createElement("button");
  trigger.textContent = "打开设置";
  document.body.append(trigger);
  trigger.focus();

  const { unmount } = renderSettings({ onClose });
  const close = screen.getByRole("button", { name: "关闭设置" });
  const lastAction = screen.getByRole("button", { name: /显示窗口/ });
  const firstIndexLink = within(screen.getByRole("navigation", { name: "设置分区" })).getAllByRole("link")[0]!;

  expect(close).toHaveFocus();

  lastAction.focus();
  fireEvent.keyDown(document, { key: "Tab" });
  expect(firstIndexLink).toHaveFocus();

  firstIndexLink.focus();
  fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
  expect(lastAction).toHaveFocus();

  fireEvent.keyDown(document, { key: "Escape" });
  expect(onClose).toHaveBeenCalledOnce();

  unmount();
  expect(trigger).toHaveFocus();
  trigger.remove();
});

it("leaves keyboard handling to a dialog opened above the settings folio", () => {
  const onClose = vi.fn();
  renderSettings({ onClose });

  const overlay = document.createElement("div");
  overlay.setAttribute("role", "dialog");
  const unlock = document.createElement("button");
  unlock.textContent = "继续使用";
  overlay.append(unlock);
  document.body.append(overlay);

  try {
    unlock.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(unlock).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  } finally {
    overlay.remove();
  }
});

it("does not restore focus into the app when another dialog replaces settings", () => {
  const trigger = document.createElement("button");
  trigger.textContent = "打开设置";
  document.body.append(trigger);
  trigger.focus();

  const { props, rerender } = renderSettings();
  const overlay = document.createElement("div");
  overlay.setAttribute("role", "dialog");
  document.body.append(overlay);

  try {
    rerender(<SettingsPanel {...props} open={false} />);
    expect(trigger).not.toHaveFocus();
  } finally {
    overlay.remove();
    trigger.remove();
  }
});

it("keeps the focus loop on visible controls when the index rail is collapsed", () => {
  renderSettings();
  const panel = screen.getByRole("dialog", { name: "设置" });
  const index = panel.querySelector<HTMLElement>(".settings-index");
  const close = screen.getByRole("button", { name: "关闭设置" });
  const lastAction = screen.getByRole("button", { name: /显示窗口/ });

  if (!index) throw new Error("expected settings index");
  index.style.display = "none";

  lastAction.focus();
  fireEvent.keyDown(document, { key: "Tab" });
  expect(close).toHaveFocus();

  close.focus();
  fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
  expect(lastAction).toHaveFocus();
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

it("renders the settings folio index and five labelled sections", () => {
  renderSettings();
  const panel = screen.getByRole("dialog", { name: "设置" });
  expect(panel.querySelector(".settings-index")).toBeInTheDocument();

  const nav = screen.getByRole("navigation", { name: "设置分区" });
  const links = within(nav).getAllByRole("link");
  expect(links).toHaveLength(5);
  expect(links.map((link) => link.getAttribute("href"))).toEqual([
    "#settings-appearance",
    "#settings-behavior",
    "#settings-typography",
    "#settings-data",
    "#settings-backup",
  ]);

  const sections = Array.from(panel.querySelectorAll(".settings-section"));
  expect(sections).toHaveLength(5);
  for (const section of sections) {
    const labelledBy = section.getAttribute("aria-labelledby")!;
    expect(labelledBy).toBeTruthy();
    expect(section.querySelector(`#${labelledBy}`)).toBeInTheDocument();
  }
});

it("keeps every settings control inside the folio", () => {
  renderSettings();

  expect(screen.getByRole("combobox", { name: "主题" })).toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: "液态玻璃" })).toBeInTheDocument();
  expect(screen.getByLabelText("液态玻璃不透明度")).toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: "边缘吸附" })).toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: "开机自动启动" })).toBeInTheDocument();
  expect(screen.getByLabelText("左侧分组")).toBeInTheDocument();
  expect(screen.getByLabelText("便签标题")).toBeInTheDocument();
  expect(screen.getByLabelText("便签正文")).toBeInTheDocument();
  expect(screen.getByLabelText(/云游便签透明度/)).toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: "启动时显示晾衣绳" })).toBeInTheDocument();
  expect(screen.getByLabelText("数据目录")).toBeInTheDocument();
  expect(screen.getByLabelText("隐私锁定密码")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /立即备份/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /恢复备份/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /打开目录/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /显示窗口/ })).toBeInTheDocument();
});

it("moves through the folio index without closing or changing settings", () => {
  const onClose = vi.fn();
  const onGlassChange = vi.fn();
  renderSettings({ onClose, onGlassChange });

  const nav = screen.getByRole("navigation", { name: "设置分区" });
  const dataLink = within(nav).getByRole("link", { name: /数据与安全/ });
  const target = document.getElementById("settings-data")!;
  const scrollIntoView = vi.fn();
  Object.defineProperty(target, "scrollIntoView", {
    configurable: true,
    value: scrollIntoView,
  });

  fireEvent.click(dataLink);

  expect(scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "smooth" });
  expect(onClose).not.toHaveBeenCalled();
  expect(onGlassChange).not.toHaveBeenCalled();
});

it("defines the wide folio and compact single-column contracts", () => {
  const css = readFileSync(resolve(process.cwd(), "src/styles/atelier.css"), "utf8");
  const panel = css.match(/\.settings-panel \{([\s\S]*?)\n\}/)?.[1] ?? "";

  expect(panel).toContain("grid-template-columns: 252px minmax(0, 1fr);");
  expect(panel).toContain("width: min(1040px, calc(100vw - 72px));");
  expect(panel).toContain("height: min(760px, calc(100vh - 96px));");
  expect(panel).toContain("max-height: min(760px, calc(100vh - 96px));");

  const body = css.match(/\.settings-panel__body \{([\s\S]*?)\n\}/)?.[1] ?? "";
  expect(body).toContain("overflow-y: auto;");
  expect(body).toContain("min-width: 0;");

  const narrowStart = css.indexOf("@media (max-width: 900px)");
  const compactStart = css.indexOf("@media (max-width: 760px)");
  const narrow = css.slice(narrowStart, compactStart);
  expect(narrowStart).toBeGreaterThanOrEqual(0);
  expect(narrow).toContain(".settings-index {");
  expect(narrow).toContain("display: none;");
  expect(narrow).toContain("grid-template-columns: minmax(0, 1fr);");

  const compact = css.slice(compactStart, css.indexOf("@media (max-width: 430px)", compactStart));
  expect(compactStart).toBeGreaterThanOrEqual(0);
  expect(compact).toContain("width: 100%;");
  expect(compact).toContain("height: calc(100vh - 20px);");
  expect(compact).toContain(".settings-panel .settings-grid--2,");
  expect(compact).toContain(".settings-panel .settings-fonts__grid,");
  expect(compact).toContain(".settings-panel .settings-actions {");
});

it("keeps functional settings copy at least 10px", () => {
  const css = readFileSync(resolve(process.cwd(), "src/styles/atelier.css"), "utf8");
  const blocks = [
    css.match(/\.settings-index__label small \{([\s\S]*?)\n\}/)?.[1] ?? "",
    css.match(/\.settings-index__foot \{([\s\S]*?)\n\}/)?.[1] ?? "",
    css.match(/\.settings-opacity__scale \{([\s\S]*?)\n\}/)?.[1] ?? "",
  ];

  for (const block of blocks) {
    expect(block).toContain("font-size: 10px;");
  }
});
