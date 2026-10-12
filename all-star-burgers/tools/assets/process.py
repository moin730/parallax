"""Cut out the hero foods and write web-ready WebP files plus the manifest.

Pipeline per asset:  raw photo -> rembg mask -> (optional circle mask for the
top-down pizza) -> edge cleanup -> trim to content -> resize -> WebP (alpha).

Usage:
    .venv/bin/python process.py            # all assets
    .venv/bin/python process.py burger     # one asset
    .venv/bin/python process.py --sheet    # also write review sheets

Review sheets (each cutout on light, dark and checkerboard backgrounds) go to
tools/assets/review/, which is git-ignored.
"""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter
from rembg import new_session, remove
import onnxruntime as ort
from scipy import ndimage
from scipy.spatial import ConvexHull

HERE = Path(__file__).parent
ROOT = HERE.parent.parent
RAW = HERE / "raw"
REVIEW = HERE / "review"
# Hero images are imported by lib/scenes.ts (not served from public/), so
# Next.js gives each one a content-hashed URL and edits are never cached stale.
ASSETS_DIR = ROOT / "assets"

ASSETS = [
    {
        "key": "pizza",
        "raw": "pizza-joyosity-9138383894.jpg",
        "out": "images/foods/pizza.webp",
        "max_side": 1400,
        # The pizza is a near-circle shot from above; a fitted circle gives a
        # cleaner crust edge than segmentation on the dark parchment.
        "circle": True,
        "source": {
            "title": "Margherita pizza",
            "creator": "joyosity",
            "landing": "https://www.flickr.com/photos/33993074@N00/9138383894",
            "url": "https://live.staticflickr.com/2823/9138383894_6ab8929901_o.jpg",
            "license": "CC BY 2.0",
            "license_url": "https://creativecommons.org/licenses/by/2.0/",
        },
    },
    {
        "key": "burger",
        "raw": "burger-unsplash-E94j3rMcxlw.jpg",
        "out": "images/foods/burger.webp",
        "max_side": 1400,
        # Shot on black with a mirror reflection under the bun: cut each
        # column at the first dark pixel below this height.
        "reflection_from": 0.745,
        "source": {
            "title": "Burger with lettuce and tomato (chosen by the client)",
            "creator": "David (foodphototasty) on Unsplash",
            "landing": "https://unsplash.com/photos/burger-with-lettuce-and-tomato-E94j3rMcxlw",
            "url": "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=2400",
            "license": "Unsplash License",
            "license_url": "https://unsplash.com/license",
        },
    },
    {
        "key": "drink",
        "raw": "drink-culinarygeek-5076312359.jpg",
        "out": "images/foods/drink.webp",
        "max_side": 1024,
        # The empty top of the glass shows the white studio background
        # through it; turn that into partial transparency.
        "glass": True,
        "studio": True,
        "open": 4,  # strip the thin reflection streak under the glass
        "source": {
            "title": "Iced Tea",
            "creator": "TheCulinaryGeek",
            "landing": "https://www.flickr.com/photos/72949902@N00/5076312359",
            "url": "https://live.staticflickr.com/4044/5076312359_61d145f959_o.jpg",
            "license": "CC BY 2.0",
            "license_url": "https://creativecommons.org/licenses/by/2.0/",
        },
    },
]

MODEL = "isnet-general-use"


def circle_mask(mask: Image.Image) -> Image.Image:
    """Replace a rough segmentation with the circle that best fits it.

    Uses the mask's area and centroid: for a disc, r = sqrt(area / pi).
    Slightly shrunk so no background shows at the rim, then feathered.
    """
    m = mask.point(lambda v: 255 if v > 128 else 0)
    w, h = m.size
    px = m.load()
    n = sx = sy = 0
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            if px[x, y]:
                n += 1
                sx += x
                sy += y
    cx, cy = sx / n, sy / n
    r = (n * 4 / 3.14159) ** 0.5 * 0.985
    out = Image.new("L", (w, h), 0)
    ImageDraw.Draw(out).ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    # A circle is only an approximation of a hand-stretched crust, so keep
    # the segmentation where it is tighter than the circle.
    out = ImageChops.multiply(out, mask.point(lambda v: 255 if v > 40 else v * 6))
    return out.filter(ImageFilter.GaussianBlur(1.2))


