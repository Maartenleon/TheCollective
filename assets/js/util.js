/* ==========================================================================
   Small helpers shared by the scripts
   ========================================================================== */

window.TC = window.TC || {};

TC.util = (() => {
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const smoother = t => t * t * t * (t * (t * 6 - 15) + 10);
  /** 0 → 1 → 0 over a window [fadeInStart, fadeInEnd, fadeOutStart, fadeOutEnd] */
  const windowed = (p, w) => smooth(w[0], w[1], p) * (1 - smooth(w[2], w[3], p));

  /** Read a design token from :root */
  const token = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  /** "26 14 10" or "#1A0E0A" → [26, 14, 10] */
  const channels = value => {
    if (value.startsWith("#")) {
      const n = parseInt(value.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    return value.split(/[\s,]+/).filter(Boolean).map(Number).slice(0, 3);
  };

  /** Canvas-safe colour string from channels and an alpha */
  const rgba = (rgb, a) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;

  return { clamp, lerp, smooth, smoother, windowed, token, channels, rgba };
})();
