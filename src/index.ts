/* =====================================================================
 *  MicroGfx — a small library for generative "technical instrument" art
 *  ---------------------------------------------------------------------
 *  Everything is built from three layers:
 *    1. ELEMENTS   self-measuring drawable components  (ctx) => {svg, h}
 *    2. LAYOUT     recursive containers  stack() / row()  that flow elements
 *    3. COMPOSE    a grammar that assembles elements into whole cards
 *
 *  A hand-drawn SVG displacement filter (#warp) distorts every stroke and
 *  glyph uniformly; heavy fills get an extra erosion pass (#erode) for the
 *  screen-printed grain. Output is pure SVG, so PNG/SVG export is trivial.
 *
 *  Public API (window.MicroGfx):
 *    .generate({mode, theme, seed})  -> { inner, w, h, seed, theme }
 *    .standalone(gen, scale)         -> full <svg> string for export
 *    .themes / .elements / .marks    -> registries you can extend
 *
 *  Source is split into focused modules under src/. esbuild bundles these
 *  named exports into `window.MicroGfx` (browser) / `module.exports` (node).
 * ===================================================================== */

// ensure the stack/row containers register onto EL (side-effect import)
import "./layout";

export { generate, standalone } from "./render";
export { makeRng } from "./rng";
export { THEMES as themes, THEME_KEYS as themeKeys } from "./themes";
export { EL as elements } from "./elements";
export { MARKS as marks } from "./marks";
export { FRAMES as frames } from "./frames";
export { TEMPLATES as templates, compose } from "./compose";
