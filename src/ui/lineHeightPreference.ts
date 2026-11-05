/**
 * Persisted user preference for the note body line-height (in `em` units).
 *
 * Controls `var(--note-line-height)` so every note surface (card preview,
 * editor body, wandering sticky-note) follows the same value. We deliberately
 * keep this out of the SQLite-backed settings table so it follows the same
 * pattern as font preferences — localStorage with a v1 schema key so we can
 * roll forward without breaking older installs.
 */
const storageKey = "line-height-preference-v1";

export const minLineHeight = 1.0;
export const maxLineHeight = 2.0;
export const defaultLineHeight = 1.5;
export const lineHeightStep = 0.05;

export function clampLineHeight(value: number): number {
  if (!Number.isFinite(value)) return defaultLineHeight;
  return Math.min(maxLineHeight, Math.max(minLineHeight, value));
}

/** Snap to the slider grid so the persisted value matches what the UI shows. */
export function snapLineHeight(value: number): number {
  const clamped = clampLineHeight(value);
  return Math.round(clamped / lineHeightStep) * lineHeightStep;
}

function parseStored(value: string | null): number {
  if (value === null) return defaultLineHeight;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : defaultLineHeight;
}

export function loadLineHeightPreference(
  storage: Pick<Storage, "getItem"> = localStorage,
): number {
  return clampLineHeight(parseStored(storage.getItem(storageKey)));
}

export function applyLineHeightPreference(value: number, root: HTMLElement = document.documentElement) {
  root.style.setProperty("--note-line-height", String(snapLineHeight(value)));
}

export function saveLineHeightPreference(
  value: number,
  storage: Pick<Storage, "setItem"> = localStorage,
) {
  const snapped = snapLineHeight(value);
  storage.setItem(storageKey, String(snapped));
  applyLineHeightPreference(snapped);
}