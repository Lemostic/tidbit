import { PencilSimple } from "@phosphor-icons/react";
import { forwardRef, useImperativeHandle, useRef, useState, type CSSProperties } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { Group } from "../../ipc/types";
import { motionDurFast, motionEase, motionEaseSpring, motionDurSpring, prefersReducedMotion } from "../../ui/motion";

interface GroupItemProps {
  group: Group;
  selected: boolean;
  index: number;
  onClick: () => void;
  onEdit: () => void;
  onNoteDrop: (noteId: number, groupId: number) => void;
}

const noteDragType = "application/x-tidbit-note-id";

function readableTextColor(color: string | null) {
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return "var(--rail-fg)";
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance > 0.62 ? "#20242a" : "#ffffff";
}

export const GroupItem = forwardRef<HTMLButtonElement, GroupItemProps>(function GroupItem({ group, selected, index, onClick, onEdit, onNoteDrop }, ref) {
  const [dropActive, setDropActive] = useState(false);
  const tabRef = useRef<HTMLButtonElement>(null);
  useImperativeHandle(ref, () => tabRef.current as HTMLButtonElement);
  const backgroundColor = group.background_color ?? group.color ?? "var(--rail-bg)";
  const foregroundColor = readableTextColor(group.background_color ?? group.color);

  useGSAP(() => {
    const tab = tabRef.current;
    if (!tab) return;
    const reduced = prefersReducedMotion();
    if (reduced) {
      gsap.set(tab, { clearProps: "transform" });
      return;
    }
    // Drop target state — spring scale + slide.
    if (dropActive) {
      gsap.to(tab, { x: -3, scaleX: 1.045, duration: motionDurSpring, ease: motionEaseSpring, overwrite: "auto" });
      return;
    }
    if (selected) {
      gsap.to(tab, { x: -3, scaleX: 1.045, duration: motionDurFast, ease: motionEase, overwrite: "auto" });
      return;
    }
    gsap.to(tab, { x: 0, scaleX: 1, duration: motionDurFast, ease: motionEase, overwrite: "auto" });
  }, [selected, dropActive]);

  return (
    <div className={`group-tab-wrap${selected ? " is-active" : ""}`}>
      <button
        ref={tabRef}
        className={`group-tab${selected ? " is-active" : ""}${dropActive ? " is-drop-target" : ""}`}
        style={{ "--group-tab-bg": backgroundColor, "--group-tab-fg": foregroundColor, "--tab-index": index } as CSSProperties}
        aria-selected={selected}
        title={group.name}
        onMouseEnter={(event) => {
          if (selected || dropActive) return;
          if (prefersReducedMotion()) return;
          gsap.to(event.currentTarget, { x: 2, scaleX: 0.985, duration: motionDurFast, ease: motionEase, overwrite: "auto" });
        }}
        onMouseLeave={(event) => {
          if (selected || dropActive) return;
          if (prefersReducedMotion()) return;
          gsap.to(event.currentTarget, { x: 0, scaleX: 1, duration: motionDurFast, ease: motionEase, overwrite: "auto" });
        }}
        onClick={onClick}
        onDragEnter={(event) => { event.preventDefault(); setDropActive(true); }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setDropActive(true);
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
          setDropActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDropActive(false);
          const rawId = event.dataTransfer.getData(noteDragType) || event.dataTransfer.getData("text/plain");
          const noteId = Number(rawId);
          if (Number.isSafeInteger(noteId)) onNoteDrop(noteId, group.id);
        }}
      >
        <span className="group-tab__color" style={{ background: group.color ?? "transparent" }} />
        <span className="group-tab__label">{group.name}</span>
      </button>
      <button className="group-tab__edit" onClick={(event) => { event.stopPropagation(); onEdit(); }} aria-label={`编辑分组 ${group.name}`} title="编辑分组">
        <PencilSimple size={10} />
      </button>
    </div>
  );
});
