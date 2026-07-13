const allowedTags = new Set([
  "A", "BLOCKQUOTE", "BR", "CODE", "DEL", "EM", "H1", "H2", "H3", "H4",
  "HR", "LI", "OL", "P", "PRE", "S", "STRIKE", "STRONG", "UL",
]);

const removableTags = new Set(["IFRAME", "OBJECT", "SCRIPT", "STYLE", "TEMPLATE"]);

export function sanitizeNoteHtml(html: string): string {
  if (!html || typeof DOMParser === "undefined") return "";
  const document = new DOMParser().parseFromString(html, "text/html");

  for (const element of Array.from(document.body.querySelectorAll("*"))) {
    if (removableTags.has(element.tagName)) {
      element.remove();
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
