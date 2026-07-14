const glassStorageKey = "liquid-glass-enabled";
const glassOpacityStorageKey = "liquid-glass-opacity";
export const defaultGlassOpacity = 92;
export const minimumGlassOpacity = 65;

function clampGlassOpacity(opacity: number) {
  return Math.min(100, Math.max(minimumGlassOpacity, Math.round(opacity)));
}

export function loadGlassEffect() {
  return localStorage.getItem(glassStorageKey) === "true";
}

export function applyGlassEffect(enabled: boolean) {
  document.documentElement.toggleAttribute("data-liquid-glass", enabled);
}

export function loadGlassOpacity() {
  const stored = Number(localStorage.getItem(glassOpacityStorageKey));
  return Number.isFinite(stored) && stored > 0 ? clampGlassOpacity(stored) : defaultGlassOpacity;
}

export function applyGlassOpacity(opacity: number) {
  const next = clampGlassOpacity(opacity);
  document.documentElement.style.setProperty("--liquid-glass-opacity", `${next}%`);
  document.documentElement.toggleAttribute("data-liquid-glass-solid", next === 100);
}

export function saveGlassOpacity(opacity: number) {
  const next = clampGlassOpacity(opacity);
  localStorage.setItem(glassOpacityStorageKey, String(next));
  applyGlassOpacity(next);
}

export function saveGlassEffect(enabled: boolean) {
  localStorage.setItem(glassStorageKey, String(enabled));
  applyGlassEffect(enabled);
}
