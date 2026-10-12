"""Search Openverse for candidate photos and build a numbered contact sheet.

Only licences that allow commercial use and modification are requested:
CC0, Public Domain Mark and CC BY (attribution required, recorded in the
results JSON so it can go into the manifest).

Usage:
    .venv/bin/python search.py OUT_DIR "query one" "query two" ...

Writes OUT_DIR/candidates.json and OUT_DIR/sheet.jpg (numbered thumbnails).
"""

import io
import os
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw

API = "https://api.openverse.org/v1/images/"
UA = {"User-Agent": "AllStarBurgersAssetPipeline/0.1 (local dev script)"}
LICENSES = "cc0,pdm,by"
SOURCE = os.environ.get("OV_SOURCE", "")  # e.g. rawpixel to search one collection
THUMB = 260
COLS = 6


def get(url: str, timeout: int = 30) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def search(query: str, per_query: int) -> list[dict]:
    params = urllib.parse.urlencode({
        "q": query,
        "license": LICENSES,
        "page_size": per_query,
        "mature": "false",
        **({"source": SOURCE} if SOURCE else {}),
    })
    data = json.loads(get(f"{API}?{params}"))
    return data.get("results", [])


def main() -> None:
    out = Path(sys.argv[1])
    queries = sys.argv[2:]
    out.mkdir(parents=True, exist_ok=True)

    seen, items = set(), []
    for q in queries:
        for r in search(q, 18):
            if r["id"] in seen:
                continue
            seen.add(r["id"])
            items.append({
                "n": len(items),
                "query": q,
                "id": r["id"],
                "title": r.get("title"),
                "url": r["url"],
                "thumbnail": r.get("thumbnail"),
                "landing": r.get("foreign_landing_url"),
                "creator": r.get("creator"),
                "license": r.get("license"),
                "license_version": r.get("license_version"),
                "license_url": r.get("license_url"),
                "attribution": r.get("attribution"),
                "width": r.get("width"),
                "height": r.get("height"),
                "source": r.get("source"),
            })

    tiles = []
    for it in items:
        try:
            im = Image.open(io.BytesIO(get(it["thumbnail"] or it["url"]))).convert("RGB")
            im.thumbnail((THUMB, THUMB))
        except Exception as e:  # dead links are common; skip them
            it["error"] = str(e)
            continue
        tile = Image.new("RGB", (THUMB, THUMB + 22), "white")
        tile.paste(im, ((THUMB - im.width) // 2, (THUMB - im.height) // 2))
        d = ImageDraw.Draw(tile)
        d.rectangle([0, THUMB, THUMB, THUMB + 22], fill="black")
        d.text((6, THUMB + 5), f"#{it['n']}  {it['width']}x{it['height']}  {it['license']}", fill="white")
        tiles.append(tile)

    (out / "candidates.json").write_text(json.dumps(items, indent=2))
    if not tiles:
        print("no thumbnails")
        return
    rows = (len(tiles) + COLS - 1) // COLS
    sheet = Image.new("RGB", (COLS * THUMB, rows * (THUMB + 22)), "#888")
    for i, t in enumerate(tiles):
        sheet.paste(t, ((i % COLS) * THUMB, (i // COLS) * (THUMB + 22)))
    sheet.save(out / "sheet.jpg", quality=80)
    print(f"{len(items)} results, {len(tiles)} thumbnails -> {out/'sheet.jpg'}")


if __name__ == "__main__":
    main()
