import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = (name: string) => readFileSync(resolve(process.cwd(), ".github/workflows", name), "utf8");

describe("GitHub Actions workflows", () => {
  it("uses the repository pnpm version and only runnable quality gates", () => {
    const ci = workflow("ci.yml");
    expect(ci).toContain("PNPM_VERSION: 11.10.0");
    expect(ci).toContain("npm install --global pnpm@%PNPM_VERSION%");
    expect(ci).toContain("package-manager-cache: false");
    expect(ci).toContain("pnpm install --frozen-lockfile");
    expect(ci).toContain("pnpm typecheck");
    expect(ci).toContain("pnpm test");
    expect(ci).toContain("pnpm build");
    expect(ci).not.toContain("pnpm lint");
  });

  it("automatically builds and uploads both Windows installer formats", () => {
    const build = workflow("build.yml");
    expect(build).toContain("branches: [main, dev]");
    expect(build).toContain("workflow_dispatch:");
    expect(build).toContain("package-manager-cache: false");
    expect(build).toContain("pnpm tauri build --bundles nsis,msi");
    expect(build).toContain("src-tauri/target/release/bundle/nsis/*.exe");
    expect(build).toContain("src-tauri/target/release/bundle/msi/*.msi");
  });

  it("publishes tagged NSIS and MSI bundles with write permission", () => {
    const release = workflow("release.yml");
    expect(release).toContain("contents: write");
    expect(release).toContain("package-manager-cache: false");
    expect(release).toContain("tags:");
    expect(release).toContain('tagName: ${{ github.ref_name }}');
    expect(release).toContain("args: --bundles nsis,msi");
  });
});
