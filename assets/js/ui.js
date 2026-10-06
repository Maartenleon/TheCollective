/* ==========================================================================
   Page behaviour around the film
   - load state:  html.is-loading → html.is-loaded (starts the entrance)
   - reveal:      [data-reveal] gets .is-visible when it scrolls into view
   - navigation:  html.is-past-story once the film has scrolled away
   - collapse:    <details data-collapse> slide open and shut (timing: --collapse-dur, --collapse-ease)
   - dialog:      [data-dialog], opened by any [data-contact]
   ========================================================================== */

(() => {
  "use strict";

  const C = TC.config;
  const html = document.documentElement;
  const story = document.querySelector("[data-story]");

  /* ---- Load state: show the page once the film's images are in ---------- */
  const showPage = () => { html.classList.remove("is-loading"); html.classList.add("is-loaded"); };
  if (story && !TC.story?.ready) {
    document.addEventListener("story:ready", () => requestAnimationFrame(showPage), { once: true });
    setTimeout(showPage, C.motion.loadFallback);             // never keep the page hidden on a slow connection
  } else {
    requestAnimationFrame(showPage);                          // no film, or its images were already in
  }

  /* ---- Reveal on scroll ------------------------------------------------- */
  if ("IntersectionObserver" in window) {
    const items = [...document.querySelectorAll("[data-reveal]")];
    // Only animate what is still below the fold; anything already on screen stays as it is
    items.forEach(el => { if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("is-visible"); });
    html.classList.add("reveal-ready");
    const io = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      io.unobserve(entry.target);
    }), C.page.reveal);
    items.forEach(el => { if (!el.classList.contains("is-visible")) io.observe(el); });
  }

  /* ---- Navigation: a soft fade behind it once the film has passed -------- */
  const navFade = document.querySelector("[data-nav-fade]");
  if (story && navFade) {
    const check = () => html.classList.toggle("is-past-story", story.getBoundingClientRect().bottom < navFade.offsetHeight);
    window.addEventListener("scroll", check, { passive: true });
    check();
  }

  /* ---- Collapsible details: slide open and shut, content fades with it - */
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const toMs = value => (value.trim().endsWith("ms") ? 1 : 1000) * parseFloat(value);

  document.querySelectorAll("details[data-collapse]").forEach(details => {
    const summary = details.querySelector("summary");
    const body = summary.nextElementSibling;
    let slide = null, fade = null;

    summary.addEventListener("click", event => {
      if (reduceMotion.matches || !details.animate) return;   // plain toggle
      event.preventDefault();
      const opening = !details.open || details.classList.contains("is-closing");
      const from = details.offsetHeight;                      // also mid-slide
      slide?.cancel();
      details.open = true;
      details.classList.toggle("is-closing", !opening);
      const full = details.offsetHeight;
      const to = opening ? full : full - body.offsetHeight;
      const style = getComputedStyle(details);
      const timing = { duration: toMs(style.getPropertyValue("--collapse-dur")), easing: style.getPropertyValue("--collapse-ease").trim() };
      const shown = { opacity: 1, transform: "none" };
      const hidden = { opacity: 0, transform: `translateY(${style.getPropertyValue("--rise-entrance").trim() || "0px"})` };
      const current = { opacity: getComputedStyle(body).opacity };
      fade?.cancel();
      fade = body.animate(opening ? [hidden, shown] : [current, hidden],     // opening always replays from the start
        { ...timing, fill: "forwards" });
      details.style.overflow = "hidden";
      slide = details.animate({ height: [`${from}px`, `${to}px`] }, timing);
      slide.onfinish = () => {
        fade?.cancel();                                       // content back to its resting state
        fade = null;
        if (!opening) details.open = false;
        details.classList.remove("is-closing");
        details.style.overflow = "";
        slide = null;
      };
    });
  });

  /* ---- Contact dialog --------------------------------------------------- */
  const dialog = document.querySelector("[data-dialog]");
  if (!dialog) return;
  const form = dialog.querySelector("form");
  const note = dialog.querySelector("[data-dialog-note]");
  const focusable = () => [...dialog.querySelectorAll("a[href], button, input, textarea, select")];
  let opener = null;

  function open(event) {
    opener = event?.currentTarget || document.activeElement;
    dialog.classList.add("is-open");
    requestAnimationFrame(() => form.elements[0]?.focus({ preventScroll: true }));
  }
  function close() {
    dialog.classList.remove("is-open");
    opener?.focus({ preventScroll: true });
  }

  document.querySelectorAll("[data-contact]").forEach(el => el.addEventListener("click", open));
  dialog.querySelectorAll("[data-dialog-close]").forEach(el => el.addEventListener("click", close));
  dialog.addEventListener("click", event => { if (event.target === dialog) close(); });

  document.addEventListener("keydown", event => {
    if (!dialog.classList.contains("is-open")) return;
    if (event.key === "Escape") close();
    if (event.key === "Tab") {                                  // keep focus inside the dialog
      const items = focusable(), first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  // Messages live on the form as data-msg-* attributes, so all text stays in the HTML
  form.addEventListener("submit", event => {
    event.preventDefault();
    const invalid = [...form.elements].find(el => el.required && !el.checkValidity());
    if (invalid) {
      note.textContent = invalid.type === "email" ? form.dataset.msgEmail : form.dataset.msgIncomplete;
      invalid.focus();
      return;
    }
    // No mail service is connected yet: replace this with a POST to your form endpoint
    note.textContent = form.dataset.msgNotConnected;
  });
})();
