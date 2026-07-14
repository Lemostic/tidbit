export type NoteCopyFormat = "markdown" | "plain";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const storageKey = "note-copy-format";
const blockTags = new Set(["ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "DIV", "DL", "H1", "H2", "H3", "H4", "H5", "H6", "HR", "OL", "P", "PRE", "SECTION", "TABLE", "UL"]);

export function loadNoteCopyFormat(storage: Pick<StorageLike, "getItem"> = localStorage): NoteCopyFormat {
  return storage.getItem(storageKey) === "plain" ? "plain" : "markdown";
}

export function saveNoteCopyFormat(format: NoteCopyFormat, storage: Pick<StorageLike, "setItem"> = localStorage) {
  storage.setItem(storageKey, format);
}

function normalizeInline(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[\t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

function inlineText(node: Node): string {
  if (node.nodeType === 3) return node.nodeValue ?? "";
  if (!(node instanceof Element)) return "";
  const tag = node.tagName;
  if (tag === "BR") return "\n";
  if (tag === "UL" || tag === "OL" || tag === "SCRIPT" || tag === "STYLE") return "";
  if (tag === "IMG") return node.getAttribute("alt") ?? "";
  if (tag === "INPUT" && node.getAttribute("type") === "checkbox") {
    return node.hasAttribute("checked") ? "☑ " : "☐ ";
  }
  return Array.from(node.childNodes).map(inlineText).join("");
}

function renderListItemContent(item: Element) {
  const parts: string[] = [];
  let inlineBuffer = "";
  const flushInline = () => {
    const text = normalizeInline(inlineBuffer);
    if (text) parts.push(text);
    inlineBuffer = "";
  };

  for (const node of Array.from(item.childNodes)) {
    if (node instanceof Element && (node.tagName === "UL" || node.tagName === "OL")) continue;
    if (node instanceof Element && blockTags.has(node.tagName)) {
      flushInline();
      const rendered = renderBlock(node, 0);
      if (rendered) parts.push(rendered);
    } else {
      inlineBuffer += inlineText(node);
    }
  }
  flushInline();
  return parts.join("\n");
}

function renderList(list: Element, depth: number): string {
  const items = Array.from(list.children).filter((child) => child.tagName === "LI");
  const ordered = list.tagName === "OL";
  const reversed = ordered && list.hasAttribute("reversed");
  const parsedStart = Number(list.getAttribute("start"));
  let counter = Number.isFinite(parsedStart) && list.hasAttribute("start") ? parsedStart : reversed ? items.length : 1;
  const direction = reversed ? -1 : 1;

  return items.map((item) => {
    const explicitValue = Number(item.getAttribute("value"));
    const number = ordered && Number.isFinite(explicitValue) && item.hasAttribute("value") ? explicitValue : counter;
    if (ordered) counter = number + direction;
    const prefix = ordered ? `${number}. ` : "• ";
    const indent = "  ".repeat(depth);
    const hangingIndent = indent + " ".repeat(prefix.length);
    const contentLines = renderListItemContent(item).split("\n");
    const firstLine = contentLines.shift() ?? "";
    const lines = [`${indent}${prefix}${firstLine}`.trimEnd()];
    lines.push(...contentLines.filter(Boolean).map((line) => `${hangingIndent}${line}`));
    const nestedLists = Array.from(item.children).filter((child) => child.tagName === "UL" || child.tagName === "OL");
    lines.push(...nestedLists.map((nested) => renderList(nested, depth + 1)).filter(Boolean));
    return lines.join("\n");
  }).join("\n");
}

function renderTable(table: Element) {
  return Array.from(table.querySelectorAll("tr"))
    .map((row) => Array.from(row.children)
      .filter((cell) => cell.tagName === "TH" || cell.tagName === "TD")
      .map((cell) => normalizeInline(inlineText(cell)))
      .join("\t"))
    .filter(Boolean)
    .join("\n");
}

function renderContainer(container: Element): string[] {
  const blocks: string[] = [];
  let inlineBuffer = "";
  const flushInline = () => {
    const text = normalizeInline(inlineBuffer);
    if (text) blocks.push(text);
    inlineBuffer = "";
  };

  for (const node of Array.from(container.childNodes)) {
    if (node instanceof Element && blockTags.has(node.tagName)) {
      flushInline();
      const rendered = renderBlock(node, 0);
      if (rendered) blocks.push(rendered);
    } else {
      inlineBuffer += inlineText(node);
    }
  }
  flushInline();
  return blocks;
}

function renderBlock(element: Element, depth: number): string {
  const tag = element.tagName;
  if (tag === "UL" || tag === "OL") return renderList(element, depth);
  if (tag === "PRE") return (element.textContent ?? "").replace(/\r\n?/g, "\n").trim();
  if (tag === "TABLE") return renderTable(element);
  if (tag === "HR") return "────────";
  if (["DIV", "SECTION", "ARTICLE", "ASIDE", "BLOCKQUOTE", "DL"].includes(tag)) return renderContainer(element).join("\n\n");
  return normalizeInline(inlineText(element));
}

export function htmlToFormattedText(html: string): string {
  if (!html.trim() || typeof DOMParser === "undefined") return "";
  const document = new DOMParser().parseFromString(html, "text/html");
  return renderContainer(document.body)
    .join("\n\n")
    .replace(/[\t ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function markdownToFormattedText(markdown: string) {
  return markdown
    .replace(/\r\n?/g, "\n")
    .replace(/^\s*(```|~~~).*$/gm, "")
    .replace(/^(\s*)#{1,6}\s+/gm, "$1")
    .replace(/^(\s*)[-+*]\s+/gm, "$1• ")
    .replace(/^(\s*)>\s?/gm, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/(\*\*|__|~~)(.*?)\1/g, "$2")
    .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=$|[\s).,!?;:])/g, "$1$2")
    .replace(/\[x]/gi, "☑")
    .replace(/\[ ]/g, "☐")
    .replace(/\\([\\`*_[\]{}()#+.!>-])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function formatNoteForCopy(markdown: string, html: string, format: NoteCopyFormat = loadNoteCopyFormat()): string {
  if (format === "markdown") return markdown;
  return htmlToFormattedText(html) || markdownToFormattedText(markdown);
}
