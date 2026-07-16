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
