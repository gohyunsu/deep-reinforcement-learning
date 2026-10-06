"""Render local lecture PDFs to individual public WebP pages.

Only rendered pages are written under docs/. Original PDFs stay in slides/.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = json.loads((ROOT / "content" / "manifest.json").read_text(encoding="utf-8"))
OUTPUT = ROOT / "docs" / "assets" / "slides"


def render_lecture(spec: dict) -> None:
    source = ROOT / "slides" / spec["file"]
    if not source.is_file():
        raise FileNotFoundError(source)
    destination = OUTPUT / spec["id"]
    destination.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="drl-slides-") as temp:
        prefix = Path(temp) / "page"
        subprocess.run(
            [
                "pdftoppm",
                "-jpeg",
                "-jpegopt",
                "quality=88",
                "-scale-to",
                "1600",
                str(source),
                str(prefix),
            ],
            check=True,
        )
        pages = sorted(Path(temp).glob("page-*.jpg"))
        if len(pages) != spec["pages"]:
            raise RuntimeError(
                f"{spec['id']}: expected {spec['pages']} pages, rendered {len(pages)}"
            )
        for number, page in enumerate(pages, 1):
            target = destination / f"{number:02d}.webp"
            with Image.open(page) as image:
                image.save(target, "WEBP", quality=85, method=6)
    print(f"{spec['id']}: {len(pages)} pages", flush=True)


def main() -> None:
    if not shutil.which("pdftoppm"):
        raise RuntimeError("Poppler pdftoppm is required")
    for lecture in MANIFEST:
        render_lecture(lecture)
    print(f"Rendered {sum(item['pages'] for item in MANIFEST)} pages", flush=True)


if __name__ == "__main__":
    main()
