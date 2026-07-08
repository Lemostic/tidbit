import { test, expect, _electron as electron } from "@playwright/test";

/**
 * E2E journey: create a new note and edit its content.
 *
 * Prerequisites:
 *   cargo install tauri-driver
 *   pnpm exec playwright install --with-deps chromium
 *
 * Run with:
 *   pnpm test:e2e
 */
test("create and edit a note", async () => {
  const app = await electron.launch({
    args: ["./src-tauri/target/debug/tidbit"],
  });
  const win = await app.firstWindow();
  await win.locator("text=+ 新便签").click();
  await win.locator("article").first().click();
  await win.keyboard.type("**bold**");
  await expect(win.locator("strong")).toBeVisible();
  await app.close();
});