def clean_alpha(mask: Image.Image) -> Image.Image:
    """Drop faint background speckle and soften the hard segmentation edge."""
    m = mask.point(lambda v: 0 if v < 18 else v)
    return m.filter(ImageFilter.GaussianBlur(0.6))


def decontaminate(rgb: Image.Image, alpha: Image.Image, bg: tuple[int, int, int]) -> Image.Image:
    """Remove the background colour bleeding into semi-transparent edge pixels
    (the white halo on the burger and drink). Solves c = a*f + (1-a)*bg for f."""
    r, g, b = rgb.split()
    a = alpha.load()
    chans = [ch.load() for ch in (r, g, b)]
    w, h = rgb.size
    for y in range(h):
        for x in range(w):
            av = a[x, y]
            if 0 < av < 250:
                k = av / 255
                for i, ch in enumerate(chans):
                    f = (ch[x, y] - (1 - k) * bg[i]) / k
                    ch[x, y] = max(0, min(255, int(f)))
    return Image.merge("RGB", (r, g, b))


def largest_component(mask: Image.Image) -> Image.Image:
    """Keep only the biggest connected blob (drops reflections and specks)."""
    a = np.asarray(mask)
    labels, n = ndimage.label(a > 60)
    if n <= 1:
        return mask
    sizes = ndimage.sum(np.ones_like(a), labels, range(1, n + 1))
    keep = labels == (int(np.argmax(sizes)) + 1)
    keep = ndimage.binary_dilation(keep, iterations=3)
    return Image.fromarray(np.where(keep, a, 0).astype(np.uint8))


