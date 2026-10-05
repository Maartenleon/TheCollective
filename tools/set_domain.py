#!/usr/bin/env python3
"""
Set the site's public address once the domain is known. Run again whenever it changes.

    python3 tools/set_domain.py https://www.example.nl

Writes, from that one value:
- the canonical URL and the absolute share image in <head> (between the seo:site-url markers)
- url, logo and image in the structured data, with absolute @ids
- robots.txt and sitemap.xml in the project root
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
SHARE_IMAGE = "assets/img/og.jpg"
LOGO = "assets/icons/icon-512.png"

BLOCK = re.compile(r"(<!-- seo:site-url[^>]*-->)(.*?)(<!-- /seo:site-url -->)", re.S)
LD = re.compile(r'(<script type="application/ld\+json" id="structured-data">\n)(.*?)(\n</script>)', re.S)


def absolutise_ids(node, base):
    if isinstance(node, dict):
        # "#name" or an old "https://old-domain/#name" both become base + "#name"
        return {k: (base + "#" + v.split("#", 1)[1] if k == "@id" and isinstance(v, str) and "#" in v else absolutise_ids(v, base))
                for k, v in node.items()}
    if isinstance(node, list):
        return [absolutise_ids(v, base) for v in node]
    return node


def main() -> int:
    if len(sys.argv) != 2 or not sys.argv[1].startswith("https://"):
        print(__doc__)
        return 1
    site = sys.argv[1].rstrip("/") + "/"
    html = INDEX.read_text()

    tags = "\n".join([
        f'<link rel="canonical" href="{site}">',
        f'<meta property="og:url" content="{site}">',
        f'<meta property="og:image" content="{site}{SHARE_IMAGE}">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta property="og:image:alt" content="An orchestra and its conductor in a landscape of red dunes">',
        f'<meta name="twitter:image" content="{site}{SHARE_IMAGE}">',
    ])
    html, n = BLOCK.subn(lambda m: f"{m.group(1)}\n{tags}\n{m.group(3)}", html)
    if not n:
        print("seo:site-url markers not found in index.html")
        return 1

    def update_ld(m):
        data = json.loads(m.group(2))
        for item in data["@graph"]:
            item.pop("url", None)
        data = absolutise_ids(data, site)
        for item in data["@graph"]:
            if item["@type"] in ("ProfessionalService", "WebSite"):
                item["url"] = site
            if item["@type"] == "ProfessionalService":
                item["logo"] = site + LOGO
                item["image"] = site + SHARE_IMAGE
        return m.group(1) + json.dumps(data, ensure_ascii=False, indent=2) + m.group(3)

    html = LD.sub(update_ld, html)
    INDEX.write_text(html)

    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nDisallow: /styleguide.html\n\nSitemap: {site}sitemap.xml\n")
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"  <url><loc>{site}</loc><lastmod>{date.today().isoformat()}</lastmod></url>\n"
        "</urlset>\n")
    print(f"Site address set to {site}: index.html, robots.txt, sitemap.xml")
    return 0


if __name__ == "__main__":
    sys.exit(main())
