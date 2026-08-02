const glassStorageKey = "liquid-glass-enabled";
const glassOpacityStorageKey = "liquid-glass-opacity";
export const defaultGlassOpacity = 80;

function clampGlassOpacity(opacity: number) {
  return Math.min(100, Math.max(55, Math.round(opacity)));
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
  // The stored 55-100 value now drives backdrop-filter strength rather
  // than a literal alpha: 55% → ~18px blur / 1.20 saturation, 100% →
  // ~42px / 1.60. Panel surfaces stay opaque under glass mode.
  const clamped = clampGlassOpacity(opacity);
  const t = (clamped - 55) / 45; // 0..1
  const blur = 18 + t * 24; // px
  const saturation = 1.2 + t * 0.4;
  const root = document.documentElement;
  root.style.setProperty("--liquid-glass-blur", `${blur.toFixed(2)}px`);
  root.style.setProperty("--liquid-glass-saturation", saturation.toFixed(2));
  root.style.setProperty("--liquid-glass-strength", `${clamped}%`);
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
