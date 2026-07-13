import { expect, it, vi } from "vitest";
import { copyText } from "../ui/clipboard";

it("writes the exact Markdown source to the clipboard", async () => {
  const writeText = vi.fn(async () => undefined);
  await copyText("## 标题\n\n1. 内容", { writeText });
  expect(writeText).toHaveBeenCalledWith("## 标题\n\n1. 内容");
});
