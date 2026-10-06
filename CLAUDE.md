# The Collective website: notes for Claude Code

The website of The Collective, a two-person operating model advisory in Amsterdam (Maarten Stienstra and Kai Jacobse). A scroll-driven film of an orchestra in red dunes tells the idea; below it, eight symptoms executives recognise, the framework, who we are and a contact form. Static HTML, CSS and JavaScript: no framework, no build step, no dependencies.

## Commands

```
python3 tools/serve.py                      # run locally, open http://localhost:8000 (no caching, plays the video in Safari)
python3 tools/check.py                      # screenshots of every film stop and section (laptop + phone), fails on JS errors
python3 tools/build_standalone.py           # dist/the-collective.html, one self-contained file for sharing
python3 tools/set_domain.py https://…       # canonical URL, share image, structured data, robots.txt, sitemap.xml
```

`tools/check.py` needs Playwright (`pip install playwright && python3 -m playwright install chromium`). Always look at the laptop **and** phone screenshots after changing the film, panels or layout.

## Where things live

- Words: `index.html` only. The site shows eight symptoms; all twenty are documented, with evidence and sources, in `docs/SYMPTOMS.md`; keep both in step.
- Colours, type, space, radii, motion: `assets/css/tokens.css` only. Components read tokens; component-only knobs are custom properties declared at the top of the component's root rule.
- Everything the film does and when (camera, focus, text timing, snap stops, panels): `assets/js/config.js`.
- Engines (`story.js`, `snap.js`, `ui.js`) are generic: no copy, colours or timings in them.
- JavaScript finds elements through `data-*` attributes, never classes. Classes are BEM (`block__element--modifier`), states are `is-*`.
- Full rules, component list and recipes: `docs/DESIGN-SYSTEM.md`. The styleguide (`styleguide.html`) renders every token live.

## The idea (for copy and design decisions)

The orchestra is the organisation. It must play tonight's concert and be ready for next season's programme.

- **Plan**, the programme: ambition, choices, goals. What we want to play, for our audience, the customer.
- **Blueprint**, the score: the intended design on paper. Value streams, business capabilities, operating model, organisational design. What it takes to play it.
- **Means**, the orchestra: people, process, technology, spend. Shared by run (today) and change (tomorrow).
- **Orchestration**, the conductor: plan, blueprint and means in motion, the day-to-day rhythm of decisions. What starts, what stops, who gets the people.

Thesis: problems come from a missing part or from parts that don't connect. "Great parts don't automatically create a great whole."

## Decisions to respect

- Client-facing copy is English with British spelling ("organisation"). Minimal text. Plain words an executive would use; no consultant jargon. Enterprise-architecture vocabulary only as tags, not in sentences. "Blueprint" is our own term and stays.
- Keep the continuous scroll film on every screen; a separate phone layout was tried and rejected. Inside the film one gesture moves to the next stop (`snap.js`).
- Every text block over the film uses the same title and italic line style as the opening; the closing question is centred in the viewport.
- Glass panels sit bottom-left above the timeline; no divider lines inside glass; sans text in panels is the same 12px as the brand and timeline.
- Plan, Means and the conductor close-up use *subject* keyframes so they are always entirely above their panel. Keep it that way when changing panels or copy.
- The lightest colour must never look beige. Vermilion (the conductor's coat) is the one accent: at most once per view.
- Related concepts are quiet pills, not links.
- Fonts: EB Garamond (serif) and Restart Soft (sans, commercial, not yet licensed; Figtree stands in).

## SEO

One visually hidden `<h1>`; film text and panel titles are not headings; sections carry the outline. Structured data (`ProfessionalService`, founders, `knowsAbout`) is in `<head>` with `id="structured-data"`. Address-dependent tags are written by `tools/set_domain.py` between the `seo:site-url` markers: don't hand-edit them. Symptom anchors (`#too-many-initiatives`, …) are meant to be linked from posts; keep them stable.

## Open before launch

- Domain: run `tools/set_domain.py`, then submit `sitemap.xml` in Google Search Console.
- Contact form is not connected (see the comment in `assets/js/ui.js`).
- KvK number, contact details and a privacy statement.
- LinkedIn URLs as `sameAs` in the structured data.
- Restart Soft licence (`assets/css/fonts.css`).
- A Dutch version with `hreflang` for Benelux searches.
- Test the stop-to-stop scrolling on a real MacBook trackpad and iPhone: inertia handling is tuned in `config.snap` (`quiet`, `swipe`).
