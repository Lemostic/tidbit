import { describe, expect, test } from "vitest";
import { disableDefaultContextMenu } from "../app/disableDefaultContextMenu";

describe("default context menu", () => {
  test("is disabled until the app provides its own menu", () => {
    const cleanup = disableDefaultContextMenu(document);
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });

    document.body.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    cleanup();
  });
});
