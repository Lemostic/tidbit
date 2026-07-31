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

  it("checks and builds a universal macOS DMG in CI", () => {
    const ci = workflow("ci.yml");
    expect(ci).toContain("runs-on: macos-14");
    expect(ci).toContain("targets: aarch64-apple-darwin,x86_64-apple-darwin");
    expect(ci).toContain("cargo check --manifest-path src-tauri/Cargo.toml");
    expect(ci).toMatch(/^\s+run: cargo test --manifest-path src-tauri\/Cargo\.toml$/m);
    expect(ci).toContain("pnpm tauri build --target universal-apple-darwin --bundles dmg");
  });

  it("automatically builds and uploads both Windows installer formats", () => {
    const build = workflow("build.yml");
    expect(build).toContain("branches: [main]");
    expect(build).not.toContain("branches: [main, dev]");
    expect(build).toContain("workflow_dispatch:");
    expect(build).toContain("package-manager-cache: false");
    expect(build).toContain("pnpm tauri build --bundles nsis,msi");
    expect(build).toContain("src-tauri/target/release/bundle/nsis/*.exe");
    expect(build).toContain("src-tauri/target/release/bundle/msi/*.msi");
  });

  it("uploads an unsigned universal DMG for ordinary main branch builds", () => {
    const build = workflow("build.yml");
    expect(build).toContain("runs-on: macos-14");
    expect(build).toContain("targets: aarch64-apple-darwin,x86_64-apple-darwin");
    expect(build).toContain("pnpm tauri build --target universal-apple-darwin --bundles dmg");
    expect(build).toContain("src-tauri/target/universal-apple-darwin/release/bundle/dmg/*.dmg");
  });

  it("publishes Windows and signed macOS bundles only after both uploads finish", () => {
    const release = workflow("release.yml");
    expect(release).toContain("contents: write");
    expect(release).toContain("package-manager-cache: false");
    expect(release).toContain("tags:");
    expect(release).toContain("workflow_dispatch:");
    expect(release).toContain('RELEASE_TAG: ${{ inputs.tag || github.ref_name }}');
    expect(release).toContain('ref: ${{ env.RELEASE_TAG }}');
    expect(release).toContain('tagName: ${{ env.RELEASE_TAG }}');
    expect(release).toContain("releaseDraft: true");
    expect(release).toContain("args: --bundles nsis,msi");
    expect(release).toContain("macos:");
    expect(release).toContain("needs: windows");
    expect(release).toContain("APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}");
    expect(release).toContain("APPLE_ID: ${{ secrets.APPLE_ID }}");
    expect(release).toContain("args: --target universal-apple-darwin --bundles dmg");
    expect(release).toContain("publish:");
    expect(release).toContain("needs: macos");
    expect(release).toContain("uses: actions/github-script@v8");
    expect(release).toContain('make_latest: "true"');
    expect(release.indexOf("publish:")).toBeGreaterThan(release.indexOf("macos:"));
  });
});
