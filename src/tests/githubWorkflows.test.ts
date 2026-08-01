import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = (name: string) => readFileSync(resolve(process.cwd(), ".github/workflows", name), "utf8");

describe("GitHub Actions workflows", () => {
  it("uses cached pnpm/Rust tooling and only runnable quality gates", () => {
    const ci = workflow("ci.yml");
    expect(ci).toContain("PNPM_VERSION: 11.10.0");
    expect(ci).toContain("pnpm/action-setup@v4");
    expect(ci).toContain("version: ${{ env.PNPM_VERSION }}");
    expect(ci).toContain("cache: pnpm");
    expect(ci).toContain("package-manager-cache: false");
    expect(ci).toContain("Swatinem/rust-cache@v2");
    expect(ci).toContain("pnpm install --frozen-lockfile");
    expect(ci).toContain("pnpm typecheck");
    expect(ci).toContain("pnpm test");
    expect(ci).toContain("pnpm build");
    expect(ci).not.toContain("pnpm lint");
  });

  it("automatically builds and uploads both Windows installer formats", () => {
    const build = workflow("build.yml");
    expect(build).toContain("branches: [main]");
    expect(build).not.toContain("branches: [main, dev]");
    expect(build).toContain("workflow_dispatch:");
    expect(build).toContain("pnpm/action-setup@v4");
    expect(build).toContain("cache: pnpm");
    expect(build).toContain("package-manager-cache: false");
    expect(build).toContain("Swatinem/rust-cache@v2");
    expect(build).toContain("pnpm tauri build --bundles nsis,msi");
    expect(build).toContain("src-tauri/target/release/bundle/nsis/*.exe");
    expect(build).toContain("src-tauri/target/release/bundle/msi/*.msi");
  });

  it("publishes tagged NSIS and MSI bundles with write permission", () => {
    const release = workflow("release.yml");
    expect(release).toContain("contents: write");
    expect(release).toContain("pnpm/action-setup@v4");
    expect(release).toContain("cache: pnpm");
    expect(release).toContain("package-manager-cache: false");
    expect(release).toContain("Swatinem/rust-cache@v2");
    expect(release).toContain("tags:");
    expect(release).toContain("workflow_dispatch:");
    expect(release).toContain('RELEASE_TAG: ${{ inputs.tag || github.ref_name }}');
    expect(release).toContain('ref: ${{ env.RELEASE_TAG }}');
    expect(release).toContain('tagName: ${{ env.RELEASE_TAG }}');
    expect(release).toContain("releaseDraft: true");
    expect(release).toContain("args: --bundles nsis,msi");
    expect(release).toContain("uses: actions/github-script@v8");
    expect(release).toContain('make_latest: "true"');
  });
});
