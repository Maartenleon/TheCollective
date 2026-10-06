/* ==========================================================================
   Story engine: the pinned, scroll-driven film at the top of the page.

   Reads   TC.config (assets/js/config.js)   what happens when
           tokens.css (via TC.util.token)     which colours the canvas uses
           data attributes in index.html      which elements take part

   Markup contract
     [data-story]          the scroll track (its height sets the scroll distance)
     [data-story-stage]    the sticky stage inside it
     [data-story-canvas]   the canvas the images are drawn on
     [data-story-shade]    optional overlay faded in for the closing question
     [data-beat="key"]     a block of text, faded by config.copy[key], always centred
     [data-anchor="name"]  on a beat: sits just above config.anchors[name] in the image
     [data-copy="key"]     a line inside a beat with its own timing
     [data-panel="key"]    a glass panel shown while config.focus.parts[key] is in focus
     [data-timeline-*]     num, fill, dot and label of the timeline
     [data-scroll-hint]    the "Scroll" hint
     [data-safe-top]       fixed elements the film keeps clear of (brand, navigation)

   Props listed in config.overlays (e.g. the programme sign) slide onto the stage over the film.

   Emits   "story:ready" on document once the images have loaded
           (TC.story.ready tells late listeners it already happened).
   Exposes TC.story.go(progress) to jump to a point in the film, and
           TC.story.project(x, y) to see where an image point is on screen.
   ========================================================================== */

