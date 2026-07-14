import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";
import { SettingsPanel } from "../features/settings/SettingsPanel";
import { supportedLocales, translate } from "../i18n";
import en from "../../resources/locales/en/translation.json";
import zhCN from "../../resources/locales/zh-CN/translation.json";

function keys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([key, child]) => keys(child, prefix ? `${prefix}.${key}` : key));
}

beforeEach(() => localStorage.clear());

it("ships complete Simplified Chinese and English resource trees", () => {
  expect(supportedLocales.map((locale) => locale.code)).toEqual(["zh-CN", "en"]);
  expect(keys(en).sort()).toEqual(keys(zhCN).sort());
  expect(translate("notes.count", { count: 3 }, "en")).toBe("3 notes");
  expect(translate("notes.count", { count: 3 }, "zh-CN")).toBe("3 条便签");
});

it("switches settings language immediately", () => {
  const props: Parameters<typeof SettingsPanel>[0] = {
    open: true, dockingEnabled: true, lockPin: "", busy: false,
    fonts: { group: "Segoe UI", noteTitle: "Segoe UI", noteBody: "Segoe UI" },
    wanderOpacity: 94, glassEnabled: false, glassOpacity: 92, copyFormat: "markdown",
    backupIntervalHours: 1, backupRetentionCount: 1,
    onClose: () => {}, onDockingChange: () => {}, onLockPinChange: () => {}, onFontsChange: () => {},
    onWanderOpacityChange: () => {}, onGlassChange: () => {}, onGlassOpacityChange: () => {}, onCopyFormatChange: () => {},
    onBackupIntervalChange: () => {}, onBackupRetentionChange: () => {}, onBackup: () => {}, onRestore: () => {},
    onOpenBackups: () => {}, onShowHidden: () => {}, dataDirectory: "C:\\data", defaultDataDirectory: "C:\\default",
    dataDirectoryBusy: false, onDataDirectoryChange: () => {}, onPickDataDirectory: () => {}, onSaveDataDirectory: () => {}, onResetDataDirectory: () => {},
  };
  render(<SettingsPanel {...props} />);
  fireEvent.change(screen.getByRole("combobox", { name: "界面语言" }), { target: { value: "en" } });
  expect(screen.getByRole("combobox", { name: "Language" })).toHaveValue("en");
  expect(document.documentElement.lang).toBe("en");
});
