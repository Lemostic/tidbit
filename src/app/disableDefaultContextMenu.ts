export function disableDefaultContextMenu(doc: Document = document) {
  const preventDefaultMenu = (event: MouseEvent) => event.preventDefault();
  doc.addEventListener("contextmenu", preventDefaultMenu);
  return () => doc.removeEventListener("contextmenu", preventDefaultMenu);
}
