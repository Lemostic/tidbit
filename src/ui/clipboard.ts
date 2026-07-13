interface ClipboardWriter {
  writeText(text: string): Promise<void>;
}

function browserClipboard(): ClipboardWriter | undefined {
  return typeof navigator === "undefined" ? undefined : navigator.clipboard;
}

export async function copyText(text: string, clipboard = browserClipboard()): Promise<void> {
  if (clipboard) {
    await clipboard.writeText(text);
    return;
  }
  if (typeof document === "undefined") throw new Error("Clipboard is unavailable");

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = typeof document.execCommand === "function" && document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard write failed");
}
