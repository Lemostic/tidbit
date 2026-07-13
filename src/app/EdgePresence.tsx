type Edge = "left" | "right" | "top" | "bottom";

export function EdgePresence({ edge }: { edge: Edge | null }) {
  if (!edge) return null;
  const visibleSide = edge === "left" ? "right" : edge === "right" ? "left" : edge === "top" ? "bottom" : "top";
  return (
    <div className="edge-presence" aria-hidden="true">
      <span className={`edge-presence__handle edge-presence__handle--${visibleSide}`} />
    </div>
  );
}
