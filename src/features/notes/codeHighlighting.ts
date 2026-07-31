import { common, createLowlight } from "lowlight";

export const codeLowlight = createLowlight(common);

interface HighlightNode {
  type: string;
  value?: string;
  properties?: { className?: string | string[] };
  children?: HighlightNode[];
}

function createHighlightNode(node: HighlightNode): Node {
  if (node.type === "text") return document.createTextNode(node.value ?? "");

  const element = document.createElement("span");
  const classNames = node.properties?.className;
  if (classNames) element.className = Array.isArray(classNames) ? classNames.join(" ") : classNames;
  element.append(...(node.children ?? []).map(createHighlightNode));
  return element;
}

export function highlightCodeElement(element: HTMLElement, language?: string): void {
  const source = element.textContent ?? "";
  const result = language && codeLowlight.registered(language)
    ? codeLowlight.highlight(language, source)
    : codeLowlight.highlightAuto(source);

  element.replaceChildren(...(result.children as HighlightNode[]).map(createHighlightNode));
  element.classList.add("hljs");
  if (result.data?.language && !language) element.classList.add(`language-${result.data.language}`);
}
