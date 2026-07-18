export interface TaskContentUpdate {
  markdown: string;
  html: string;
  words: number;
}

const taskMarkdownPattern = /^(\s*(?:[-*+]|\d+[.)])\s+)\[([ xX])\](?=\s|$)/gm;

export function toggleTaskContent(
  markdown: string,
  html: string,
  taskIndex: number,
  checked: boolean,
): TaskContentUpdate | null {
  if (!Number.isInteger(taskIndex) || taskIndex < 0 || typeof DOMParser === "undefined") return null;
  const document = new DOMParser().parseFromString(html, "text/html");
  const inputs = Array.from(document.body.querySelectorAll<HTMLInputElement>(
    'ul[data-type="taskList"] li input[type="checkbox"], ul.contains-task-list li input[type="checkbox"]',
  ));
  const input = inputs[taskIndex];
  if (!input) return null;

  input.checked = checked;
  input.toggleAttribute("checked", checked);
  input.setAttribute("data-task-checkbox", "true");
  input.setAttribute("aria-label", checked ? "标记待办为未完成" : "标记待办为已完成");
  const item = input.closest("li");
  item?.setAttribute("data-type", "taskItem");
  item?.setAttribute("data-checked", String(checked));

  let markdownIndex = 0;
  let markdownChanged = false;
  const nextMarkdown = markdown.replace(taskMarkdownPattern, (match, prefix: string) => {
    const isTarget = markdownIndex === taskIndex;
    markdownIndex += 1;
    if (!isTarget) return match;
    markdownChanged = true;
    return `${prefix}[${checked ? "x" : " "}]`;
  });
  if (!markdownChanged) return null;

  return {
    markdown: nextMarkdown,
    html: document.body.innerHTML,
    words: nextMarkdown.replace(/\s/g, "").length,
  };
}
