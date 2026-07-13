import { emit } from "@tauri-apps/api/event";
import { applyGlassEffect, applyGlassOpacity, loadGlassEffect, loadGlassOpacity } from "./glassEffect";
import { applyTheme, type Theme } from "./theme";

export const appearanceChangedEvent = "tidbit://appearance-changed";

export interface AppearancePreferences {
  theme: Theme;
  glassEnabled: boolean;
  glassOpacity: number;
}

function loadTheme(): Theme {
  const stored = localStorage.getItem("theme");
  return stored === "dark" || stored === "sepia" ? stored : "light";
}

export function loadAppearance(): AppearancePreferences {
  return {
    theme: loadTheme(),
    glassEnabled: loadGlassEffect(),
    glassOpacity: loadGlassOpacity(),
  };
}

export function applyAppearance(preferences: AppearancePreferences) {
  applyTheme(preferences.theme);
  applyGlassEffect(preferences.glassEnabled);
  applyGlassOpacity(preferences.glassOpacity);
}

export async function broadcastAppearance() {
  await emit(appearanceChangedEvent, loadAppearance());
}
