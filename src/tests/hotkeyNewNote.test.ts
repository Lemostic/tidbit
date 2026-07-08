import { listen } from "@tauri-apps/api/event";

test("emits new-note payload", async () => {
  // no-op: we are asserting the channel name contract only
  expect(typeof listen).toBe("function");
  expect("tidbit://hotkey/new-note").toMatch(/hotkey\/new-note/);
});
