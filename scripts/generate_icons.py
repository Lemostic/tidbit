from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "src-tauri" / "icons"

NAVY = "#172433"
NAVY_EDGE = "#344A5F"
NAVY_INK = "#203143"
GOLD = "#FFC94A"
GOLD_LIGHT = "#FFE08A"
GOLD_FOLD = "#DDA52A"
CYAN = "#39C6F4"
CORAL = "#FF6B5E"


def _box(scale: int, values: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    return tuple(round(value * scale / 1024) for value in values)  # type: ignore[return-value]


def _point(scale: int, x: int, y: int) -> tuple[int, int]:
    return round(x * scale / 1024), round(y * scale / 1024)


def render_icon(size: int) -> Image.Image:
    supersample = 4
    scale = size * supersample
    image = Image.new("RGBA", (scale, scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    outer = _box(scale, (76, 76, 948, 948))
    draw.rounded_rectangle(outer, radius=round(224 * scale / 1024), fill=NAVY, outline=NAVY_EDGE, width=max(1, round(18 * scale / 1024)))
    if size >= 48:
        inner = _box(scale, (102, 102, 922, 922))
        draw.rounded_rectangle(inner, radius=round(201 * scale / 1024), outline="#40596E", width=max(1, round(7 * scale / 1024)))

    if size >= 24:
        draw.rounded_rectangle(_box(scale, (186, 282, 370, 700)), radius=round(52 * scale / 1024), fill=CORAL)
        draw.rounded_rectangle(_box(scale, (166, 222, 400, 586)), radius=round(62 * scale / 1024), fill=CYAN)

    note_box = _box(scale, (222, 190, 812, 820))
    draw.rounded_rectangle(note_box, radius=round(118 * scale / 1024), fill=GOLD)

    if size >= 32:
        highlight = _box(scale, (274, 216, 722, 238))
        draw.rounded_rectangle(highlight, radius=max(1, round(11 * scale / 1024)), fill=GOLD_LIGHT)

    cut = [_point(scale, 630, 820), _point(scale, 812, 638), _point(scale, 812, 820)]
    draw.polygon(cut, fill=NAVY)
    fold = [_point(scale, 646, 804), _point(scale, 796, 654), _point(scale, 796, 724), _point(scale, 716, 804)]
    draw.polygon(fold, fill=GOLD_FOLD)

    line_width = max(1, round(28 * scale / 1024))
    draw.rounded_rectangle(_box(scale, (330, 405, 656, 469)), radius=line_width, fill=NAVY_INK)
    draw.rounded_rectangle(_box(scale, (330, 535, 570, 587)), radius=line_width, fill="#465465")

    bit_box = _box(scale, (672, 394, 744, 466))
    draw.rounded_rectangle(bit_box, radius=max(1, round(18 * scale / 1024)), fill=CYAN)

    if size >= 20:
        cx, cy = _point(scale, 794, 214)
        long = round(58 * scale / 1024)
        short = round(19 * scale / 1024)
        sparkle = [(cx, cy - long), (cx + short, cy - short), (cx + long, cy), (cx + short, cy + short), (cx, cy + long), (cx - short, cy + short), (cx - long, cy), (cx - short, cy - short)]
        draw.polygon(sparkle, fill=CYAN)

    return image.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    master = render_icon(1024)
    master.save(ICON_DIR / "icon.png", optimize=True)
    render_icon(64).save(ICON_DIR / "tray-icon.png", optimize=True)
    master.save(
        ICON_DIR / "icon.ico",
        format="ICO",
        sizes=[(16, 16), (20, 20), (24, 24), (32, 32), (40, 40), (48, 48), (64, 64), (128, 128), (256, 256)],
        bitmap_format="png",
    )


if __name__ == "__main__":
    main()
