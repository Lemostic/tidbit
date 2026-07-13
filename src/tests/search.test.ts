import { vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
    invoke: vi.fn(async () => [{ id: 1, group_id: null, title: "x", snippet: "..." }]),
}));

import { SearchProvider } from "../features/search/SearchProvider";

it("queries", async () => {
    const hits = await SearchProvider.query("foo");
    expect(hits[0]!.id).toBe(1);
});
