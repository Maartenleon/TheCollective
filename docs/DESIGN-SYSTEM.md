# The Collective: design system

One idea runs through everything: **an organisation that plays as one, like an orchestra in a vast, quiet landscape.** The site shows the whole, looks closely at each part, then shows the whole again. The design system exists to keep that calm: few colours, two typefaces, one accent, slow motion.

Open `styleguide.html` to see every token and component rendered live.

---

## 1. How it is built

| Layer | File | Holds |
|---|---|---|
| Tokens | `assets/css/tokens.css` | Every colour, size, space, radius, shadow, duration and easing. The only file with raw values. |
| Base | `assets/css/base.css` | Reset, body, links in reading text, the focus ring, reduced motion. |
| Components | `assets/css/components/*.css` | One file per component. They only read tokens. |
| Behaviour | `assets/js/config.js` | Everything the film does and when: camera, focus, text timing, page behaviour. |
| Engine | `assets/js/story.js`, `ui.js` | Generic code. No copy, no colours, no timings. |
| Content | `index.html` | All text. Elements are wired to behaviour through `data-*` attributes. |

**The rule:** a value lives in exactly one place. Colour → tokens. Timing → config. Words → HTML. If you find yourself typing a hex code, a pixel value or a sentence into a component or a script, it belongs in one of those three instead.

Component files may declare **component tokens**: custom properties at the top of the component's root rule (`.panel { --panel-padding: … }`). They are the tuning knobs for that component only, and derive from global tokens where they can.

---

## 2. Colour

### Palette

| Token | Value | Where it comes from | Use |
|---|---|---|---|
| `--palette-shadow` | `#1A0E0A` | Deepest shadow in the dunes | Page ground |
| `--palette-garnet` | `#5C0F07` | Concert-hall plush | Brand red (print, documents) |
| `--palette-vermilion` | `#F1400B` | The conductor's coat | The one accent |
| `--palette-paper` | `#FAF8F6` | Parchment | Text on dark |
| `--palette-cream` | `#FCE8D8` | Bright cream with a hint of peach | Highlights, labels |

The lightest colour is deliberately brighter than beige. Keep it that way.

### Roles

Components use **roles**, never the palette. Roles say what a colour is for, so a change of meaning is a change in one line.

- `--color-bg`, `--color-text`, `--color-text-body`, `--color-text-muted`, `--color-text-subtle`
- `--color-highlight` cream: eyebrows, kickers, labels, hover
- `--color-accent` vermilion: **at most once per view**. In the film, the conductor is the accent; the interface stays out of its way.
- `--color-line` … `--color-line-hair` four strengths of hairline
- `--color-glass`, `--color-glass-strong`, `--color-overlay`, fades, diagram colours

For a transparent variant, use the channel tokens: `rgb(var(--rgb-paper) / .5)`. Add a role for it if it is used more than once.

### Canvas

The film is drawn on a canvas, which cannot read CSS directly. The engine reads these tokens at start-up and on resize:
`--rgb-canvas-shade` (dims everything out of focus, and the dip to shadow), `--rgb-glow-core`, `--rgb-glow`, `--rgb-glow-rim` (the warm spotlight). The sky and ground colours that continue each image off its edges are sampled from the images, so they live with the images in `config.js`.

---

## 3. Type

Two typefaces, with strictly separate jobs.

- **Serif, EB Garamond** carries the story: every sentence a visitor reads.
- **Sans, Restart Soft** labels and controls it: navigation, buttons, kickers, the timeline. Restart Soft is commercial; until it is licensed, Figtree stands in. See `assets/css/fonts.css`.

| Token | Use |
|---|---|
| `--text-beat` | Every title over the film: the opening, "It isn't.", "Great parts…", the closing question |
| `--text-lede` | Every italic line under a title over the film |
| `--text-h2` / `--text-h3-lg` / `--text-h3` | Section, part and person titles |
| `--text-body` / `--text-body-sm` | Reading text (`body-sm` on phones and in bios) |
| `--text-ui` | All sans text: nav, buttons, labels, timeline |

