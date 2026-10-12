"""Regenerate ASSETS.md (human-readable credits) from manifest.json.

Usage:  .venv/bin/python credits.py
"""

import json
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parent.parent

NOTES = [
    "rawpixel images are downloaded at their `editor_1024` size. The larger `image_1300` size carries a faint rawpixel watermark and must not be used.",
    "rawpixel items are listed as CC0 in the Openverse index. rawpixel's own pages block automated access, so the license couldn't be double-checked there; please confirm on the source pages before launch.",
    "The Unsplash License allows commercial use without attribution; the photographer is credited anyway.",
    "Edits made to every image: background removed, edges cleaned, cropped and resized. The burger's mirror reflection was cut away; the drink had its white backdrop colour removed from edge pixels and its glass made partly transparent; the lemon slices had colour and contrast lifted.",
]


def main() -> None:
    m = json.loads((HERE / "manifest.json").read_text())
    lines = [
        "# Image credits and licenses",
        "",
        "All photos are real photographs. Most were found through [Openverse](https://openverse.org) with licenses that allow commercial use and modification; the burger was chosen on Unsplash. Cutouts were made locally with `tools/assets/process.py` and `tools/assets/particles.py` (rembg); originals are kept in `tools/assets/raw/`. Machine-readable details: `tools/assets/manifest.json`.",
        "",
        "CC BY 2.0 photos require attribution: keep these credits (they are also linked in the site footer).",
        "",
        "| Used as | Files | Title | Creator | License | Source |",
        "|---|---|---|---|---|---|",
    ]
    for key, v in m.items():
        files = v.get("path") or ", ".join(f["path"].rsplit("/", 1)[1] for f in v["files"])
        lines.append(
            f"| {key.replace('particles:', 'particles: ')} | `{files}` | {v['title']} | {v['creator']} "
            f"| [{v['license']}]({v['license_url']}) | [link]({v['landing']}) |"
        )
    lines += ["", "## Notes", ""] + [f"- {n}" for n in NOTES]
    (ROOT / "ASSETS.md").write_text("\n".join(lines) + "\n")
    print("wrote ASSETS.md")


if __name__ == "__main__":
    main()
