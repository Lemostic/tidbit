import { expect, it } from "vitest";
import { configurableColors, groupColorValues, readableTextColor } from "../ui/colorPalette";

it("provides a vivid globally shared palette with distinct configurable colors", () => {
  expect(configurableColors[0]).toEqual({ name: "默认", value: null });
  expect(groupColorValues).toHaveLength(8);
  expect(new Set(groupColorValues).size).toBe(groupColorValues.length);
  expect(groupColorValues).toContain("#EA4D64");
  expect(groupColorValues).toContain("#0E9FA0");
  expect(groupColorValues).toContain("#3478D4");
});

it("uses dark text on bright colors and white text on deep colors", () => {
  expect(readableTextColor("#E6AE16")).toBe("#17202A");
  expect(readableTextColor("#3478D4")).toBe("#ffffff");
});
