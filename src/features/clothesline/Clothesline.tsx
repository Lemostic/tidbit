import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { CoatHanger, X } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HangingNote, type HangingNoteLayout } from "./HangingNote";
import { useClothesline } from "./useClothesline";
import {
  buildRopePath,
  cardJitter,
  catenary,
  catenaryAngleDeg,
  catenaryDroop,
  clamp,
  clampCardX,
  layoutCards,
  partingOffsets,
  sagForLoad,
} from "./ropeGeometry";

/** Horizontal inset of the two fixed rope ends from the window edge, in px. */
const ROPE_INSET = 18;
/** Scene y of the fixed rope ends. */
const ROPE_ENDPOINT_Y = 22;
/** Paper width; the height lives in CSS (`--card-height`). */
const CARD_WIDTH = 210;
/** Keeps a card fully on-screen and its clip inside the rope anchors. */
const CARD_EDGE_INSET = ROPE_INSET + 8;
/** Preferred spacing between cards; the app shrinks it when crowded. */
const MAX_STEP = 300;
const MIN_SAG = 8;
const BASE_SAG_MAX = 22;
const MAX_SAG = 46;
/** Scene width until the real measurement lands (also used by jsdom tests). */
const FALLBACK_WIDTH = 900;
/** Debounce between persisting drag positions to the database. */
const PERSIST_DEBOUNCE_MS = 180;

interface DragState {
  noteId: number;
  /** Card left position when the drag started, in scene px. */
  originX: number;
  /** Pointer x in scene px when the drag started. */
  pointerOriginX: number;
  /** Pointer id for pointer capture. */
  pointerId: number;
  /** Live card left position, in scene px. */
  currentX: number;
}

/**
 * Desktop clothesline window.
 *
 * The native window only has two states: a small centered peek strip and the
 * full board (which spans the monitor width minus a small margin). Hovering
 * the strip drops the board down; leaving the board arms a native upward
 * retract. Cards can be dragged horizontally along the rope; their free
 * position is persisted so the line stays where the user left it.
 */
