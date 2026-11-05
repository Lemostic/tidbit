import { useEffect } from "react";
import { appearanceChangedEvent, applyAppearance, loadAppearance, type AppearancePreferences } from "../../ui/appearance";
import { applyFontPreferences, loadFontPreferences } from "../../ui/fontPreferences";
import { applyGlassEffect, applyGlassOpacity, loadGlassEffect, loadGlassOpacity } from "../../ui/glassEffect";
import { Clothesline } from "./Clothesline";

/**
 * Root component for the `clothesline` Tauri window. Mounts the rope UI and
 * applies the same appearance (theme + glass + fonts) the main window uses
 * so cards read coherently across windows.
 */
export function ClotheslineApp() {
  useEffect(() => {
    applyAppearance(loadAppearance());
    applyFontPreferences(loadFontPreferences());
    applyGlassEffect(loadGlassEffect());
    applyGlassOpacity(loadGlassOpacity());
    let disposed = false;
    void import("@tauri-apps/api/event").then(async ({ listen }) => {
      const unlisten = await listen<AppearancePreferences>(appearanceChangedEvent, (event) => applyAppearance(event.payload));
      if (disposed) unlisten();
    });
    return () => {
      disposed = true;
    };
  }, []);

  return <Clothesline />;
}
