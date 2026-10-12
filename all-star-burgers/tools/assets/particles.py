"""Cut small floating ingredients (the parallax particles) out of photos
that show several separate pieces on a white backdrop.

Each separate piece in a photo becomes its own transparent WebP:
    assets/images/particles/<key>-<nn>.webp

Pieces listed under "keep" are exported; run with --all to export every
piece and write a numbered review sheet so you can choose.

Usage:
    .venv/bin/python particles.py [--all]
"""

import json
import sys
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter
from scipy import ndimage

from process import RAW, REVIEW, ROOT, clean_alpha, decontaminate, MODEL
from rembg import new_session, remove
import onnxruntime as ort

OUT = ROOT / "assets" / "images" / "particles"
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/130"}

SOURCES = [
    {
        "key": "tomato",
        "url": "https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvaXM3ODc0LWltYWdlLWt3eXM4ZGgzLmpwZw.jpg",
        "landing": "https://www.rawpixel.com/image/5968931/cherry-tomato-white-background",
        "title": "Cherry Tomato on White Background",
        "creator": "rawpixel (public domain collection)",
        "license": "CC0 1.0 (as indexed by Openverse)",
        "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
        "min_area": 400,
        "keep": [2, 4, 9, 11, 16],
    },
    {
        "key": "lettuce",
        "url": "https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvc3YxMjYxMDktaW1hZ2Uta3d2dWlpODcuanBn.jpg",
        "landing": "https://www.rawpixel.com/image/5902321/photo-image-background-public-domain-green",
        "title": "Free lettuce leaf white background",
        "creator": "rawpixel (public domain collection)",
        "license": "CC0 1.0 (as indexed by Openverse)",
        "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
        "min_area": 5000,
        "keep": [0],
    },
    {
        "key": "citrus",
        "url": "https://live.staticflickr.com/8678/15686963356_11c192779a_b.jpg",
        "landing": "https://www.flickr.com/photos/127365614@N08/15686963356",
        "title": "Grapefruit and lemon slices with rose flower petals",
        "creator": "ProFlowers.com",
        "license": "CC BY 2.0",
        "license_url": "https://creativecommons.org/licenses/by/2.0/",
        "min_area": 1500,
        "keep": [3, 11, 13, 28, 9, 19],
        # The lemon slices in this shot are pale; lift colour and contrast
        # so they read as fresh fruit against the dark teal theme.
        "enhance": {"color": 1.55, "contrast": 1.12, "brightness": 1.04},
    },
]


def fetch(src: dict) -> Path:
    path = RAW / f"particle-{src['key']}.jpg"
    if not path.exists():
        req = urllib.request.Request(src["url"], headers=UA)
        path.write_bytes(urllib.request.urlopen(req, timeout=90).read())
    return path


def pieces(src: dict, session) -> list[Image.Image]:
    rgb = Image.open(fetch(src)).convert("RGB")
    mask = remove(rgb, session=session, only_mask=True)
    # No studio_mask here: on these shots it keeps the soft drop shadow,
    # which shows as a pale halo. The model's own mask, pulled in by 2px,
    # is tighter.
    mask = clean_alpha(mask).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(0.7))
    rgb = decontaminate(rgb, mask, (250, 250, 250))
    a = np.asarray(mask)
    labels, n = ndimage.label(a > 100)
    out = []
    for i, sl in enumerate(ndimage.find_objects(labels), start=1):
        if sl is None or (labels[sl] == i).sum() < src["min_area"]:
            continue
        y0, y1 = max(0, sl[0].start - 4), min(a.shape[0], sl[0].stop + 4)
        x0, x1 = max(0, sl[1].start - 4), min(a.shape[1], sl[1].stop + 4)
        # Only this piece's pixels, so neighbours that overlap the box vanish.
        own = ndimage.binary_dilation(labels[y0:y1, x0:x1] == i, iterations=3)
        alpha = np.where(own, a[y0:y1, x0:x1], 0)
        # Specular highlights on shiny skins get read as backdrop; enclosed
        # holes are always part of the piece.
        solid = labels[y0:y1, x0:x1] == i
        holes = ndimage.binary_fill_holes(solid) & ~solid
        alpha = np.where(holes, 255, alpha).astype(np.uint8)
        piece = rgb.crop((x0, y0, x1, y1))
        if src.get("enhance"):
            e = src["enhance"]
            piece = ImageEnhance.Color(piece).enhance(e.get("color", 1))
            piece = ImageEnhance.Contrast(piece).enhance(e.get("contrast", 1))
            piece = ImageEnhance.Brightness(piece).enhance(e.get("brightness", 1))
        piece.putalpha(Image.fromarray(alpha))
        piece.thumbnail((360, 360), Image.LANCZOS)
        out.append(piece)
    return out


def main() -> None:
    show_all = "--all" in sys.argv
    opts = ort.SessionOptions()
    opts.enable_cpu_mem_arena = False
    opts.intra_op_num_threads = 2
    session = new_session(MODEL, sess_opts=opts)
    OUT.mkdir(parents=True, exist_ok=True)
    REVIEW.mkdir(exist_ok=True)

    manifest_path = Path(__file__).parent / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    for src in SOURCES:
        ps = pieces(src, session)
        keep = range(len(ps)) if show_all or src["keep"] is None else src["keep"]
        files = []
        for j in keep:
            name = f"{src['key']}-{j:02d}.webp"
            ps[j].save(OUT / name, "WEBP", quality=88, method=6)
            files.append({"path": f"assets/images/particles/{name}", "width": ps[j].width, "height": ps[j].height})
        manifest[f"particles:{src['key']}"] = {
            "files": files,
            "raw": f"tools/assets/raw/particle-{src['key']}.jpg",
            "processing": f"rembg {MODEL} + studio backdrop mask, split into connected pieces",
            **{k: src[k] for k in ("title", "creator", "landing", "url", "license", "license_url")},
        }
        # Numbered sheet on a dark backdrop to pick pieces and spot fringes.
        cell = 200
        cols = 8
        rows = (len(ps) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * cell, max(1, rows) * cell), "#1a1a1a")
        d = ImageDraw.Draw(sheet)
        for j, p in enumerate(ps):
            t = p.copy()
            t.thumbnail((cell - 20, cell - 30))
            x, y = (j % cols) * cell, (j // cols) * cell
            sheet.paste(t, (x + (cell - t.width) // 2, y + 22), t)
            d.text((x + 6, y + 4), f"{src['key']} #{j}", fill="white")
        sheet.save(REVIEW / f"particles-{src['key']}.jpg", quality=85)
        print(f"{src['key']}: {len(ps)} pieces, exported {len(files)}")

    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