(() => {
  "use strict";

  const C = TC.config;
  const { clamp, lerp, smooth, smoother, windowed, token, channels, rgba } = TC.util;

  const track = document.querySelector("[data-story]");
  if (!track) return;

  const $ = sel => track.querySelector(sel);
  const stage = $("[data-story-stage]");
  const canvas = $("[data-story-canvas]");
  const shade = $("[data-story-shade]");
  const hint = $("[data-scroll-hint]");
  const timeline = {
    root: $("[data-timeline]"),
    num: $("[data-timeline-num]"),
    fill: $("[data-timeline-fill]"),
    dot: $("[data-timeline-dot]"),
    label: $("[data-timeline-label]"),
  };
  const beats = [...track.querySelectorAll("[data-beat]")].map(el => ({ el, key: el.dataset.beat, anchor: el.dataset.anchor, w: 0, h: 0 }));
  const lines = [...track.querySelectorAll("[data-copy]")].map(el => ({ el, key: el.dataset.copy }));
  const panels = {};
  track.querySelectorAll("[data-panel]").forEach(el => { panels[el.dataset.panel] = { el, active: false }; });
  const safeTop = [...document.querySelectorAll("[data-safe-top]")];

  const ctx = canvas.getContext("2d");
  const off = document.createElement("canvas");               // the blurred, dimmed layer for focus
  const octx = off.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---- Worlds: an image plus the colours that continue it off its edges -- */
  // With def.video the image is its poster: shown until the video can play, and
  // what the page waits for. The video loads only once the film nears it.
  function world(def) {
    const w = { ...def, skyRgb: channels(def.sky), groundRgb: channels(def.ground), img: new Image() };
    if (def.soft) w.softImg = new Image();
    if (def.video) {
      const v = w.videoEl = document.createElement("video");
      v.muted = v.loop = v.playsInline = true;
      v.preload = "none";
      v.setAttribute("playsinline", "");
      v.setAttribute("aria-hidden", "true");
    }
    return w;
  }
  /** The picture to draw: the video once it has a frame, else the image */
  const source = w => (w.videoEl && w.videoEl.readyState >= 2 ? w.videoEl : w.img);

  const scene = world(C.images.scene);
  const finale = world(C.images.finale);
  const images = [scene.img, scene.softImg, finale.img];

  /* Props on the stage (config.overlays); they load on their own and never hold up the page */
  const overlays = (C.overlays || []).map(o => { const img = new Image(); img.src = o.src; return { ...o, img }; });

  /* ---- State ------------------------------------------------------------ */
  let vw = 0, vh = 0, dpr = 1;
  let ready = false;
  let target = 0, current = 0, lastDrawn = -1, raf = 0;
  let colors = null;
  const safe = { top: 0, gutter: 0, panelTop: {} };          // measured free space, in screen px
  const keys = { scene: [], finale: [] };                      // camera keyframes resolved for this screen

  function readColors() {
    colors = {
      shade: channels(token("--rgb-canvas-shade")),
      glowCore: channels(token("--rgb-glow-core")),
      glow: channels(token("--rgb-glow")),
      glowRim: channels(token("--rgb-glow-rim")),
    };
  }

  /* Where the film may place things: below the navigation, above each panel,
     inside the side gutters. Measured from the real layout, never assumed. */
  function measure() {
    vw = stage.clientWidth;
    vh = stage.clientHeight;
    const navBottom = Math.max(0, ...safeTop.map(el => el.getBoundingClientRect().bottom));
    safe.top = navBottom + C.layout.safeGap;
    safe.gutter = timeline.root ? timeline.root.offsetLeft : 0;
    for (const key in panels) safe.panelTop[key] = panels[key].el.offsetTop - C.layout.safeGap;
    for (const b of beats) { b.w = b.el.offsetWidth; b.h = b.el.offsetHeight; }
  }

  /* ---- Camera ----------------------------------------------------------- */
  // A camera is { cx, cy, s, top, floor }: the image point at the centre of the screen,
  // the scale, and how far above (top < 0) or below (floor > height) the image it may look.

  /** A view keyframe { cx, cy, fw, fh }: a region that must fit on screen.
      Optional portraitCx and portraitLift adjust it on portrait screens. */
  function fromView(k, w) {
    const L = C.layout, aspect = vw / vh;
    let s, top = 0, floor = w.height, lift = 0;
    if (aspect >= 1) {
      const fw = k.fw * clamp(aspect / L.landscape.referenceAspect, L.landscape.minWidthShare, 1);
      s = Math.max(Math.min(vw / fw, vh / k.fh), vw / w.width, vh / w.height);
    } else {
      // Portrait: wide shots let the sky continue above the image and a dark band run below it;
      // close-ups fill the width and leave room below for the docked glass panel.
      const P = L.portrait;
      const zoom = clamp((P.wideFrom - k.fw / w.width) / (P.wideFrom - P.closeFrom), 0, 1);   // 0 wide, 1 close-up
      s = vw / (k.fw * lerp(P.widthShare[0], P.widthShare[1], zoom));
      const h = vh / s;
      top = -h * P.skyRoom * (1 - zoom);
      floor = w.height + h * lerp(P.band[0], P.band[1], zoom);
      lift = h * (k.portraitLift ?? P.lift) * (1 - zoom);
    }
    return { cx: (aspect < 1 && k.portraitCx) || k.cx, cy: k.cy + lift, s, top, floor };
  }

  /** A subject keyframe { subject: [x0, y0, x1, y1], panel }: a box fitted into the free
      space between the navigation and the top of the named panel, on any screen.
      An optional portraitSubject replaces the box on portrait screens. */
  function fromSubject(k, w) {
    const [x0, y0, x1, y1] = (vw < vh && k.portraitSubject) || k.subject;
    const top = safe.top, bottom = safe.panelTop[k.panel] ?? vh - C.layout.safeGap;
    const left = safe.gutter, right = vw - safe.gutter;
    const s = Math.min((right - left) / (x1 - x0), (bottom - top) / (y1 - y0)) * C.layout.subjectFill;
    const cx = (x0 + x1) / 2 - ((left + right) / 2 - vw / 2) / s;
    const cy = (y0 + y1) / 2 - ((top + bottom) / 2 - vh / 2) / s;
    const h = vh / s;
    return { cx, cy, s, top: Math.min(0, cy - h / 2), floor: Math.max(w.height, cy + h / 2) };
  }

  const resolveKeys = (list, w) => list.map(k => ({ t: k.t, ...(k.subject ? fromSubject(k, w) : fromView(k, w)) }));

  const mix = (a, b, t) => ({
    cx: lerp(a.cx, b.cx, t),
    cy: lerp(a.cy, b.cy, t),
    s: Math.exp(lerp(Math.log(a.s), Math.log(b.s), t)),       // zoom feels even in log space
    top: lerp(a.top, b.top, t),
    floor: lerp(a.floor, b.floor, t),
  });

  function cameraAt(list, p, w) {
    let i = 0;
    while (i < list.length - 2 && p > list[i + 1].t) i++;
    const a = list[i], b = list[i + 1];
    let cam = mix(a, b, smoother(clamp((p - a.t) / (b.t - a.t), 0, 1)));
    if (reduceMotion.matches) cam = mix(list[0], cam, C.motion.reducedTravel);
    // Keep the camera inside the image sideways, and inside its allowed sky and band vertically
    const cw = vw / cam.s, ch = vh / cam.s;
    return {
      s: cam.s, w: cw, h: ch,
      cx: clamp(cam.cx, cw / 2, w.width - cw / 2),
      cy: clamp(cam.cy, cam.top + ch / 2, Math.max(cam.top + ch / 2, cam.floor - ch / 2)),
    };
  }

  const toScreen = (cam, x, y) => [(x - cam.cx) * cam.s + vw / 2, (y - cam.cy) * cam.s + vh / 2];

  /* ---- Drawing ---------------------------------------------------------- */
  function drawWorld(g, img, cam, w) {
    const sx = cam.cx - cam.w / 2, sy = cam.cy - cam.h / 2;
    g.fillStyle = w.ground;
    g.fillRect(0, 0, vw, vh);
    if (sy < 0) { g.fillStyle = w.sky; g.fillRect(0, 0, vw, Math.ceil(-sy * cam.s) + 2); }

    // Clip the source rectangle to the image ourselves (Safari draws nothing if it overflows)
    const x0 = Math.max(0, sx), y0 = Math.max(0, sy);
    const x1 = Math.min(w.width, sx + cam.w), y1 = Math.min(w.height, sy + cam.h);
    if (x1 <= x0 || y1 <= y0) return;
    g.drawImage(img, x0, y0, x1 - x0, y1 - y0, (x0 - sx) * cam.s, (y0 - sy) * cam.s, (x1 - x0) * cam.s, (y1 - y0) * cam.s);

    // Soften the edges where the image meets the extended sky or the band below
    const E = C.layout.edgeFade, f = Math.min(E.max, vh * E.share);
    const yTop = (y0 - sy) * cam.s, yBottom = (y1 - sy) * cam.s;
    if (yBottom < vh - 1) {
      const gr = g.createLinearGradient(0, yBottom - f, 0, yBottom + 2);
      gr.addColorStop(0, rgba(w.groundRgb, 0));
      gr.addColorStop(1, rgba(w.groundRgb, 1));
      g.fillStyle = gr;
      g.fillRect(0, yBottom - f, vw, f + 3);
    }
    if (yTop > 1) {
      const gr = g.createLinearGradient(0, yTop - 2, 0, yTop + f * E.sky);
      gr.addColorStop(0, rgba(w.skyRgb, 1));
      gr.addColorStop(1, rgba(w.skyRgb, 0));
      g.fillStyle = gr;
      g.fillRect(0, yTop - 2, vw, f * E.sky + 2);
    }
  }

  const F = C.focus;
  const focusWeights = p => F.parts.map(part => smooth(part.range[0] - F.fade, part.range[0], p) * (1 - smooth(part.range[1], part.range[1] + F.fade, p)));

  /** Calls fn(x, y, radius) with the context transformed so every spot is a circle */
  function eachSpot(g, cam, part, fn) {
    for (const [x, y, rx, ry] of part.spots) {
      const [X, Y] = toScreen(cam, x, y);
      g.save();
      g.translate(X, Y);
      g.scale(1, ry / rx);
      fn(rx * cam.s);
      g.restore();
    }
  }
  function disc(g, r, fill) { g.fillStyle = fill; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); }

  /** Everything but the subject goes soft and dim */
  function drawFocus(cam, amount, weights) {
    octx.globalCompositeOperation = "source-over";
    octx.clearRect(0, 0, vw, vh);
    drawWorld(octx, scene.softImg, cam, scene);
    octx.fillStyle = rgba(colors.shade, F.dim);
    octx.fillRect(0, 0, vw, vh);
    octx.globalCompositeOperation = "destination-out";       // cut sharp windows where the subject is
    F.parts.forEach((part, i) => {
      const w = weights[i];
      if (w < 0.002) return;
      eachSpot(octx, cam, part, r => {
        const R = r * F.feather.extent;
        const gr = octx.createRadialGradient(0, 0, 0, 0, 0, R);
        gr.addColorStop(0, `rgba(0, 0, 0, ${w})`);
        gr.addColorStop(F.feather.core, `rgba(0, 0, 0, ${w})`);
        gr.addColorStop(1, "rgba(0, 0, 0, 0)");
        disc(octx, R, gr);
      });
    });
    ctx.save();
    ctx.globalAlpha = amount;
    ctx.drawImage(off, 0, 0, vw, vh);
    ctx.restore();
  }

  /** A warm spotlight on the subject, drawn with "screen" so it only ever brightens */
  function drawGlow(cam, amount, weights) {
    const G = F.glow;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    F.parts.forEach((part, i) => {
      const w = weights[i] * amount * (part.glow ?? 1);
      if (w < 0.002) return;
      eachSpot(ctx, cam, part, r => {
        let gr = ctx.createRadialGradient(0, 0, 0, 0, 0, r * G.radius);
        gr.addColorStop(0, rgba(colors.glowCore, G.core * w));
        gr.addColorStop(G.midStop, rgba(colors.glow, G.mid * w));
        gr.addColorStop(1, rgba(colors.glow, 0));
        disc(ctx, r * G.radius, gr);
        gr = ctx.createRadialGradient(0, 0, r * G.rimFrom, 0, 0, r * G.rimTo);
        gr.addColorStop(0, rgba(colors.glowRim, 0));
        gr.addColorStop(G.rimPeak, rgba(colors.glowRim, G.rim * w));
        gr.addColorStop(1, rgba(colors.glowRim, 0));
        disc(ctx, r * G.rimTo, gr);
      });
    });
    ctx.restore();
  }

  /** Each prop slides in from the right edge of the screen to its place in the scene, and back out */
  function drawOverlays(cam, p) {
    for (const o of overlays) {
      const a = windowed(p, o.show);
      if (a < 0.002 || !o.img.naturalWidth) continue;
      const [x0, y0, x1, y1] = o.box;
      const [x, y] = toScreen(cam, x0, y0);
      const w = (x1 - x0) * cam.s, h = (y1 - y0) * cam.s;
      const still = reduceMotion.matches;
      const shift = still ? 0 : (1 - a) * Math.max(0, vw - x);     // from just past the right edge
      ctx.save();
      ctx.globalAlpha = still ? a : Math.min(1, a * 1.6);           // fully opaque well before it lands
      ctx.drawImage(o.img, x + shift, y, w, h);
      ctx.restore();
    }
  }

  function drawFrame(p, weights) {
    const T = C.transitions;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const cut = smooth(T.finaleCut[0], T.finaleCut[1], p);
    const cam = cameraAt(keys.scene, p, scene);
    if (cut < 1) {
      drawWorld(ctx, scene.img, cam, scene);
      const amount = windowed(p, F.envelope);
      if (amount > 0.002) {
        drawFocus(cam, amount, weights);
        if (F.glow.on) drawGlow(cam, amount, weights);
      }
      drawOverlays(cam, p);
    }
    if (cut > 0) {
      ctx.save();
      ctx.globalAlpha = cut;
      drawWorld(ctx, source(finale), cameraAt(keys.finale, Math.max(p, C.finaleCamera[0].t), finale), finale);
      ctx.restore();
    }
    const dip = windowed(p, T.dip);
    if (dip > 0.002) { ctx.fillStyle = rgba(colors.shade, dip * T.dipStrength); ctx.fillRect(0, 0, vw, vh); }
    return cam;
  }

  /* ---- Text and interface over the film --------------------------------- */
  function setFade(el, a, centred) {
    const still = reduceMotion.matches;
    const rise = still ? 0 : (1 - a) * C.motion.textRise;
    const blur = still ? 0 : (1 - a) * C.motion.textBlur;
    el.style.opacity = a.toFixed(3);
    el.style.transform = `${centred ? "translateX(-50%) " : ""}translate3d(0, ${rise.toFixed(1)}px, 0)`;
    el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
    el.style.visibility = a < 0.002 ? "hidden" : "visible";
  }

  function fadeCopy(p) {
    for (const b of beats) setFade(b.el, windowed(p, C.copy[b.key]), true);
    for (const l of lines) setFade(l.el, windowed(p, C.copy[l.key]), false);
  }

  /** Anchored beats sit just above their point in the image, inside the gutters, below the nav */
  function placeBeats(cam) {
    for (const b of beats) {
      const point = b.anchor && C.anchors[b.anchor];
      if (!point) continue;
      const [x, y] = toScreen(cam, point[0], point[1]);
      const half = b.w / 2;
      b.el.style.left = clamp(x, safe.gutter + half, vw - safe.gutter - half).toFixed(1) + "px";
      b.el.style.top = Math.max(safe.top, y - b.h).toFixed(1) + "px";
    }
  }

  /** Panels switch with hysteresis so they never flicker at the threshold */
  function updatePanels(weights) {
    F.parts.forEach((part, i) => {
      const panel = panels[part.key];
      if (!panel) return;
      const on = panel.active ? weights[i] > F.panel.off : weights[i] > F.panel.on;
      if (on === panel.active) return;
      panel.active = on;
      panel.el.classList.toggle("is-active", on);
    });
  }

  let lastChapter = null;
  function updateChrome(p) {
    const T = C.transitions;
    if (timeline.fill) timeline.fill.style.transform = `scaleX(${p.toFixed(4)})`;
    if (timeline.dot) timeline.dot.style.left = (p * 100).toFixed(2) + "%";
    const chapter = C.chapters.find(c => p < c.to) || C.chapters[C.chapters.length - 1];
    if (chapter !== lastChapter) {
      lastChapter = chapter;
      if (timeline.num) timeline.num.textContent = chapter.id;
      if (timeline.label) timeline.label.textContent = chapter.name;
    }
    if (hint) hint.style.opacity = (1 - smooth(T.scrollHint[0], T.scrollHint[1], p)).toFixed(3);
    if (shade) shade.style.opacity = (smooth(T.shade.range[0], T.shade.range[1], p) * T.shade.strength).toFixed(3);
  }

  let playRequest = null;
  /** The closing video: loads as the film nears it, plays only while it is on screen */
  function syncVideo(p) {
    const v = finale.videoEl;
    if (!v || !ready) return;
    if (!v.src && p >= finale.loadFrom) { v.src = finale.video; v.load(); }
    const visible = p > C.transitions.finaleCut[0] && !reduceMotion.matches;
    if (visible && v.paused && v.src && !playRequest) {
      // one request at a time; if playing is blocked (e.g. low power mode) the poster stays
      playRequest = v.play().catch(() => {}).finally(() => { playRequest = null; });
    } else if (!visible && !v.paused) v.pause();
  }

  /** While the video plays, redraw on each of its frames even if nobody scrolls (started by its play event) */
  function redrawWhilePlaying() {
    const v = finale.videoEl;
    const next = cb => (v.requestVideoFrameCallback ? v.requestVideoFrameCallback(cb) : requestAnimationFrame(cb));
    const frame = () => { if (v.paused) return; render(current); next(frame); };
    next(frame);
  }

  let lastCam = null;
  function render(p) {
    const weights = focusWeights(p);
    const cam = lastCam = ready ? drawFrame(p, weights) : cameraAt(keys.scene, p, scene);
    placeBeats(cam);
    fadeCopy(p);
    updatePanels(weights);
    updateChrome(p);
    syncVideo(p);
    lastDrawn = p;
  }

  /* ---- Scroll ----------------------------------------------------------- */
  function readProgress() {
    const travel = track.offsetHeight - stage.offsetHeight;
    return travel > 0 ? clamp(-track.getBoundingClientRect().top / travel, 0, 1) : 0;
  }

  function tick() {
    raf = 0;
    target = readProgress();
    current += (target - current) * (reduceMotion.matches ? 1 : C.motion.damping);
    if (Math.abs(target - current) < 0.00005) current = target;
    if (current !== lastDrawn) render(current);
    if (current !== target) raf = requestAnimationFrame(tick);
  }
  const request = () => { if (!raf) raf = requestAnimationFrame(tick); };

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, C.render.maxPixelRatio);
    measure();
    for (const c of [canvas, off]) { c.width = Math.round(vw * dpr); c.height = Math.round(vh * dpr); }
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = "high";
    readColors();
    keys.scene = resolveKeys(C.camera, scene);
    keys.finale = resolveKeys(C.finaleCamera, finale);
    current = readProgress();
    render(current);
  }

  /* ---- Start ------------------------------------------------------------ */
  layout();                                                    // place the text before the images arrive
  let loaded = 0;
  const onImage = () => {
    if (++loaded < images.length) return;
    ready = true;
    layout();
    document.dispatchEvent(new CustomEvent("story:ready"));
  };
  images.forEach(img => { img.onload = onImage; });
  scene.img.src = scene.src;
  scene.softImg.src = scene.soft;
  finale.img.src = finale.src;
  finale.videoEl?.addEventListener("play", redrawWhilePlaying);

  document.fonts?.ready.then(layout);                          // text sizes change once the fonts arrive
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", layout);
  reduceMotion.addEventListener?.("change", layout);

  const scrollFor = p => track.offsetTop + (track.offsetHeight - stage.offsetHeight) * p;

  TC.story = {
    /** Scroll to a point in the film, 0 to 1 */
    go(p) { window.scrollTo(0, scrollFor(p)); },
    /** The page scroll position at which the film shows progress p */
    scrollFor,
    /** Where the scroll position is in the film right now, 0 to 1 (before damping) */
    scrollProgress: readProgress,
    get progress() { return current; },
    /** True once the images have loaded (story:ready may already have fired) */
    get ready() { return ready; },
    /** Where a point in the scene image is on screen right now (for tuning config) */
    project(x, y) { return lastCam ? toScreen(lastCam, x, y) : null; },
  };
})();
