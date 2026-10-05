#!/usr/bin/env python3
"""
Build a single, self-contained HTML file from the site, for sharing by email
or chat: every stylesheet, script and image is inlined.

    python3 tools/build_standalone.py            -> dist/the-collective.html

The multi-file site in the project root stays the source of truth; never edit
the built file by hand.
"""
import base64
import mimetypes
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "index.html"
OUT = ROOT / "dist" / "the-collective.html"

LINK = re.compile(r'<link rel="stylesheet" href="(assets/[^"]+)">')
SCRIPT = re.compile(r'<script src="(assets/[^"]+)"( defer)?></script>\n?')
IMAGE = re.compile(r'"(assets/img/[^"]+)"')
PRELOAD = re.compile(r'<link rel="preload"[^>]*>\n?')
ICON = re.compile(r'(<link rel="(?:icon|apple-touch-icon)" href=")(assets/icons/[^"]+)"')


def data_uri(path: Path) -> str:
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"


def inline_css(match: re.Match) -> str:
    return f"<style>\n{(ROOT / match.group(1)).read_text()}</style>"


def main() -> int:
    html = SOURCE.read_text()
    html = LINK.sub(inline_css, html)
    html = PRELOAD.sub("", html)                         # the images are inlined below, nothing to preload
    html = ICON.sub(lambda m: m.group(1) + data_uri(ROOT / m.group(2)) + '"', html)

    # Deferred scripts run after the document is parsed. Inline scripts cannot be
    # deferred, so they move to the end of <body> in their original order.
    deferred = []

    def inline_js(match: re.Match) -> str:
        code = (ROOT / match.group(1)).read_text()
        code = IMAGE.sub(lambda m: f'"{data_uri(ROOT / m.group(1))}"', code)
        tag = f"<script>\n{code}</script>\n"
        if match.group(2):
            deferred.append(tag)
            return ""
        return tag

    html = SCRIPT.sub(inline_js, html)
    html = html.replace("</body>", "".join(deferred) + "</body>")

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html)
    print(f"{OUT.relative_to(ROOT)}  {OUT.stat().st_size / 1e6:.1f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
