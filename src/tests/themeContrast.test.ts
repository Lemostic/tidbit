import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Contrast guard for every theme.
 *
 * The commercial-design pass lifted `--fg-subtle` from roughly 3.3:1 to WCAG
 * AA with a single derived declaration in tokens.css:
 *
 *   :root[data-theme] { --fg-subtle: color-mix(in srgb, var(--fg-muted) 74%, var(--fg)); }
 *
 * Nothing in the suite protected that value, so a later tweak to any theme's
 * `--fg` or `--fg-muted` could silently drop tertiary text back below AA. This
 * test resolves every theme's real values (including the derived mix) and
 * asserts the ratio.
 *
 * Tertiary text carries word counts, timestamps and eyebrows, so it is small
 * text and must clear 4.5:1 — not the 3:1 large-text threshold.
 */

const css = [
  readFileSync(resolve(process.cwd(), "src/styles/tokens.css"), "utf8"),
  // tokyo-night and wechat define their ramp in refinement.css rather than
  // tokens.css, so both files have to be read to cover every selectable theme.
  readFileSync(resolve(process.cwd(), "src/styles/refinement.css"), "utf8"),
].join("\n");

type Rgb = { r: number; g: number; b: number };

function parseColor(input: string): Rgb | null {
  const value = input.trim();
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  const hexBody = hex?.[1];
  if (hexBody) {
    const raw = hexBody.length === 3
      ? hexBody.split("").map((c) => c + c).join("")
      : hexBody;
    return {
      r: parseInt(raw.slice(0, 2), 16),
      g: parseInt(raw.slice(2, 4), 16),
      b: parseInt(raw.slice(4, 6), 16),
    };
  }
  const rgb = value.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  const [r, g, b] = rgb ? [rgb[1], rgb[2], rgb[3]] : [];
  if (r === undefined || g === undefined || b === undefined) return null;
  return { r: Number(r), g: Number(g), b: Number(b) };
}

/** Resolves the one derived declaration this suite depends on.
 *  The trailing percentage may be omitted, in which case CSS assigns
 *  `100% - first` to the second colour. */
function resolveDerived(raw: string, vars: Map<string, string>): string {
  const match = raw.match(
    /color-mix\(in srgb,\s*var\((--[a-z-]+)\)\s*(\d+(?:\.\d+)?)%\s*,\s*var\((--[a-z-]+)\)(?:\s*(\d+(?:\.\d+)?)%)?\s*\)/
  );
  const [, firstRef, firstPct, secondRef, secondPct] = match ?? [];
  if (firstRef === undefined || firstPct === undefined || secondRef === undefined) return raw;
  const a = parseColor(vars.get(firstRef) ?? "");
  const b = parseColor(vars.get(secondRef) ?? "");
  if (!a || !b) return raw;
  const wa = Number(firstPct) / 100;
  const wb = secondPct === undefined ? 1 - wa : Number(secondPct) / 100;
  const total = wa + wb || 1;
  const blend = (x: number, y: number) => Math.round((x * wa + y * wb) / total);
  return `rgb(${blend(a.r, b.r)}, ${blend(a.g, b.g)}, ${blend(a.b, b.b)})`;
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (raw: number) => {
    const c = raw / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Pulls `--name: value;` pairs out of a single declaration block body. */
function readVars(body: string): Map<string, string> {
  const vars = new Map<string, string>();
  for (const match of body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    const name = match[1];
    const value = match[2];
    if (name !== undefined && value !== undefined) vars.set(name, value.trim());
  }
  return vars;
}

function resolveVar(name: string, vars: Map<string, string>, depth = 0): Rgb | null {
  if (depth > 4) return null;
  const raw = vars.get(name);
  if (!raw) return null;
  const literal = parseColor(raw);
  if (literal) return literal;
  const ref = raw.match(/^var\((--[a-z0-9-]+)\)$/)?.[1];
  if (ref) return resolveVar(ref, vars, depth + 1);
  const mixed = parseColor(resolveDerived(raw, vars));
  if (mixed) return mixed;
  return null;
}

interface Theme {
  name: string;
  vars: Map<string, string>;
}

function collectThemes(): Theme[] {
  const base = readVars(css.match(/:root\s*\{([\s\S]*?)\}/)?.[1] ?? "");

  // The derived layer (contrast lift, hairlines, surface steps) is declared
  // under a `:root,\n:root[data-theme]` selector. It must be layered LAST for
  // every theme, including the bare :root default, which is exactly the case
  // that regressed once already.
  const derived = readVars(css.match(/:root,\s*:root\[data-theme\]\s*\{([\s\S]*?)\}/)?.[1] ?? "");
  const withDerived = new Map([...base, ...derived]);

  const themes: Theme[] = [{ name: ":root (light default)", vars: new Map(withDerived) }];

  const blockRe = /:root\[data-theme="([^"]+)"\]\s*\{([\s\S]*?)\}/g;
  for (const match of css.matchAll(blockRe)) {
    const name = match[1];
    const body = match[2];
    if (name === undefined || body === undefined) continue;
    // Theme blocks only override part of the base ramps, so layer them:
    // base → theme → derived.
    themes.push({
      name,
      vars: new Map([...withDerived, ...readVars(body), ...derived]),
    });
  }
  return themes;
}

const themes = collectThemes();

describe("theme contrast", () => {
  it("covers every theme declared in tokens.css", () => {
    // 12 named themes + the :root default. Guards against the parser silently
    // matching nothing, which would make every assertion below vacuous.
    expect(themes.length).toBeGreaterThanOrEqual(13);
    expect(themes.map((t) => t.name)).toContain("dark");
    expect(themes.map((t) => t.name)).toContain("one-dark");
  });

  it("keeps primary text well above AA on every theme", () => {
    for (const theme of themes) {
      const fg = resolveVar("--fg", theme.vars);
      const surface = resolveVar("--surface", theme.vars);
      expect(fg, `${theme.name}: --fg unresolved`).not.toBeNull();
      expect(surface, `${theme.name}: --surface unresolved`).not.toBeNull();
      const ratio = contrastRatio(fg!, surface!);
      expect(ratio, `${theme.name}: --fg on --surface is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(7);
    }
  });

  it("keeps secondary text at AA on every theme", () => {
    for (const theme of themes) {
      const muted = resolveVar("--fg-muted", theme.vars);
      const surface = resolveVar("--surface", theme.vars);
      expect(muted, `${theme.name}: --fg-muted unresolved`).not.toBeNull();
      const ratio = contrastRatio(muted!, surface!);
      expect(ratio, `${theme.name}: --fg-muted on --surface is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps tertiary text (word counts, timestamps, eyebrows) at AA on every theme", () => {
    for (const theme of themes) {
      const subtle = resolveVar("--fg-subtle", theme.vars);
      const surface = resolveVar("--surface", theme.vars);
      expect(subtle, `${theme.name}: --fg-subtle unresolved`).not.toBeNull();
      const ratio = contrastRatio(subtle!, surface!);
      expect(ratio, `${theme.name}: --fg-subtle on --surface is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps tertiary text at AA on the recessed app background too", () => {
    // The maximized list and the notes grid sit on --bg, not --surface.
    for (const theme of themes) {
      const subtle = resolveVar("--fg-subtle", theme.vars);
      const bg = resolveVar("--bg", theme.vars);
      expect(bg, `${theme.name}: --bg unresolved`).not.toBeNull();
      const ratio = contrastRatio(subtle!, bg!);
      expect(ratio, `${theme.name}: --fg-subtle on --bg is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
