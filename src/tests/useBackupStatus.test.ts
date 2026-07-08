import { renderHook, act } from "@testing-library/react";
import { useBackupStatus } from "../features/backup/useBackupStatus";
import { describe, it, expect, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async () => ["a.bak", "b.bak"]),
}));

describe("useBackupStatus", () => {
  it("lists backups", async () => {
    const { result } = renderHook(() => useBackupStatus());
    const files = await act(async () => result.current.list());
    expect(files.length).toBe(2);
  });
});