def studio_mask(rgb: Image.Image, mask: Image.Image, tol: float = 22) -> Image.Image:
    """Strengthen the model's mask for photos shot on a plain light backdrop.

    Background = pixels close to the backdrop colour that are connected to
    the image border. Everything else near the model's subject is kept, which
    rescues pale areas (mayo, bun underside) the model fades out. The search
    is limited to a band around the model's mask so soft floor shadows don't
    get pulled in.
    """
    c = np.asarray(rgb).astype(np.float32)
    m = np.asarray(mask)
    h, w = m.shape
    border = np.concatenate([c[:8].reshape(-1, 3), c[-8:].reshape(-1, 3), c[:, :8].reshape(-1, 3), c[:, -8:].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    # Backdrops are rarely flat; compare brightness-normalised colour too.
    dist = np.sqrt(((c - bg) ** 2).sum(axis=2))
    near_bg = (dist < tol) | ((c.min(axis=2) > bg.min() - tol) & (c.max(axis=2) - c.min(axis=2) < 14))
    labels, _ = ndimage.label(near_bg)
    edge = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    background = np.isin(labels, edge[edge > 0])
    band = ndimage.binary_dilation(m > 30, iterations=max(4, w // 120))
    fg = (~background) & band
    fg = ndimage.binary_opening(fg, iterations=2)
    fg = ndimage.binary_fill_holes(fg)
    soft = ndimage.gaussian_filter(fg.astype(np.float32), 1.0) * 255
    return Image.fromarray(np.maximum(m, soft).clip(0, 255).astype(np.uint8))


def hull_mask(mask: Image.Image, fill_below: float) -> Image.Image:
    """Use the convex hull of the mask's solid core to repair the silhouette.

    Everywhere, anything outside the hull is cut (smudges past the true
    edge). Below `fill_below` (fraction of the subject's height) the hull is
    also filled in: the bottom bun is a convex oval, which restores its edge
    where the photo is blown out to the backdrop colour. Higher up the burger
    narrows (patty, lettuce), so filling there would add backdrop.
    """
    a = np.asarray(mask).astype(np.float32)
    ys, xs = np.nonzero(a > 200)
    pts = np.column_stack([xs, ys])
    hull = pts[ConvexHull(pts).vertices]
    poly = Image.new("L", mask.size, 0)
    ImageDraw.Draw(poly).polygon([tuple(map(float, p)) for p in hull], fill=255)
    h = np.asarray(poly.filter(ImageFilter.GaussianBlur(1.0))).astype(np.float32)
    top, bottom = ys.min(), ys.max()
    y0 = top + (bottom - top) * fill_below
    rows = np.arange(a.shape[0])[:, None]
    # Blend over a few rows so the switch from clip to fill has no seam.
    t = np.clip((rows - y0) / 12, 0, 1)
    out = (1 - t) * np.minimum(a, h) + t * np.maximum(np.minimum(a, h), h)
    return Image.fromarray(out.clip(0, 255).astype(np.uint8))


def cut_reflection(rgb: Image.Image, mask: Image.Image, start: float, dark: int = 40, run: int = 10) -> Image.Image:
    """Remove a mirror reflection under a subject shot on a dark, glossy
    surface. Below `start` (fraction of image height), each column is cut
    where a run of `run` dark pixels begins: the gap between the real food
    and its reflection. Requiring a run (not one pixel) and smoothing the
    cut line across columns stops dark creases in the food causing notches.
    """
    lum = np.asarray(rgb.convert("L")).astype(np.int16)
    m = np.asarray(mask).astype(np.float32)
    h, w = lum.shape
    y0 = int(h * start)
    d = (lum[y0:] < dark).astype(np.int16)
    # run-length of dark pixels starting at each row (computed bottom-up)
    runs = np.zeros_like(d)
    runs[-1] = d[-1]
    for y in range(d.shape[0] - 2, -1, -1):
        runs[y] = (runs[y + 1] + 1) * d[y]
    hit = runs >= run
    first = np.where(hit.any(axis=0), hit.argmax(axis=0), h - y0) + y0
    first = ndimage.median_filter(first, size=31, mode="nearest")
    rows = np.arange(h)[:, None]
    # Feather the cut over 3px so the bun's underside isn't a hard line.
    keep = np.clip((first[None, :] - rows) / 3.0, 0, 1)
    return Image.fromarray((m * keep).astype(np.uint8))


def glass_alpha(rgb: Image.Image, alpha: Image.Image) -> tuple[Image.Image, Image.Image]:
    """Near-white, unsaturated pixels inside a glass are background seen
    through it. Lower their alpha and un-mix the white so the page colour
    shows through instead of a white smear. Bright specular highlights keep
    some opacity so the glass still reads as glass."""
    c = np.asarray(rgb).astype(np.float32)
    a = np.asarray(alpha).astype(np.float32) / 255
    lo, hi = c.min(axis=2), c.max(axis=2)
    whiteness = np.clip((lo - 170) / 70, 0, 1) * np.clip(1 - (hi - lo) / 40, 0, 1)
    new_a = a * (1 - whiteness * 0.8)
    k = np.clip(new_a, 1e-3, 1)[..., None]
    # c = k*f + (1-k)*white  ->  f = (c - (1-k)*255) / k, only where we changed alpha
    f = np.where(whiteness[..., None] > 0, (c - (1 - k) * 255 * (a[..., None] > 0)) / k, c)
    return (Image.fromarray(np.clip(f, 0, 255).astype(np.uint8)),
            Image.fromarray((new_a * 255).astype(np.uint8)))


def corner_colour(img: Image.Image) -> tuple[int, int, int]:
    w, h = img.size
    pts = [(5, 5), (w - 6, 5), (5, h - 6), (w - 6, h - 6)]
    cols = [img.getpixel(p) for p in pts]
    return tuple(sum(c[i] for c in cols) // len(cols) for i in range(3))


def process(asset: dict, session) -> dict:
    src = Image.open(RAW / asset["raw"]).convert("RGB")
    mask = remove(src, session=session, only_mask=True)
    if asset.get("circle"):
        mask = circle_mask(mask)
    else:
        if asset.get("studio"):
            mask = studio_mask(src, mask)
        if asset.get("reflection_from"):
            mask = cut_reflection(src, mask, asset["reflection_from"])
        if asset.get("open"):
            # Opening removes structures thinner than ~2*open px (streaks),
            # then the original soft edge is restored inside what remains.
            keep = ndimage.binary_opening(np.asarray(mask) > 60, iterations=asset["open"])
            keep = ndimage.binary_dilation(keep, iterations=asset["open"])
            mask = Image.fromarray(np.where(keep, np.asarray(mask), 0).astype(np.uint8))
        mask = clean_alpha(largest_component(mask))
        if asset.get("convex"):
            mask = hull_mask(mask, asset["convex"])
        src = decontaminate(src, mask, corner_colour(src))
        if asset.get("glass"):
            src, mask = glass_alpha(src, mask)

    rgba = src.copy()
    rgba.putalpha(mask)
    box = mask.point(lambda v: 255 if v > 128 else 0).getbbox()
    box = (max(0, box[0] - 3), max(0, box[1] - 3), min(mask.width, box[2] + 3), min(mask.height, box[3] + 3))
    rgba = rgba.crop(box)
    rgba.thumbnail((asset["max_side"], asset["max_side"]), Image.LANCZOS)

    out = ASSETS_DIR / asset["out"]
    out.parent.mkdir(parents=True, exist_ok=True)
    rgba.save(out, "WEBP", quality=90, method=6, exact=False)
    return {
        "key": asset["key"],
        "path": "assets/" + asset["out"],
        "width": rgba.width,
        "height": rgba.height,
        "format": "webp (alpha)",
        "raw": f"tools/assets/raw/{asset['raw']}",
        "processing": f"rembg {MODEL}" + (" + fitted circle" if asset.get("circle") else (" + studio backdrop mask" if asset.get("studio") else "") + " + colour decontamination" + (" + convex hull" if asset.get("convex") else "") + (" + glass transparency" if asset.get("glass") else "")),
        **asset["source"],
    }


def review_sheet(entry: dict) -> None:
    im = Image.open(ROOT / entry["path"]).convert("RGBA")
    im.thumbnail((520, 520))
    pad = 30
    tile_w, tile_h = im.width + pad * 2, im.height + pad * 2
    sheet = Image.new("RGB", (tile_w * 3, tile_h), "white")
    for i, bg in enumerate(["#f5efe6", "#141414", None]):
        tile = Image.new("RGB", (tile_w, tile_h), bg or "white")
        if bg is None:  # checkerboard shows any leftover fringe
            d = ImageDraw.Draw(tile)
            for y in range(0, tile_h, 20):
                for x in range(0, tile_w, 20):
                    if (x // 20 + y // 20) % 2:
                        d.rectangle([x, y, x + 19, y + 19], fill="#cfcfcf")
        tile.paste(im, (pad, pad), im)
        sheet.paste(tile, (i * tile_w, 0))
    REVIEW.mkdir(exist_ok=True)
    sheet.save(REVIEW / f"{entry['key']}.jpg", quality=85)


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    wanted = [a for a in ASSETS if not args or a["key"] in args]
    # birefnet is memory-hungry (5 GB+ with default settings, enough to take
    # down the terminal on a 10 GB machine). Without the arena allocator and
    # memory-pattern planning it fits in roughly half that, at some speed cost.
    opts = ort.SessionOptions()
    opts.enable_cpu_mem_arena = False
    opts.enable_mem_pattern = False
    opts.intra_op_num_threads = 2
    opts.inter_op_num_threads = 1
    session = new_session(MODEL, sess_opts=opts)

    manifest_path = HERE / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    for asset in wanted:
        entry = process(asset, session)
        manifest[entry["key"]] = entry
        if "--sheet" in sys.argv:
            review_sheet(entry)
        print(f"{entry['key']}: {entry['path']} {entry['width']}x{entry['height']}")

    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
