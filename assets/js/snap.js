/* ==========================================================================
   Snap: inside the film, one scroll gesture (wheel, swipe, key) moves to the
   next stop in config.snap.stops as a single eased move, instead of following
   the scroll frame by frame. Outside the film the page scrolls normally.
   Free scrolling (scrollbar, links, refresh mid-film) settles on the nearest stop.
   ========================================================================== */

(() => {
  "use strict";

  const S = TC.config.snap;
  const story = TC.story;
  if (!story || !S) return;

  const { clamp } = TC.util;
  const dialog = document.querySelector("[data-dialog]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const EPS = 0.002;
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  let moving = false, lastWheel = 0, lastDelta = 0, ownScroll = false, settleTimer = 0;

  const inFilm = () => window.scrollY >= story.scrollFor(0) - 1 && window.scrollY <= story.scrollFor(1) + 1;
  const blocked = () => dialog?.classList.contains("is-open");

  /** The stop to move to from the current position in a direction (+1 / -1), or null to leave the film */
  function nextStop(dir) {
    const p = story.scrollProgress();
    if (dir > 0) return S.stops.find(s => s > p + EPS) ?? null;
    return [...S.stops].reverse().find(s => s < p - EPS) ?? null;
  }
  const nearestStop = () => {
    const p = story.scrollProgress();
    return S.stops.reduce((a, b) => (Math.abs(b - p) < Math.abs(a - p) ? b : a));
  };

  function moveTo(stop) {
    const from = window.scrollY, to = story.scrollFor(stop);
    if (Math.abs(to - from) < 1) return;
    const dp = Math.abs(stop - story.scrollProgress());
    const D = S.duration;
    const duration = reduceMotion.matches ? S.reducedDuration : clamp(D.min + dp * D.perProgress, D.min, D.max);
    const start = performance.now();
    moving = true;
    const frame = now => {
      const t = Math.min(1, (now - start) / duration);
      ownScroll = true;
      window.scrollTo(0, from + (to - from) * ease(t));
      if (t < 1) requestAnimationFrame(frame);
      else { moving = false; lastWheel = performance.now(); }
    };
    requestAnimationFrame(frame);
  }

  /** Handle one step; returns true when the film consumed it */
  function step(dir) {
    if (moving) return true;
    const stop = nextStop(dir);
    if (stop === null) return false;                 // past the last stop: let the page scroll on
    moveTo(stop);
    return true;
  }

  /* ---- Wheel and trackpad: one gesture, one step ------------------------- */
  window.addEventListener("wheel", event => {
    if (blocked() || !inFilm() || event.ctrlKey) return;
    const dir = Math.sign(event.deltaY);
    if (!dir) return;
    const now = performance.now();
    const quiet = now - lastWheel > S.quiet;
    const harder = Math.abs(event.deltaY) > 2.5 * Math.abs(lastDelta) && Math.abs(event.deltaY) > 20;
    lastWheel = now;
    lastDelta = event.deltaY;
    if (moving || !(quiet || harder)) {
      event.preventDefault();                       // inertia from the same gesture: swallow it
      return;
    }
    if (step(dir)) event.preventDefault();
  }, { passive: false });

  /* ---- Touch: a swipe is one step --------------------------------------- */
  let touchY = null;
  window.addEventListener("touchstart", event => { touchY = event.touches[0].clientY; }, { passive: true });
  window.addEventListener("touchmove", event => {
    if (touchY === null || blocked() || !inFilm()) return;
    const dir = Math.sign(touchY - event.touches[0].clientY);
    if (dir > 0 && nextStop(1) === null && !moving) return;   // leaving the film: scroll natively
    event.preventDefault();
  }, { passive: false });
  window.addEventListener("touchend", event => {
    if (touchY === null) return;
    const dy = touchY - event.changedTouches[0].clientY;
    touchY = null;
    if (blocked() || !inFilm() || Math.abs(dy) < S.swipe) return;
    step(Math.sign(dy));
  }, { passive: true });

  /* ---- Keys -------------------------------------------------------------- */
  const forward = ["ArrowDown", "PageDown", " "], back = ["ArrowUp", "PageUp"];
  window.addEventListener("keydown", event => {
    if (blocked() || !inFilm() || event.target.closest("input, textarea, select, button, a")) return;
    const dir = forward.includes(event.key) ? (event.shiftKey && event.key === " " ? -1 : 1) : back.includes(event.key) ? -1 : 0;
    if (dir && step(dir)) event.preventDefault();
  });

  /* ---- Free scrolling settles on the nearest stop ------------------------ */
  window.addEventListener("scroll", () => {
    if (ownScroll) { ownScroll = false; return; }
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      if (moving || blocked() || !inFilm()) return;
      const p = story.scrollProgress();
      if (p > EPS && p < 1 - EPS) moveTo(nearestStop());
    }, S.settle);
  }, { passive: true });
})();
