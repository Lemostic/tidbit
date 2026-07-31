import { invoke } from "@tauri-apps/api/core";

export type DesktopOs = "windows" | "macos";
export type WindowChrome = "custom" | "native";
export type ShortcutModifier = "Ctrl" | "Command";

export interface DesktopCapabilities {
  edgeDock: boolean;
  edgeAutoHide: boolean;
  autostart: boolean;
  directoryPicker: boolean;
  transparentWindows: boolean;
}

export interface DesktopProfile {
  os: DesktopOs;
  windowChrome: WindowChrome;
  shortcutModifier: ShortcutModifier;
  capabilities: DesktopCapabilities;
}

export const windowsDesktopProfile: DesktopProfile = {
  os: "windows",
  windowChrome: "custom",
  shortcutModifier: "Ctrl",
  capabilities: {
    edgeDock: true,
    edgeAutoHide: true,
    autostart: true,
    directoryPicker: true,
    transparentWindows: true,
  },
};

export const macDesktopProfile: DesktopProfile = {
  os: "macos",
  windowChrome: "native",
  shortcutModifier: "Command",
  capabilities: {
    edgeDock: false,
    edgeAutoHide: false,
    autostart: true,
    directoryPicker: true,
    transparentWindows: true,
  },
};

export function formatShortcut(modifier: ShortcutModifier, key: string, shift = false): string {
  if (modifier === "Command") return `⌘${shift ? "⇧" : ""}${key}`;
  return `Ctrl+${shift ? "Shift+" : ""}${key}`;
}

type ProfileLoader = () => Promise<DesktopProfile>;

export async function loadDesktopProfile(
  loader: ProfileLoader = () => invoke<DesktopProfile>("desktop_profile"),
): Promise<DesktopProfile> {
  try {
    return await loader();
  } catch {
    return windowsDesktopProfile;
  }
}

export function isDockingEnabled(profile: DesktopProfile, preference: boolean): boolean {
  return profile.capabilities.edgeDock && preference;
}
