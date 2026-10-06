# The Collective: website

A static site with no build step and no dependencies. A scroll-driven film of an orchestra in the dunes tells the idea; the sections below explain the framework, who we are, and how to reach us.

## Structure

```
index.html                     all text and structure
styleguide.html                every token and component, rendered live (not linked from the site)
assets/
  css/
    tokens.css                 design tokens: the only file with raw values
    fonts.css                  Restart Soft, once licensed
    base.css                   reset, links, focus ring, reduced motion
    components/                one file per component
      button.css  glass.css  nav.css  story.css  sections.css  tag.css  symptoms.css  diagram.css  dialog.css  motion.css
    styleguide.css             styleguide page only
  js/
    boot.js                    marks the page as loading (runs first, in <head>)
    util.js                    small shared helpers
    config.js                  everything the film does, and when
    story.js                   the film engine
    snap.js                    one scroll gesture = one step to the next stop in the film
    ui.js                      load state, reveals, navigation fade, contact dialog
    styleguide.js              styleguide page only
  img/
    scene.jpg  scene-soft.jpg  sign.png (programme sign at Plan)  finale.mp4 + finale-poster.jpg (closing video)  finale.jpg (unused)  og.jpg (share image, 1200 × 630)
  icons/                       favicon.svg, favicon-32.png, apple-touch-icon.png, icon-512.png
docs/
  DESIGN-SYSTEM.md             tokens, components, rules, recipes
  SYMPTOMS.md                  the twenty symptoms: roles, causes, tags, evidence, sources
tools/
  build_standalone.py          builds one self-contained HTML file for sharing
  set_domain.py                writes canonical URL, share image, robots.txt and sitemap.xml for a domain
  check.py                     screenshots of every film stop and section, laptop and phone
CLAUDE.md                      working notes for Claude Code
```

## Run locally

Any static server works, for example:

```
python3 tools/serve.py
```

then open http://localhost:8000. Opening `index.html` straight from disk also works.

## Common changes

| To change | Edit |
|---|---|
| A word or sentence | `index.html` |
| A symptom | `index.html` and `docs/SYMPTOMS.md` (keep both in step) |
| A colour, size, space or duration | `assets/css/tokens.css` |
| When a line appears, where the camera goes | `assets/js/config.js` |
| How a component looks | its file in `assets/css/components/` |

Rules and recipes are in `docs/DESIGN-SYSTEM.md`.

## Share as one file

```
python3 tools/build_standalone.py
```

writes `dist/the-collective.html` with every stylesheet, script and image inlined (about 2.5 MB).

## Check

```
pip install playwright && python3 -m playwright install chromium
python3 tools/check.py
```

screenshots every stop in the film and every section on a laptop and a phone into `dist/screens/`, and fails on JavaScript errors.

## Deploy

Upload the project folder (without `dist/`, `docs/`, `tools/` if you prefer) to any static host: GitHub Pages, Netlify, Vercel or a plain web server. No server code is needed.

## Before going live

- **Contact form** is not connected. In `assets/js/ui.js`, replace the line under "No mail service is connected yet" with a POST to a form service (Formspree, Basin, Netlify Forms) or your own endpoint.
- **Restart Soft**: license the webfont and follow `assets/css/fonts.css`.
- **Legal**: add contact details, KvK number and a privacy statement (the form collects personal data).
- **Images**: the film's images are 2944 px wide JPEGs; consider WebP/AVIF versions for faster loading.
- **Domain**: run `python3 tools/set_domain.py https://your-domain` once the address is known. It adds the canonical URL and share image to `<head>`, completes the structured data and writes `robots.txt` and `sitemap.xml`. Then submit the sitemap in Google Search Console.
- **Profiles**: add LinkedIn URLs for the company and both founders as `sameAs` in the structured data.
- **Dutch**: most Benelux searches are in Dutch ("operating model advies", "strategie uitvoering"). A Dutch version with `hreflang` links will reach far more of them than this English page.
