import { beforeEach, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { applyGlassEffect, applyGlassOpacity, defaultGlassOpacity, loadGlassEffect, loadGlassOpacity, saveGlassEffect, saveGlassOpacity } from "../ui/glassEffect";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-liquid-glass");
  document.documentElement.removeAttribute("data-liquid-glass-solid");
  document.documentElement.style.removeProperty("--liquid-glass-opacity");
});

it("defaults liquid glass to a clear 92 percent and supports a truly solid mode", () => {
  expect(loadGlassOpacity()).toBe(defaultGlassOpacity);
  expect(loadGlassOpacity()).toBe(92);
  saveGlassOpacity(72);
  expect(loadGlassOpacity()).toBe(72);
  expect(document.documentElement.style.getPropertyValue("--liquid-glass-opacity")).toBe("72%");
  expect(document.documentElement).not.toHaveAttribute("data-liquid-glass-solid");
  applyGlassOpacity(120);
  expect(document.documentElement.style.getPropertyValue("--liquid-glass-opacity")).toBe("100%");
  expect(document.documentElement).toHaveAttribute("data-liquid-glass-solid");
});

it("persists and applies the liquid glass preference", () => {
  expect(loadGlassEffect()).toBe(false);
  saveGlassEffect(true);
  expect(loadGlassEffect()).toBe(true);
  expect(document.documentElement).toHaveAttribute("data-liquid-glass");
  applyGlassEffect(false);
  expect(document.documentElement).not.toHaveAttribute("data-liquid-glass");
});

it("keeps solid fallbacks before progressive liquid-glass enhancement", () => {
  const css = readFileSync(resolve(process.cwd(), "src/styles/globals.css"), "utf8");
  const block = css.match(/:root\[data-liquid-glass\] \.group-tab \{([\s\S]*?)\n\}/)?.[1] ?? "";
  expect(block).toContain("background: var(--group-tab-bg, var(--rail-bg))");
  expect(block).toContain("color-mix(in srgb");
  expect(block).toContain("saturate(1.34)");
  expect(block).not.toContain("gradient");
  expect(block).not.toContain("--glass-sheen");
  expect(css).toContain(":root[data-liquid-glass][data-liquid-glass-solid] .group-tab");
  expect(css).toContain(".wander-card.is-opaque");
});
