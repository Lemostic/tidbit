import { renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it } from "vitest";
import { DesktopProvider, useDesktopProfile } from "../desktop/DesktopProvider";
import { macDesktopProfile } from "../desktop/DesktopProfile";

describe("DesktopProvider", () => {
  it("exposes the startup profile to shared UI", () => {
    const wrapper = ({ children }: PropsWithChildren) => (
      <DesktopProvider profile={macDesktopProfile}>{children}</DesktopProvider>
    );
    const { result } = renderHook(() => useDesktopProfile(), { wrapper });
    expect(result.current).toBe(macDesktopProfile);
  });
});
