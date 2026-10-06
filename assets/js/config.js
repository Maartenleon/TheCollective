/* ==========================================================================
   Site configuration
   Everything that shapes the scroll film lives here: images, chapters,
   camera moves, focus areas and the timing of every line of text, plus a
   few page behaviours at the bottom. Colours come from tokens.css and all
   text lives in index.html; this file only refers to it by key.

   Units
   - Progress runs from 0 (top of the film) to 1 (end of the film).
   - Image coordinates are pixels in the source image (scene.jpg is 2944 × 1560,
     the closing video finale.mp4 832 × 464).
   - A window [a, b, c, d] fades in between a and b and out between c and d.
   ========================================================================== */

window.TC = window.TC || {};

TC.config = {
  images: {
    // sky and ground are sampled from each image; they fill the screen where the camera looks past its edges
    scene:  { src: "assets/img/scene.jpg",  soft: "assets/img/scene-soft.jpg", width: 2944, height: 1560, sky: "#8092A7", ground: "#1A0E0A" },
    // the closing world is a looping video; src is its first frame, shown until the video plays
    finale: { src: "assets/img/finale-poster.jpg", video: "assets/img/finale.mp4", loadFrom: 0.6,
              width: 832, height: 464, sky: "#6984AD", ground: "#050502" },
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
     Either a view:  { t, cx, cy, fw, fh }  centre point and the region that must fit on screen,
     or a subject:   { t, subject: [x0, y0, x1, y1], panel }  a box that is fitted into the free
                     space above the named glass panel and below the navigation, on every screen;
                     an optional portraitSubject is used instead on portrait screens (phones). */
  camera: [
    { t: 0.000, cx: 1472, cy: 780,  fw: 2944, fh: 1560 },          // the whole orchestra in the dunes
    { t: 0.175, cx: 1472, cy: 860,  fw: 2700, fh: 1430 },          // slow drift while "It isn't." plays
    { t: 0.215, subject: [520, 820, 2440, 1445], panel: "plan" },  // Plan: the full orchestra under the dunes
    { t: 0.290, subject: [560, 840, 2400, 1440], panel: "plan" },
    { t: 0.325, cx: 1590, cy: 1290, fw: 900,  fh: 400 },           // Blueprint: the scores on the stands
    { t: 0.395, cx: 1592, cy: 1292, fw: 860,  fh: 385 },
    { t: 0.430, subject: [760, 1225, 2320, 1440], portraitSubject: [1330, 1225, 2320, 1440], panel: "means" },   // Means: the musicians, all above the panel
    { t: 0.500, subject: [790, 1230, 2290, 1438], portraitSubject: [1360, 1230, 2300, 1438], panel: "means" },   // (phones: conductor and cellos, large enough to see)
    { t: 0.535, subject: [1300, 1150, 1545, 1435], panel: "orchestration" },   // Orchestration: the conductor, head to podium
    { t: 0.615, subject: [1310, 1155, 1535, 1430], panel: "orchestration" },
    { t: 0.705, cx: 1472, cy: 940,  fw: 2800, fh: 1480 },          // the whole again
    { t: 1.000, cx: 1472, cy: 950,  fw: 2760, fh: 1460 },
  ],

  /* Closing image: a slow pull back for the question */
  // portraitLift (optional, any view keyframe) overrides layout.portrait.lift: negative values
  // sit the orchestra lower, here to keep it clear of the centred closing question on phones
  finaleCamera: [
    { t: 0.800, cx: 420, cy: 226, fw: 610, fh: 340, portraitLift: -0.14 },
    { t: 1.000, cx: 416, cy: 232, fw: 832, fh: 464, portraitLift: -0.14 },
  ],

  transitions: {
    finaleCut: [0.826, 0.836],                 // the switch to the closing image…
    dip: [0.800, 0.826, 0.836, 0.866],         // …happens inside a short dip to shadow
    dipStrength: 0.92,
    scrollHint: [0, 0.025],                    // the "Scroll" hint fades out as soon as scrolling starts
    shade: { range: [0.850, 0.880], strength: 0.5 },   // darkens the sky behind the closing question
  },

  /* Parts of the model the camera looks at. Keys match data-panel in the HTML.
     spots: ellipses [x, y, radiusX, radiusY] kept sharp and lit; the rest is blurred and dimmed. */
  focus: {
    fade: 0.022,
    envelope: [0.165, 0.212, 0.622, 0.680],
    dim: 0.52,                                 // how dark the surroundings get
    feather: { extent: 1.35, core: 0.62 },     // how softly the sharp area blends into the blur
    glow: {                                    // a warm spotlight on the subject
      core: 0.2, mid: 0.1, rim: 0.1,           // strengths
      radius: 1.3, midStop: 0.65,              // inner light, relative to the spot
      rimFrom: 0.7, rimTo: 2.1, rimPeak: 0.3,  // rim of light around it
    },
    panel: { on: 0.6, off: 0.3 },              // hysteresis so panels never flicker
    parts: [
      { key: "plan",          range: [0.207, 0.296], glow: 0.55, spots: [[1530, 1335, 830, 125]] },
      { key: "blueprint",     range: [0.318, 0.402], spots: [[1478, 1292, 38, 30], [1585, 1334, 30, 22], [1786, 1300, 40, 30]] },
      { key: "means",         range: [0.424, 0.506], spots: [[1060, 1330, 330, 90], [1975, 1330, 340, 95]] },
      { key: "orchestration", range: [0.528, 0.622], spots: [[1421, 1300, 70, 115]] },
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
    conductor: [1421, 1150],
  },

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