Rules:
- **Over the film, every beat is a title plus italic lines in muted paper**, exactly like the opening. No beat is bigger, brighter or differently coloured than another; emphasis comes from timing and position, not size.
- Italic is for short lines under a title. Never a whole paragraph.
- One weight for the serif. Hierarchy comes from size and colour, not bold.
- Body text never wider than `--measure` (about 65 characters).
- Headings use `text-wrap: balance`.

---

## 4. Space and layout

Space scale: `--space-3xs` (0.25rem) → `--space-2xl`, plus `--space-section`, `--space-section-lg` and `--space-section-end` for the rhythm between sections. Use the scale; if nothing fits, the design is asking for a new step, not a one-off value.

Layout tokens: `--gutter` (side margin, fluid), `--measure`, `--beat-width`, `--panel-width`, `--nav-offset`, `--panel-offset`, `--timeline-offset`, `--story-length` (scroll distance of the film).

Breakpoints (fixed values, because CSS variables cannot be used in media queries):
- **720px**: phones and narrow tablets. Panels and timeline span the width, grids stack.
- **560px**: small phones. Compact navigation, phone version of the diagram.

---

## 5. Shape, depth, glass

- `--radius-glass` (panels), `--radius-card` (dialog), `--radius-pill` (buttons), `--radius-hair`.
- **Glass** (`.glass`, `.glass--strong`): smoked, blurred, a hairline edge, a soft shadow. No divider lines inside glass.
- `--shadow-text` lifts text off a bright sky. Only over the film.

---

## 6. Motion

- `--ease-out` for arrivals, `--ease-in-out` for departures, `--ease-draw` for lines drawing themselves.
- `--dur-fast` (hover), `--dur-base`, `--dur-slow` (panels, sections), `--dur-slower` (entrances).
- `--stagger` between items that appear in turn.

Rules: motion either follows the scroll or confirms that something arrived. Nothing loops, nothing bounces. Everything honours `prefers-reduced-motion`: the film keeps only a fifth of its camera travel, and text simply fades.

---

## 7. Components

| Component | Classes | States and notes |
|---|---|---|
| Button | `.btn` + `.btn--outline` / `.btn--solid` | Outline for every call to action; solid only to submit a form. |
| Top bar | `.brand`, `.site-nav`, `.site-nav__link`, `.nav-fade` | `html.is-past-story` shows the fade. Keep the bar to one link plus the contact button. |
| Glass | `.glass`, `.glass--strong` | Surface only; combine with a component. |
| Story | `.story`, `.story__stage`, `.story__canvas`, `.story__shade`, `.story__floor` | The pinned film. |
| Beat | `.beat`, `.beat--centred`, `.beat__title`, `.beat__lead`, `.beat__lines`, `.beat__cta` | Always centred. One title style and one line style for every beat, no size modifiers: the opening sets the hierarchy and every later beat repeats it. Anchored beats sit above a point in the image; `--centred` places a beat in the middle of the viewport, both ways (the closing question). |
| Panel | `.panel.glass`, `__kicker`, `__title`, `__body`, `__link` | `.is-active` while its part is in focus. The body says what the part means in the orchestra, in two short sentences at most; the problems live in the opening beat and the framework section. |
| Timeline | `.timeline`, `__bar`, `__fill`, `__dot`, `__label`; `.scroll-hint` | Names the chapter on screen. |
| Section | `.section(--first/--last)`, `__inner(--tight)`, `__head`, `__title`, `__text(--strong)`, `__cta`, `.eyebrow` | Content below the film. |
| Part, person | `.part`, `.person` and their `__` elements | |
| Tags | `.tags`, `.tag` | Quiet pills naming the concepts a part or symptom relates to (the words people search for). Labels, never links. |
| Symptoms | `.symptoms`, `.symptom-group`, `__part`, `__title`; `.symptom` (`<details>`), `__line`, `__body`, `__roles`, `__cause` | One quiet italic line per symptom; opens to who feels it, the cause and its tags. Grouped by the framework part where it starts. Full list and evidence: `docs/SYMPTOMS.md`. |
| Diagram | `.diagram`, `__svg--wide/--phone`, `__frame`, `__layer`, `__pillar`, `__name`, `__desc`, `__label`, `__frame-label` | Builds itself when revealed. |
| Dialog | `.dialog`, `__card`, `__title`, `__lead`, `__close`, `__submit`, `__note`; `.field`, `__label`, `__input` | `.is-open`. Focus is trapped inside. |

