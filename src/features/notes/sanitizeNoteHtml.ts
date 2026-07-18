import { cleanTimelineDescription, cleanTimelineSingleLine, normalizeTimelineDate, normalizeTimelineTime } from "./timelineCardModel";

const allowedTags = new Set([
  "A", "BLOCKQUOTE", "BR", "CODE", "DEL", "EM", "H1", "H2", "H3", "H4",
  "HR", "LI", "OL", "P", "PRE", "S", "STRIKE", "STRONG", "UL",
]);

const removableTags = new Set(["IFRAME", "OBJECT", "SCRIPT", "STYLE", "TEMPLATE"]);

function isSafeAudioDataUrl(value: string): boolean {
  const prefix = /^data:audio\/(?:webm|ogg|mp4|mpeg|wav|x-m4a)(?:;codecs=[a-z0-9.+-]+)?;base64,/i.exec(value);
  if (!prefix) return false;
  const payload = value.slice(prefix[0].length);
  return payload.length > 0 && !/[^a-z0-9+/=]/i.test(payload);
}

export function sanitizeNoteHtml(html: string): string {
  if (!html || typeof DOMParser === "undefined") return "";
  const document = new DOMParser().parseFromString(html, "text/html");
  for (const element of Array.from(document.body.querySelectorAll("iframe, object, script, style, template"))) element.remove();

  for (const element of Array.from(document.body.querySelectorAll("*"))) {
    if (removableTags.has(element.tagName)) {
      element.remove();
      continue;
    }

    if (element.tagName === "DIV" && element.hasAttribute("data-audio-recording")) {
      const name = (element.getAttribute("data-name") ?? "语音备忘录").replace(/[\r\n]+/g, " ").trim().slice(0, 120) || "语音备忘录";
      const duration = Math.max(0, Number(element.getAttribute("data-duration-ms")) || 0);
      const mimeType = element.getAttribute("data-mime-type") ?? "audio/webm";
      for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name);
      element.setAttribute("data-audio-recording", "true");
      element.setAttribute("data-name", name);
      element.setAttribute("data-duration-ms", String(duration));
      if (/^audio\/(?:webm|ogg|mp4|mpeg|wav|x-m4a)(?:;codecs=[a-z0-9.+-]+)?$/i.test(mimeType)) {
        element.setAttribute("data-mime-type", mimeType);
      }
      continue;
    }

    if (element.tagName === "DIV" && element.hasAttribute("data-timeline-card")) {
      const title = cleanTimelineSingleLine(element.getAttribute("data-title"), "时间轴");
      for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name);
      element.setAttribute("data-timeline-card", "true");
      element.setAttribute("data-title", title);
      continue;
    }

    const timelineContainer = element.closest("div[data-timeline-card]");
    if (timelineContainer) {
      if (element.tagName === "DIV" && (element.hasAttribute("data-timeline-header") || element.hasAttribute("data-timeline-content"))) {
        const marker = element.hasAttribute("data-timeline-header") ? "data-timeline-header" : "data-timeline-content";
        for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name);
        element.setAttribute(marker, "true");
        continue;
      }

      if (element.tagName === "OL" && element.hasAttribute("data-timeline-items")) {
        for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name);
        element.setAttribute("data-timeline-items", "true");
        continue;
      }

      if (element.tagName === "LI" && element.hasAttribute("data-timeline-item")) {
        const id = cleanTimelineSingleLine(element.getAttribute("data-id"));
        const date = normalizeTimelineDate(element.getAttribute("data-date"));
        const time = normalizeTimelineTime(element.getAttribute("data-time"));
        for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name);
        element.setAttribute("data-timeline-item", "true");
        if (id) element.setAttribute("data-id", id);
        if (date) element.setAttribute("data-date", date);
        if (time) element.setAttribute("data-time", time);
        continue;
      }

      if (element.tagName === "TIME" && element.hasAttribute("data-timeline-date")) {
        const date = normalizeTimelineDate(element.closest("li[data-timeline-item]")?.getAttribute("data-date"));
        const time = normalizeTimelineTime(element.closest("li[data-timeline-item]")?.getAttribute("data-time"));
        for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name);
        element.setAttribute("data-timeline-date", "true");
        if (date) element.setAttribute("datetime", `${date}${time ? `T${time}` : ""}`);
        element.textContent = [date, time].filter(Boolean).join(" ") || "未设置时间";
        continue;
      }

      if (element.tagName === "SPAN" && element.hasAttribute("data-timeline-title")) {
        for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name);
        element.setAttribute("data-timeline-title", "true");
        element.textContent = cleanTimelineSingleLine(timelineContainer.getAttribute("data-title"), "时间轴");
        continue;
      }

      if (element.tagName === "STRONG" && element.hasAttribute("data-timeline-item-title")) {
        const title = cleanTimelineSingleLine(element.textContent, "未命名事件");
        for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name);
        element.setAttribute("data-timeline-item-title", "true");
        element.textContent = title;
        continue;
      }

      if (element.tagName === "P" && element.hasAttribute("data-timeline-item-description")) {
        const description = cleanTimelineDescription(element.textContent);
        for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name);
        element.setAttribute("data-timeline-item-description", "true");
        element.textContent = description;
        continue;
      }

      element.replaceWith(...Array.from(element.childNodes));
      continue;
    }

    const recordingContainer = element.closest("div[data-audio-recording]");
    if (element.tagName === "SPAN" && recordingContainer) {
      const marker = element.hasAttribute("data-audio-name") ? "data-audio-name" : element.hasAttribute("data-audio-duration") ? "data-audio-duration" : null;
      for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name);
      if (marker) element.setAttribute(marker, "true");
      else element.replaceWith(...Array.from(element.childNodes));
      continue;
    }

    if (element.tagName === "AUDIO" && recordingContainer) {
      const src = element.getAttribute("src") ?? "";
      for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name);
      if (!isSafeAudioDataUrl(src)) {
        element.remove();
        continue;
      }
      element.setAttribute("src", src);
      element.setAttribute("controls", "");
      element.setAttribute("preload", "metadata");
      continue;
    }

    const isTaskList = element.tagName === "UL" && (
      element.getAttribute("data-type") === "taskList" || element.classList.contains("contains-task-list")
    );
    if (isTaskList) {
      for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name);
      element.setAttribute("data-type", "taskList");
      continue;
    }

    const isTaskItem = element.tagName === "LI" && (
      element.getAttribute("data-type") === "taskItem"
      || element.classList.contains("task-list-item")
      || Boolean(element.parentElement?.matches('ul[data-type="taskList"]'))
    );
    if (isTaskItem) {
      const checked = element.getAttribute("data-checked") === "true"
        || Boolean(element.querySelector('input[type="checkbox"]:checked'));
      for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name);
      element.setAttribute("data-type", "taskItem");
      element.setAttribute("data-checked", String(checked));
      continue;
    }

    const taskItem = element.closest('li[data-type="taskItem"]');
    if (element.tagName === "INPUT" && taskItem && element.getAttribute("type") === "checkbox") {
      const checked = taskItem.getAttribute("data-checked") === "true" || element.hasAttribute("checked");
      for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name);
      element.setAttribute("type", "checkbox");
      element.setAttribute("data-task-checkbox", "true");
      element.toggleAttribute("checked", checked);
      element.setAttribute("aria-label", checked ? "标记待办为未完成" : "标记待办为已完成");
      continue;
    }

    if (taskItem && (element.tagName === "DIV" || element.tagName === "LABEL" || element.tagName === "SPAN")) {
      for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name);
      continue;
    }

    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      continue;
    }

    const href = element.tagName === "A" ? element.getAttribute("href") : null;
    for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name);
    if (element.tagName === "A" && href && /^(https?:|mailto:|#)/i.test(href)) {
      element.setAttribute("href", href);
      element.setAttribute("target", "_blank");
      element.setAttribute("rel", "noreferrer noopener");
    }
  }

  return document.body.innerHTML;
}
