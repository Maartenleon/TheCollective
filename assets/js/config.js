/* ==========================================================================
   Site configuration
   Everything that shapes the scroll film lives here: images, chapters,
   camera moves, focus areas and the timing of every line of text, plus a
   few page behaviours at the bottom. Colours come from tokens.css and all
   text lives in index.html; this file only refers to it by key.

   Units
   - Progress runs from 0 (top of the film) to 1 (end of the film).
   - Image coordinates are pixels in the source image (scene.jpg is 2944 × 1648,
     the closing video finale.mp4 832 × 464).
   - A window [a, b, c, d] fades in between a and b and out between c and d.
   ========================================================================== */

window.TC = window.TC || {};

TC.config = {
  images: {
    // sky and ground are sampled from each image; they fill the screen where the camera looks past its edges
    scene:  { src: "assets/img/scene.jpg",  soft: "assets/img/scene-soft.jpg", width: 2944, height: 1648, sky: "#999FB0", ground: "#111204" },
    // the closing world is a looping video; src is its first frame, shown until the video plays
    finale: { src: "assets/img/finale-poster.jpg", video: "assets/img/finale.mp4", loadFrom: 0.6,
              width: 832, height: 464, sky: "#989EAF", ground: "#111204" },
  },

  /* Chapters shown in the timeline, in order */
  chapters: [
    { id: "01", name: "The concert",       to: 0.192 },
    { id: "02", name: "Plan",              to: 0.307 },
    { id: "03", name: "Blueprint",         to: 0.413 },
    { id: "04", name: "Means",             to: 0.517 },
    { id: "05", name: "Orchestration",     to: 0.650 },
    { id: "06", name: "In concert",        to: 0.835 },
    { id: "07", name: "Your organisation", to: 1.000 },
  ],

  /* Camera keyframes for the scene.
     Either a view:  { t, cx, cy, fw, fh }  centre point and the region that must fit on screen
                     (optional portraitCx: the centre on phones, where wide shots are cropped),
     or a subject:   { t, subject: [x0, y0, x1, y1], panel }  a box that is fitted into the free
                     space above the named glass panel and below the navigation, on every screen;
                     an optional portraitSubject is used instead on portrait screens (phones). */
  camera: [
    { t: 0.000, cx: 1472, cy: 824,  fw: 2944, fh: 1648, portraitCx: 1610 },   // the whole orchestra on its stage, hills behind
    { t: 0.175, cx: 1500, cy: 930,  fw: 2600, fh: 1455, portraitCx: 1610 },   // slow drift while "It isn't." plays
    { t: 0.215, subject: [1080, 990, 2400, 1330], portraitSubject: [1860, 1030, 2350, 1328], panel: "plan" }, // Plan: the full orchestra, and the sign as it slides on
    { t: 0.290, subject: [1095, 1000, 2385, 1326], portraitSubject: [1875, 1036, 2345, 1326], panel: "plan" },   // (phones: closer, so the sign can be read)
    { t: 0.325, cx: 1694, cy: 1205, fw: 580,  fh: 250 },           // Blueprint: the notes on the stands
    { t: 0.395, cx: 1696, cy: 1206, fw: 560,  fh: 242 },
    { t: 0.430, subject: [1120, 1095, 2110, 1300], portraitSubject: [1430, 1095, 2110, 1300], panel: "means" },   // Means: the musicians, all above the panel
    { t: 0.500, subject: [1135, 1100, 2095, 1298], portraitSubject: [1445, 1100, 2100, 1298], panel: "means" },   // (phones: conductor and cellos, large enough to see)
    { t: 0.535, subject: [1430, 1090, 1625, 1294], panel: "orchestration" },   // Orchestration: the conductor, head to podium
    { t: 0.615, subject: [1438, 1094, 1617, 1292], panel: "orchestration" },
    { t: 0.705, cx: 1500, cy: 1000, fw: 2700, fh: 1510, portraitCx: 1610 },   // the whole again
    { t: 1.000, cx: 1500, cy: 1010, fw: 2660, fh: 1490, portraitCx: 1610 },
  ],

  /* Closing image: a slow pull back for the question */
  // portraitLift (optional, any view keyframe) overrides layout.portrait.lift: negative values
  // sit the orchestra lower, here to keep it clear of the centred closing question on phones
  finaleCamera: [
    { t: 0.800, cx: 440, cy: 262, fw: 640, fh: 357, portraitLift: -0.14, portraitCx: 455 },
    { t: 1.000, cx: 416, cy: 232, fw: 832, fh: 464, portraitLift: -0.14, portraitCx: 455 },
  ],

  transitions: {
    finaleCut: [0.826, 0.836],                 // the switch to the closing image…
    dip: [0.800, 0.826, 0.836, 0.866],         // …happens inside a short dip to shadow
    dipStrength: 0.92,
    scrollHint: [0, 0.025],                    // the "Scroll" hint fades out as soon as scrolling starts
    shade: { range: [0.850, 0.880], strength: 0.5 },   // darkens the sky behind the closing question
  },

  /* Parts of the model the camera looks at. Keys match data-panel in the HTML.
     spots: ellipses [x, y, radiusX, radiusY] kept sharp; the rest is blurred and dimmed.
     glow (per part) scales focus.glow when that is switched on. */
  focus: {
    fade: 0.022,
    envelope: [0.165, 0.212, 0.622, 0.680],
    dim: 0.52,                                 // how dark the surroundings get
    feather: { extent: 1.35, core: 0.62 },     // how softly the sharp area blends into the blur
    glow: {                                    // a warm spotlight on the subject
      on: false,                               // off: the subject stays sharp but is not lit
      core: 0.2, mid: 0.1, rim: 0.1,           // strengths
      radius: 1.3, midStop: 0.65,              // inner light, relative to the spot
      rimFrom: 0.7, rimTo: 2.1, rimPeak: 0.3,  // rim of light around it
    },
    panel: { on: 0.6, off: 0.3 },              // hysteresis so panels never flicker
    parts: [
      { key: "plan",          range: [0.207, 0.296], glow: 0.55, spots: [[1615, 1195, 530, 115], [2221, 1182, 125, 155], [1720, 1296, 760, 42]] },   // orchestra, sign, and the stage floor that joins them
      { key: "blueprint",     range: [0.318, 0.402], spots: [[1555, 1192, 34, 16], [1608, 1210, 20, 22], [1712, 1206, 20, 22], [1828, 1214, 20, 24]] },
      { key: "means",         range: [0.424, 0.506], spots: [[1290, 1205, 175, 80], [1865, 1205, 235, 85]] },
      { key: "orchestration", range: [0.528, 0.622], spots: [[1522, 1192, 62, 105]] },
    ],
  },

  /* Text over the film. Keys match data-beat / data-copy in the HTML. */
  copy: {
    "opening":     [-0.02, -0.01, 0.080, 0.105],   // visible at rest
    "twist":       [0.105, 0.122, 0.190, 0.204],
    "twist-1":     [0.122, 0.134, 2, 2],
    "twist-2":     [0.136, 0.148, 2, 2],
    "twist-3":     [0.150, 0.162, 2, 2],
    "twist-4":     [0.164, 0.176, 2, 2],
    "whole":       [0.668, 0.705, 0.790, 0.815],
    "whole-sub":   [0.722, 0.756, 2, 2],
    "question":    [0.868, 0.905, 2, 2],
  },

  /* Points in the image that beats with data-anchor sit above: the opening,
     "It isn't." and "Great parts…" all appear in the same spot, centred over the conductor */
  anchors: {
    conductor: [1515, 1030],
  },

  /* Props on the stage: an image placed at box [x0, y0, x1, y1] in the scene, drawn sharp over the
     focus. Over window [a, b, c, d] it slides in from the right edge of the screen and back out. */
  overlays: [
    { src: "assets/img/sign.png", box: [2118, 1047, 2324, 1318], show: [0.200, 0.246, 0.298, 0.322] },   // the programme sign, at Plan
  ],

  /* How a view keyframe is fitted to the screen */
  layout: {
    landscape: { referenceAspect: 1.6, minWidthShare: 0.52 },   // narrower screens frame a little tighter
    portrait: {
      wideFrom: 0.679, closeFrom: 0.543,       // share of the image's width: views wider than wideFrom are wide shots, narrower than closeFrom close-ups
      widthShare: [0.36, 0.55],                // share of the view's width that fills the screen (wide, close-up)
      skyRoom: 0.22,                           // wide shots may show sky above the image (share of screen height)
      band: [0.17, 0.72],                      // dark band allowed below the image (wide, close-up)
      lift: 0.06,                              // wide shots sit the orchestra a little higher
    },
    subjectFill: 0.92,                         // how much of the free space a fitted subject may use
    safeGap: 20,                               // px between a fitted subject and the panel or navigation
    edgeFade: { max: 90, share: 0.12, sky: 0.6 },   // soft edges where the image meets sky or band
  },

  motion: {
    damping: 0.22,                             // how quickly the film follows the scroll position
    reducedTravel: 0.22,                       // camera travel kept when reduced motion is on
    textRise: 14,                              // px a line rises while it fades in
    textBlur: 4,                               // px of blur on a line while it fades
    loadFallback: 4000,                        // ms before the page shows itself even if images are slow
  },

  /* One scroll gesture moves the film to the next stop, as one smooth camera move.
     Stops are progress values where the film rests with everything in place. */
  snap: {
    stops: [
      0.000,   // opening
      0.180,   // "It isn't." with all four lines
      0.250,   // Plan
      0.360,   // Blueprint
      0.465,   // Means
      0.575,   // Orchestration
      0.772,   // "Great parts…" with its line
      1.000,   // the closing question; the next gesture leaves the film
    ],
    duration: { min: 900, max: 2200, perProgress: 6000 },   // ms: longer moves take longer
    reducedDuration: 350,                     // ms, when reduced motion is on
    quiet: 160,                               // ms without wheel input before a new gesture counts
    swipe: 30,                                // px a touch has to travel to count as a swipe
    settle: 220,                              // ms after a free scroll (scrollbar, link) before snapping to the nearest stop
  },

  render: {
    maxPixelRatio: 2,                          // sharper than this costs memory without visible gain
  },

  /* Page behaviour below the film */
  page: {
    reveal: { rootMargin: "0px 0px -12% 0px", threshold: 0.15 },   // when sections fade in on scroll
  },
};
