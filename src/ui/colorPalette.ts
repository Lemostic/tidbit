export interface ConfigurableColor {
  name: string;
  value: string | null;
}

export const configurableColors: readonly ConfigurableColor[] = [
  { name: "默认", value: null },
  { name: "珊瑚红", value: "#EA4D64" },
  { name: "活力橙", value: "#F47A2A" },
  { name: "日光黄", value: "#E6AE16" },
  { name: "新叶绿", value: "#18A66A" },
  { name: "湖水青", value: "#0E9FA0" },
  { name: "晴空蓝", value: "#3478D4" },
  { name: "鸢尾蓝", value: "#6C63D9" },
  { name: "莓果粉", value: "#D94C8A" },
] as const;

export const groupColorValues = configurableColors
  .map((color) => color.value)
  .filter((color): color is string => color !== null);

export function readableTextColor(background: string | null | undefined): "#ffffff" | "#17202A" {
  if (!background || !/^#[0-9a-f]{6}$/i.test(background)) return "#ffffff";
  const channel = (offset: number) => Number.parseInt(background.slice(offset, offset + 2), 16) / 255;
  const linear = (value: number) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  const luminance = 0.2126 * linear(channel(1)) + 0.7152 * linear(channel(3)) + 0.0722 * linear(channel(5));
  return luminance > 0.43 ? "#17202A" : "#ffffff";
}
