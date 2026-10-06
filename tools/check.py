#!/usr/bin/env python3
"""
Visual check: screenshots of every stop in the film plus the sections below it,
on a laptop and a phone, with any JavaScript errors printed.

    pip install playwright && python3 -m playwright install chromium
    python3 tools/check.py                 -> dist/screens/*.jpg

Serves the project on a local port for the duration of the run.
"""
import asyncio
import re
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "dist" / "screens"
PORT = 8790
VIEWPORTS = {"laptop": (1440, 810, False), "phone": (390, 844, True)}


def stops() -> list[float]:
    """Read the snap stops from config.js so this check follows the film."""
    config = (ROOT / "assets/js/config.js").read_text()
    block = re.search(r"stops:\s*\[(.*?)\]", config, re.S).group(1)
    return [float(v) for v in re.findall(r"\d+\.\d+", block)]


async def run() -> int:
    from playwright.async_api import async_playwright
    OUT.mkdir(parents=True, exist_ok=True)
    errors = []
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for name, (w, h, mobile) in VIEWPORTS.items():
            ctx = await browser.new_context(viewport={"width": w, "height": h}, is_mobile=mobile, has_touch=mobile)
            page = await ctx.new_page()
            page.on("pageerror", lambda e: errors.append(f"{name}: {e}"))
            await page.goto(f"http://localhost:{PORT}/index.html")
            await page.wait_for_timeout(2000)
            for i, stop in enumerate(stops()):
                await page.evaluate(f"TC.story.go({stop})")
                await page.wait_for_timeout(1400)
                await page.screenshot(path=OUT / f"{name}-{i:02d}-stop-{stop:.3f}.jpg", type="jpeg", quality=70)
            for section in ["symptoms", "framework", "plan", "about", "contact-section"]:
                await page.evaluate(f"document.getElementById('{section}').scrollIntoView()")
                await page.wait_for_timeout(1800)
                await page.screenshot(path=OUT / f"{name}-section-{section}.jpg", type="jpeg", quality=70)
            await ctx.close()
        await browser.close()
    print(f"Screens in {OUT.relative_to(ROOT)}")
    print("No JavaScript errors" if not errors else "\n".join(errors))
    return 1 if errors else 0


def main() -> int:
    server = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=ROOT,
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    try:
        return asyncio.run(run())
    finally:
        server.terminate()


if __name__ == "__main__":
    sys.exit(main())
