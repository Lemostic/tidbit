import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Magnetic hover effect — pulls a card toward the cursor with a spring.
 * Uses GSAP motion values (not React state) so updates never trigger re-renders.
 * Respects prefers-reduced-motion (no-op when the user disables animations).
*/
export function useMagneticHover(
  ref: React.RefObject<HTMLElement | null>,
  options: { strength?: number; scale?: number } = {},
) {
  const { strength = 0.18, scale = 1.025 } = options;
  const motionRef = useRef<{
    x: gsap.QuickToFunc | null;
    y: gsap.QuickToFunc | null;
    s: gsap.QuickToFunc | null;
  }>({ x: null, y: null, s: null });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === "undefined") return;
    if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const { quickTo } = gsap;
    motionRef.current = {
      x: quickTo(el, "x", { duration: 0.45, ease: "power3.out" }),
      y: quickTo(el, "y", { duration: 0.45, ease: "power3.out" }),
      s: quickTo(el, "scale", { duration: 0.4, ease: "power3.out" }),
    };

    const onMove = (event: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const offsetX = event.clientX - (rect.left + rect.width / 2);
      const offsetY = event.clientY - (rect.top + rect.height / 2);
      motionRef.current.x?.(offsetX * strength);
      motionRef.current.y?.(offsetY * strength);
      motionRef.current.s?.(scale);
    };
    const onLeave = () => {
      motionRef.current.x?.(0);
      motionRef.current.y?.(0);
      motionRef.current.s?.(1);
    };

    el.addEventListener("mousemove", onMove, { passive: true });
    el.addEventListener("mouseleave", onLeave, { passive: true });
    el.addEventListener("blur", onLeave, { passive: true });

    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("blur", onLeave);
    };
  }, [ref, strength, scale]);
}