Naming follows BEM: `block__element--modifier`. State classes start with `is-`. JavaScript hooks are `data-*` attributes, never classes, so styling can change without breaking behaviour.

---

## 8. Headings and search

- **One `<h1>`**, visually hidden, that says what the site is: "The Collective: operating model advisory in Amsterdam". The opening line of the film is the visual hero but not the page title.
- **Text over the film and in the glass panels is not a heading** (`<p class="beat__title">`, `<p class="panel__title">`). It is cinema, not document structure, and repeating it as headings dilutes the outline.
- **Sections below the film** carry the outline: `<h2>` per section, `<h3>` per symptom group, framework part and person.
- **Words people search for** live in the reading text and in tags, never stuffed into headings. When you add a concept, add it as a tag and, if it is central, to `knowsAbout` in the structured data.
- **Anchors** (`#too-many-initiatives`, `#plan`, …) are stable: they can be linked from posts and future landing pages. Don't rename them casually.
- **Address-dependent tags** (canonical, share image, sitemap, robots) are written by `tools/set_domain.py`; never hand-edit the block between the `seo:site-url` markers.

## 9. The film

Everything the film does is in `assets/js/config.js`. Coordinates are pixels in the source image; progress runs from 0 to 1 over the scroll.

- **Chapters**: names in the timeline and where each ends.
- **Camera**: two kinds of keyframe.
  - A *view* `{ t, cx, cy, fw, fh }`: a region that must fit on screen. Portrait screens get their own framing rules (`layout.portrait`).
  - A *subject* `{ t, subject: [x0, y0, x1, y1], panel }`: a box fitted into the free space between the navigation and the top of the named panel, measured on every screen. The conductor uses this, so he is always entirely above his glass panel.
- **Focus**: the parts of the model, each with a scroll range and sharp, lit spots; everything else is softened, dimmed and the subject gets a warm glow.
- **Copy**: when each beat and line fades in and out. Keys match `data-beat` / `data-copy` in the HTML.
- **Snap**: the stops where the film rests. Inside the film, one wheel gesture, swipe or arrow key moves to the next stop as a single eased camera move (longer moves take a little longer). After the last stop the page scrolls normally again; scrolling up from below re-enters at the last stop. A free scroll (scrollbar, a link) settles on the nearest stop. When you add a part of the model, add its stop here too.
- **Anchors**: image points that `data-anchor` beats sit above. The opening, "It isn't." and "Great parts…" share the conductor anchor, so the eye stays in one place.

### HTML contract

| Attribute | Meaning |
|---|---|
| `data-story`, `data-story-stage`, `data-story-canvas`, `data-story-shade` | The film's structure |
| `data-beat="key"` | A block of text timed by `config.copy[key]` |
| `data-anchor="name"` | On a beat: sit above `config.anchors[name]` |
| `data-copy="key"` | A line inside a beat with its own timing |
| `data-panel="key"` | The glass panel for `config.focus.parts[key]` |
| `data-timeline`, `-num`, `-fill`, `-dot`, `-label` | Timeline parts |
| `data-scroll-hint` | The "Scroll" hint |
| `data-safe-top` | Fixed elements the film keeps clear of |
| `data-entrance` (`="rise"`) | Part of the page-load entrance |
| `data-reveal` | Fades in when scrolled into view |
| `data-contact` | Opens the contact dialog |
| `data-dialog`, `data-dialog-close`, `data-dialog-note` | Dialog parts |
| `data-nav-fade` | The fade behind the top bar |

### Recipes

- **Retime a line**: change its window in `config.copy`. `[a, b, c, d]` fades in from a to b and out from c to d; use `2` for "stays".
- **Add a part of the model**: add a chapter, camera keyframes, a `focus.parts` entry and an `<aside class="panel glass" data-panel="…">`. No engine changes.
- **Frame a new subject safely**: use a subject keyframe instead of a view.
- **Find image coordinates**: in the browser console, `TC.story.project(x, y)` shows where an image point is on screen; `TC.story.go(0.5)` jumps to a point in the film.
