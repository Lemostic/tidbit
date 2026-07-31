export interface MainWindowSize {
  width: number;
  height: number;
}

export const defaultMainWindowSize: MainWindowSize = { width: 780, height: 820 };
export const minimumMainWindowSize: MainWindowSize = { width: 520, height: 620 };
export const maximumMainWindowSize: MainWindowSize = { width: 3840, height: 2160 };
const workAreaMargin = 24;

const widthKey = "main-window-width";
const heightKey = "main-window-height";

function clamp(value: number, minimum: number, maximum: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

export function normalizeMainWindowSize(size: MainWindowSize): MainWindowSize {
  return {
    width: clamp(size.width, minimumMainWindowSize.width, maximumMainWindowSize.width, defaultMainWindowSize.width),
    height: clamp(size.height, minimumMainWindowSize.height, maximumMainWindowSize.height, defaultMainWindowSize.height),
  };
}

export function fitMainWindowSizeToWorkArea(size: MainWindowSize, workArea: MainWindowSize): MainWindowSize {
  const requested = normalizeMainWindowSize(size);
  const maximumVisibleWidth = Math.max(minimumMainWindowSize.width, Math.floor(workArea.width - workAreaMargin));
  const maximumVisibleHeight = Math.max(minimumMainWindowSize.height, Math.floor(workArea.height - workAreaMargin));
  return {
    width: Math.min(requested.width, maximumVisibleWidth),
    height: Math.min(requested.height, maximumVisibleHeight),
  };
}

export function loadMainWindowSize(): MainWindowSize {
  return normalizeMainWindowSize({
    width: Number(localStorage.getItem(widthKey) ?? defaultMainWindowSize.width),
    height: Number(localStorage.getItem(heightKey) ?? defaultMainWindowSize.height),
  });
}

export function saveMainWindowSize(size: MainWindowSize): MainWindowSize {
  const next = normalizeMainWindowSize(size);
  localStorage.setItem(widthKey, String(next.width));
  localStorage.setItem(heightKey, String(next.height));
  return next;
}

export function logicalSizeFromPhysical(size: MainWindowSize, scaleFactor: number): MainWindowSize {
  const scale = Number.isFinite(scaleFactor) && scaleFactor > 0 ? scaleFactor : 1;
  return normalizeMainWindowSize({ width: size.width / scale, height: size.height / scale });
}
