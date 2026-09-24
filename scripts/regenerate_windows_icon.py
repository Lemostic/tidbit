#!/usr/bin/env python3
"""
Regenerate src-tauri/icons/icon.ico with BMP-encoded entries (32bpp BGRA + AND mask)
to fix the Windows taskbar icon going blank on locked-down / corporate installs.

Root cause: the previous icon.ico embedded PNG-compressed icon frames
(first 4 bytes = 89 50 4E 47). Some Windows shell / GDI code paths
(shortcut extraction, taskbar previews, IconCache.db on Win7/8/10 LTSB)
refuse to decode PNG-encoded ICO entries and fall back to a blank icon.

Format reference: https://en.wikipedia.org/wiki/ICO_(file_format)
Each entry written here is BITMAPINFOHEADER + bottom-up BGRA XOR mask + 1bpp AND mask,
which is the canonical encoding every Windows version since XP can render.

Usage:
    python scripts/regenerate_windows_icon.py
"""
import struct
import sys
from pathlib import Path

from PIL import Image

# Project root is one level up from this script's directory.
ROOT = Path(__file__).resolve().parent.parent
SRC_PNG = ROOT / "src-tauri" / "icons" / "icon.png"
DST_ICO = ROOT / "src-tauri" / "icons" / "icon.ico"

# Sizes Windows actually samples for the taskbar / pinned shortcut thumbnails.
# 256x256 is kept so the entry list also covers HiDPI app icons.
SIZES = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]


def encode_bmp_entry(img_rgba: Image.Image) -> bytes:
    """Encode one 32-bit BMP ICO entry (BITMAPINFOHEADER + BGRA XOR + AND mask)."""
    w, h = img_rgba.size
    pixels = img_rgba.tobytes("raw", "BGRA")  # bottom-up, BGRA per pixel

    # BITMAPINFOHEADER — note: biHeight is doubled in ICO entries
    # because the AND mask sits after the XOR mask at the same offset.
    bih = struct.pack(
        "<IiiHHIIiiII",
        40,            # biSize
        w,             # biWidth
        h * 2,         # biHeight (XOR + AND combined)
        1,             # biPlanes
        32,            # biBitCount
        0,             # biCompression (BI_RGB)
        0,             # biSizeImage (can be 0 for BI_RGB)
        0,             # biXPelsPerMeter
        0,             # biYPelsPerMeter
        0,             # biClrUsed
        0,             # biClrImportant
    )

    # 1-bit AND (transparency) mask, 1 bit per pixel, rows padded to 32-bit.
    alpha = img_rgba.split()[-1]  # the alpha channel as its own image
    row_bytes = ((w + 31) // 32) * 4
    and_mask = bytearray(row_bytes * h)
    pixels_a = alpha.load()
    for y in range(h):
        row_start = y * row_bytes
        for x in range(w):
            # AND mask: bit = 0 means opaque (visible), 1 means transparent (AND-out).
            # For a fully-opaque RGBA PNG we want AND = 0 (visible), which is the default.
            # Partial alpha is rare for icons, but emit correctly anyway.
            if pixels_a[x, y] == 0:
                byte_idx = row_start + (x // 8)
                bit = 7 - (x % 8)
                and_mask[byte_idx] |= 1 << bit
    return bih + pixels + bytes(and_mask)


def main() -> int:
    if not SRC_PNG.is_file():
        print(f"source icon not found: {SRC_PNG}", file=sys.stderr)
        return 1

    src = Image.open(SRC_PNG).convert("RGBA")

    entries: list[tuple[bytes, int, int]] = []  # (payload, w, h)
    for w, h in SIZES:
        frame = src.resize((w, h), Image.LANCZOS) if (w, h) != src.size else src.copy()
        payload = encode_bmp_entry(frame)
        entries.append((payload, w, h))

    # ICONDIR: 6 bytes
    header = struct.pack("<HHH", 0, 1, len(entries))
    # ICONDIRENTRY array: each entry is 16 bytes, offset = 6 + 16*N + cumulative size
    entry_table = b""
    image_data = b""
    offset = 6 + 16 * len(entries)
    for payload, w, h in entries:
        # ICONDIRENTRY fields use 0 to mean "256" for width / height.
        w_field = 0 if w == 256 else w
        h_field = 0 if h == 256 else h
        entry_table += struct.pack(
            "<BBBBHHII",
            w_field, h_field, 0, 0,        # width, height, color count, reserved
            1, 32,                          # planes, bit count
            len(payload),                   # bytes in resource
            offset,                         # offset from start of file
        )
        image_data += payload
        offset += len(payload)

    ico_bytes = header + entry_table + image_data

    # Sanity check: ensure no entry begins with the PNG signature.
    for i, (payload, w, h) in enumerate(entries):
        assert payload[:4] != b"\x89PNG", f"entry {i} ({w}x{h}) is still PNG-encoded"

    DST_ICO.write_bytes(ico_bytes)

    print(f"wrote {DST_ICO.relative_to(ROOT)} ({len(ico_bytes)} bytes, {len(entries)} entries)")
    for i, (_, w, h) in enumerate(entries):
        print(f"  entry {i}: {w}x{h} (BMP-encoded)")
    return 0


if __name__ == "__main__":
    sys.exit(main())