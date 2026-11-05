export const timelineTextMaxLength = 160;
export const timelineDescriptionMaxLength = 500;

export interface TimelineItemInput {
  id?: unknown;
  datetime?: unknown;
  date?: unknown;
  time?: unknown;
  title?: unknown;
  detail?: unknown;
  description?: unknown;
}

export interface TimelineItemData {
  id: string;
  datetime: string;
  title: string;
  description: string;
}

export function cleanTimelineSingleLine(value: unknown, fallback = ""): string {
  return String(value ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, timelineTextMaxLength) || fallback;
}

export function cleanTimelineDescription(value: unknown): string {
  return String(value ?? "").replace(/\r/g, "").trim().slice(0, timelineDescriptionMaxLength);
}

export function normalizeTimelineDate(value: unknown): string {
  const candidate = String(value ?? "");
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(candidate);
  if (!match) return "";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return "";
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? candidate : "";
}

export function normalizeTimelineTime(value: unknown): string {
  const candidate = String(value ?? "");
  const match = /^(\d{2}):(\d{2})$/.exec(candidate);
  if (!match) return "";
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours <= 23 && minutes <= 59 ? candidate : "";
}

export function normalizeTimelineDateTime(value: unknown): string {
  const candidate = String(value ?? "");
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(candidate);
  if (!match) return "";
  const date = normalizeTimelineDate(match[1]);
  const time = normalizeTimelineTime(match[2]);
  return date && time ? `${date}T${time}` : "";
}

export function combineTimelineDateTime(date: unknown, time: unknown): string {
  const normalizedDate = normalizeTimelineDate(date);
  if (!normalizedDate) return "";
  return `${normalizedDate}T${normalizeTimelineTime(time) || "00:00"}`;
}

export function normalizeTimelineItem(value: TimelineItemInput | null | undefined, index: number): TimelineItemData {
  return {
    id: cleanTimelineSingleLine(value?.id, `timeline-${index + 1}`),
    datetime: normalizeTimelineDateTime(value?.datetime) || combineTimelineDateTime(value?.date, value?.time),
    title: cleanTimelineSingleLine(value?.title, "未命名事件"),
    description: cleanTimelineDescription(value?.description ?? value?.detail),
  };
}