export function Clothesline() {
  const { hungIds, remove } = useClothesline();
  const shellRef = useRef<HTMLElement | null>(null);
  const [sceneWidth, setSceneWidth] = useState(FALLBACK_WIDTH);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [peeking, setPeeking] = useState(false);
  const [positions, setPositions] = useState<Record<number, number>>({});
  const [ropeHover, setRopeHover] = useState(false);
  const dragRef = useRef<DragState | null>(null);
  const persistTimerRef = useRef<number | undefined>(undefined);
  const pendingPositionsRef = useRef<Map<number, number>>(new Map());
  const anchorRef = useRef({ x: 80, y: 80 });
  const openingRef = useRef(false);

  const sag = sagForLoad(clamp(sceneWidth * 0.009, MIN_SAG, BASE_SAG_MAX), hungIds.length, MAX_SAG);
  const ropeSpan = Math.max(1, sceneWidth - ROPE_INSET * 2);
  const curve = useMemo(() => catenary(ropeSpan, sag), [ropeSpan, sag]);
  const ropePath = useMemo(() => buildRopePath(curve, ROPE_ENDPOINT_Y, ROPE_INSET), [curve]);
  const ropeHeight = Math.ceil(ROPE_ENDPOINT_Y + sag + 12);
  const minLeft = CARD_EDGE_INSET;
  const maxLeft = Math.max(minLeft, sceneWidth - CARD_EDGE_INSET - CARD_WIDTH);
  const lefts = useMemo(
    () => layoutCards(sceneWidth, hungIds.length, CARD_WIDTH, CARD_EDGE_INSET, MAX_STEP),
    [hungIds.length, sceneWidth],
  );

  // Hydrate dragged positions from the backend (and from any cached snapshot
   // the local window already wrote during this session).
  useEffect(() => {
    let disposed = false;
    void invoke<Array<{ id: number; x: number }>>("clothesline_positions")
      .then((rows) => {
        if (disposed) return;
        const next: Record<number, number> = {};
        for (const row of rows) {
          if (row && typeof row.id === "number" && typeof row.x === "number") {
            next[row.id] = row.x;
          }
        }
        setPositions(next);
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
    };
  }, []);

  // Persist drag positions in a single batched call so rapid drags don't
  // hammer the database. The backend ignores stale values per id.
  const flushPositions = useCallback(() => {
    const pending = pendingPositionsRef.current;
    if (pending.size === 0) return;
    const payload = Array.from(pending.entries()).map(([id, x]) => ({ id, x }));
    pending.clear();
    void invoke("clothesline_set_positions", { positions: payload }).catch(() => undefined);
  }, []);

  useEffect(() => {
    return () => {
      if (persistTimerRef.current !== undefined) window.clearTimeout(persistTimerRef.current);
      flushPositions();
    };
  }, [flushPositions]);

  const startDrag = useCallback(
    (event: React.PointerEvent<HTMLElement>, noteId: number) => {
      // Drag is left-button on mouse, or any primary touch/pen press.
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const target = event.currentTarget;
      const fallback = lefts[hungIds.indexOf(noteId)] ?? 0;
      const originX = positions[noteId] ?? fallback;
      const bounds = shellRef.current?.getBoundingClientRect();
      const offsetLeft = bounds?.left ?? 0;
      const pointerOriginX = event.clientX - offsetLeft;
      dragRef.current = {
        noteId,
        originX,
        pointerOriginX,
        pointerId: event.pointerId,
        currentX: originX,
      };
      setActiveId(noteId);
      try {
        target.setPointerCapture(event.pointerId);
      } catch {
        // Some browsers reject capture on synthetic events; the drag still
        // works because we listen on the window for pointermove/up.
      }
      event.preventDefault();
    },
    [hungIds, lefts, positions],
  );

  const moveDrag = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const bounds = shellRef.current?.getBoundingClientRect();
      const offsetLeft = bounds?.left ?? 0;
      const pointerX = event.clientX - offsetLeft;
      const next = clamp(drag.originX + (pointerX - drag.pointerOriginX), minLeft, maxLeft);
      if (next === drag.currentX) return;
      drag.currentX = next;
      setPositions((current) => ({ ...current, [drag.noteId]: next }));
      pendingPositionsRef.current.set(drag.noteId, next);
      if (persistTimerRef.current !== undefined) window.clearTimeout(persistTimerRef.current);
      persistTimerRef.current = window.setTimeout(() => {
        flushPositions();
      }, PERSIST_DEBOUNCE_MS);
    },
    [flushPositions, maxLeft, minLeft],
  );

  const endDrag = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      try {
        event.currentTarget.releasePointerCapture(drag.pointerId);
      } catch {
        // Releasing an already-released pointer is fine.
      }
      dragRef.current = null;
      flushPositions();
    },
    [flushPositions],
  );

  // Drop a dragged note if the user releases outside the window. Window
  // listeners stay passive so they don't fight the React pointer tree.
  useEffect(() => {
    const cancel = () => {
      if (dragRef.current) {
        dragRef.current = null;
        flushPositions();
      }
    };
    window.addEventListener("blur", cancel);
    return () => window.removeEventListener("blur", cancel);
  }, [flushPositions]);

  // Forget a card's position when it leaves the rope.
  useEffect(() => {
    setPositions((current) => {
      const next: Record<number, number> = {};
      let changed = false;
      for (const id of hungIds) {
        if (current[id] !== undefined) {
          next[id] = current[id];
        } else {
          changed = true;
        }
      }
      if (!changed) return current;
      const removed: number[] = [];
      for (const id of Object.keys(current)) {
        const numeric = Number(id);
        if (!hungIds.includes(numeric)) removed.push(numeric);
      }
      if (removed.length > 0) {
        const payload = removed.map((id) => ({ id, x: 0 }));
        void invoke("clothesline_set_positions", { positions: payload }).catch(() => undefined);
      }
      return next;
    });
  }, [hungIds]);

  // Measure the native window width. jsdom reports 0, so fall back to the viewport.
  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const measure = () => {
      const measured = el.clientWidth > 0 ? el.clientWidth : window.innerWidth;
      setSceneWidth((prev) => (Math.abs(prev - measured) < 1 ? prev : measured));
    };
    measure();
    window.addEventListener("resize", measure);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(el);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Track the pointer for editor placement without re-rendering the scene.
  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      anchorRef.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Native side owns the window geometry; these events keep the DOM in sync.
  useEffect(() => {
    let disposed = false;
    const disposers: Array<() => void> = [];
    const listenFor = <T,>(event: string, handler: (payload: T) => void) => {
      void listen<T>(event, (message) => handler(message.payload)).then((dispose) => {
        if (disposed) dispose();
        else disposers.push(dispose);
      });
    };
    listenFor("tidbit://clothesline-retracting", () => setPeeking(true));
    listenFor("tidbit://clothesline-peeked", () => setPeeking(true));
    listenFor("tidbit://clothesline-revealing", () => setPeeking(false));
    listenFor("tidbit://clothesline-shown", () => setPeeking(false));
    void invoke("clothesline_board_ready").catch(() => undefined);
    return () => {
      disposed = true;
      disposers.forEach((dispose) => dispose());
    };
  }, []);

  const close = useCallback(() => {
    void invoke("clothesline_close").catch(() => undefined);
  }, []);

  const reveal = useCallback(() => {
    void invoke("clothesline_reveal").catch(() => undefined);
  }, []);

  const armHide = useCallback(() => {
    if (!peeking) void invoke("clothesline_arm_hide").catch(() => undefined);
  }, [peeking]);

  const openEditor = useCallback(async (noteId: number) => {
    if (openingRef.current) return;
    openingRef.current = true;
    try {
      await invoke("wander_editor_open", {
        noteId,
        screenX: Math.round(anchorRef.current.x),
        screenY: Math.round(anchorRef.current.y),
      });
    } catch {
      // Keep the line usable if the editor cannot open.
    }
    window.setTimeout(() => {
      openingRef.current = false;
    }, 160);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.key === "Escape") || ((event.key === "w" || event.key === "W") && (event.ctrlKey || event.metaKey))) {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const layout = useMemo<HangingNoteLayout[]>(() => {
    const draggingId = dragRef.current?.noteId ?? null;
    const focusIdForParting = draggingId ?? activeId;
    const focusIndexForParting = focusIdForParting === null ? -1 : hungIds.indexOf(focusIdForParting);
    const focusLeft =
      focusIdForParting !== null
        ? (positions[focusIdForParting] ?? lefts[focusIndexForParting] ?? 0)
        : 0;
    const offsets =
      focusIndexForParting >= 0
        ? partingOffsets({
            lefts,
            cardWidth: CARD_WIDTH,
            focusIndex: focusIndexForParting,
            focusCenter: focusLeft + CARD_WIDTH / 2,
            minLeft,
            maxLeft,
            maxPush: 12,
            radius: CARD_WIDTH * 1.28,
          })
        : lefts.map(() => 0);

    return hungIds.map((id, index) => {
      const offset = offsets[index] ?? 0;
      const fallback = lefts[index] ?? 0;
      const left = clampCardX(positions[id], fallback + offset, sceneWidth, CARD_WIDTH, CARD_EDGE_INSET);
      const draggingThis = draggingId === id;
      const local = clamp(left + CARD_WIDTH / 2 - ROPE_INSET, 0, curve.span);
      const droop = catenaryDroop(curve, local);
      const tangent = clamp(catenaryAngleDeg(curve, local), -9, 9);
      const jitter = cardJitter(id);
      const active = activeId === id;
      return {
        x: left,
        y: ROPE_ENDPOINT_Y + droop + jitter.offsetY,
        clipAngle: tangent,
        cardAngle: clamp(
          tangent * 0.55 + jitter.tilt + (draggingThis ? 0 : active ? 0.65 : offset < 0 ? 0.24 : offset > 0 ? -0.24 : 0),
          -11,
          11,
        ),
        scale: draggingThis ? 1.045 : active ? 1.028 : 1,
        zIndex: draggingThis ? hungIds.length + 80 : active ? hungIds.length + 40 : 10 + index,
        active,
        index,
        dragging: draggingThis,
      };
    });
  }, [activeId, curve, hungIds, lefts, maxLeft, minLeft, positions, sceneWidth]);

  return (
    <main
      className={`clothesline-shell${peeking ? " is-peeking" : ""}${ropeHover ? " is-rope-hover" : ""}`}
      ref={shellRef}
      onPointerLeave={armHide}
      onPointerEnter={() => setRopeHover(true)}
      onPointerCancel={() => setRopeHover(false)}
    >
      {peeking ? (
        <button
          type="button"
          className="clothesline__peek"
          aria-label="展开桌面晾衣绳"
          onPointerEnter={reveal}
          onClick={reveal}
        >
          <CoatHanger size={15} weight="duotone" />
          <span>{hungIds.length > 0 ? `晾衣绳 · ${hungIds.length} 条` : "桌面晾衣绳"}</span>
          <i aria-hidden="true" />
        </button>
      ) : (
        <section
          className="clothesline__panel"
          aria-label="桌面晾衣绳"
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <svg
            className="clothesline__rope"
            viewBox={`0 0 ${sceneWidth} ${ropeHeight}`}
            width="100%"
            height={ropeHeight}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="clothesline-rope" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#a9784a" />
                <stop offset="18%" stopColor="#c79a63" />
                <stop offset="50%" stopColor="#d8b07a" />
                <stop offset="82%" stopColor="#c79a63" />
                <stop offset="100%" stopColor="#a9784a" />
              </linearGradient>
              <filter id="clothesline-rope-soft" x="-5%" y="-200%" width="110%" height="500%">
                <feGaussianBlur stdDeviation="1.8" />
              </filter>
            </defs>
            <path
              className="clothesline__rope-path clothesline__rope-path--shadow"
              d={ropePath}
              transform="translate(0 2.4)"
              stroke="rgba(38, 26, 12, 0.30)"
              strokeWidth={5.5}
              filter="url(#clothesline-rope-soft)"
            />
            <path className="clothesline__rope-path" d={ropePath} stroke="url(#clothesline-rope)" strokeWidth={5.5} />
            <path
              className="clothesline__rope-path clothesline__rope-path--twist"
              d={ropePath}
              transform="translate(0 0.9)"
              stroke="rgba(86, 58, 26, 0.28)"
              strokeWidth={4}
              strokeDasharray="1.3 4.7"
            />
            <path
              className="clothesline__rope-path clothesline__rope-path--twist-light"
              d={ropePath}
              transform="translate(0 -0.9)"
              stroke="rgba(255, 242, 220, 0.22)"
              strokeWidth={3.6}
              strokeDasharray="1.3 4.7"
              strokeDashoffset={3}
            />
            <path
              className="clothesline__rope-path clothesline__rope-path--specular"
              d={ropePath}
              transform="translate(0 -1.6)"
              stroke="rgba(255, 250, 238, 0.34)"
              strokeWidth={1}
            />
          </svg>

          <span className="clothesline__nail" style={{ left: ROPE_INSET, top: ROPE_ENDPOINT_Y }} aria-hidden="true" />
          <span className="clothesline__nail" style={{ left: sceneWidth - ROPE_INSET, top: ROPE_ENDPOINT_Y }} aria-hidden="true" />

          <button
            type="button"
            className="clothesline__close"
            aria-label="关闭晾衣绳"
            title="关闭 (Esc)"
            onClick={close}
          >
            <X size={13} weight="bold" />
          </button>

          {hungIds.length === 0 ? (
            <div className="clothesline__empty" style={{ top: ropeHeight + 26 }}>
              <p className="clothesline__empty-title">绳上空空如也</p>
              <p className="clothesline__empty-hint">回到主窗口，点便签上的衣架按钮把它挂到绳上。</p>
            </div>
          ) : (
            hungIds.map((id, index) => (
              <HangingNote
                key={id}
                noteId={id}
                layout={layout[index] ?? { x: 0, y: ROPE_ENDPOINT_Y, clipAngle: 0, cardAngle: 0, scale: 1, zIndex: 10, active: false, index }}
                onOpen={(openedId) => void openEditor(openedId)}
                onRemove={(removedId) => void remove(removedId)}
                onPointerEnter={setActiveId}
                onPointerLeave={() => setActiveId((current) => current === id ? null : current)}
                onDragStart={startDrag}
                onDragMove={moveDrag}
                onDragEnd={endDrag}
              />
            ))
          )}

          <span className="clothesline__hint">移开鼠标后自动收起</span>
        </section>
      )}
    </main>
  );
}
