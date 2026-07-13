import { beforeEach, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { applyGlassEffect, applyGlassOpacity, defaultGlassOpacity, loadGlassEffect, loadGlassOpacity, saveGlassEffect, saveGlassOpacity } from "../ui/glassEffect";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-liquid-glass");
  document.documentElement.style.removeProperty("--liquid-glass-opacity");
});

it("defaults liquid glass to 80 percent opacity and persists adjustments", () => {
  expect(loadGlassOpacity()).toBe(defaultGlassOpacity);
  expect(loadGlassOpacity()).toBe(80);
  saveGlassOpacity(72);
  expect(loadGlassOpacity()).toBe(72);
  expect(document.documentElement.style.getPropertyValue("--liquid-glass-opacity")).toBe("72%");
  applyGlassOpacity(120);
  expect(document.documentElement.style.getPropertyValue("--liquid-glass-opacity")).toBe("100%");
});

it("persists and applies the liquid glass preference", () => {
  expect(loadGlassEffect()).toBe(false);
  saveGlassEffect(true);
  expect(loadGlassEffect()).toBe(true);
  expect(document.documentElement).toHaveAttribute("data-liquid-glass");
  applyGlassEffect(false);
  expect(document.documentElement).not.toHaveAttribute("data-liquid-glass");
});

it("keeps liquid glass group tabs vivid and free of gradients", () => {
  const css = readFileSync(resolve(process.cwd(), "src/styles/globals.css"), "utf8");
  const block = css.match(/:root\[data-liquid-glass\] \.group-tab \{([\s\S]*?)\n\}/)?.[1] ?? "";
  expect(block).toContain("color-mix(in oklch");
  expect(block).toContain("saturate(1.34)");
  expect(block).not.toContain("gradient");
  expect(block).not.toContain("--glass-sheen");
});
