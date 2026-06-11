#!/usr/bin/env python3
"""Generate square favicons from book-cover-hero.png (aspect-fit + transparent padding)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src" / "assets" / "book-cover-hero.png"
OUT_DIR = ROOT / "public"

SIZES: dict[str, int] = {
    "favicon-16x16.png": 16,
    "favicon-32x32.png": 32,
    "favicon.png": 48,
    "apple-touch-icon.png": 180,
}


def square_icon(source: Image.Image, size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    src = source.convert("RGBA")
    sw, sh = src.size
    scale = min(size / sw, size / sh)
    tw = max(1, round(sw * scale))
    th = max(1, round(sh * scale))
    resized = src.resize((tw, th), Image.Resampling.LANCZOS)
    x = (size - tw) // 2
    y = (size - th) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas


def main() -> None:
    if not SRC.is_file():
        raise SystemExit(f"Missing source image: {SRC}")

    source = Image.open(SRC)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for filename, size in SIZES.items():
        icon = square_icon(source, size)
        icon.save(OUT_DIR / filename, format="PNG", optimize=True)
        print(f"wrote {OUT_DIR / filename} ({size}x{size})")


if __name__ == "__main__":
    main()
