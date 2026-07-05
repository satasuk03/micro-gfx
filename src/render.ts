/* RENDER — applies a theme to the shared state, builds the SVG <defs>
 * (warp / erode / grain filters), and assembles whole cards, banners and
 * posters. `generate` is the main entry; `standalone` wraps output for export. */
import type { Rng, Theme, Recipe, GenerateOpts, Generated } from "./types";
import { S, MONO, DISPLAY, R, L } from "./svg";
import { THEMES, THEME_KEYS } from "./themes";
import { FRAMES } from "./frames";
import { compose } from "./compose";
import { draw } from "./layout";
import { EL } from "./elements";
import { makeRng } from "./rng";

function applyTheme(th: Theme): void {
  S.ink = th.ink; S.bg = th.bg; S.mono = MONO; S.disp = DISPLAY[0]; S.erode = th.erode;
}

function defsFor(seed: number, th: Theme): string {
  const fs = seed % 1000;
  return '<defs>' +
    '<filter id="warp" x="-8%" y="-8%" width="116%" height="116%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="' + fs + '" result="n"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="' + th.warp + '" xChannelSelector="R" yChannelSelector="G"/>' +
    '</filter>' +
    '<filter id="erode" x="-6%" y="-6%" width="112%" height="112%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.45 0.55" numOctaves="2" seed="' + (fs + 7) + '" result="nz"/>' +
      '<feColorMatrix in="nz" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -1.4 1.28" result="mask"/>' +
      '<feComposite in="SourceGraphic" in2="mask" operator="in"/>' +
    '</filter>' +
    '<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="' + fs + '" stitchTiles="stitch"/>' +
      '<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .6 0"/></filter>' +
    '</defs>';
}

function frameAssemble(inkSvg: string, w: number, h: number, seed: number, th: Theme): string {
  return defsFor(seed, th) +
    R(0, 0, w, h, { fill: th.bg, sw: 0 }) +
    '<g filter="url(#warp)">' + inkSvg + "</g>" +
    R(0, 0, w, h, { fill: "#000", sw: 0, opacity: th.grain }).replace('fill="#000"', 'fill="#000" filter="url(#grain)"');
}

// one self-contained card (used by card/banner modes and poster cells)
function renderCard(r: Rng, w: number, h: number, th: Theme, rec: Recipe, pad?: number): { svg: string; contentH: number } {
  pad = pad == null ? 40 : pad;
  const zoneW = w - pad * 2;
  const body = draw({ x: pad, y: 0, w: zoneW, r: r }, { type: "stack", children: rec.children, gap: rec.gap });
  let offY = pad;
  if (rec.align === "center") offY = Math.max(pad, (h - body.h) / 2);
  const ink = FRAMES[rec.frame || "none"](w, h) + '<g transform="translate(0,' + offY + ')">' + body.svg + "</g>";
  return { svg: ink, contentH: body.h + offY + pad };
}

export function generate(opts?: GenerateOpts): Generated {
  opts = opts || {};
  const seed = (opts.seed == null ? Math.floor(Math.random() * 4294967296) : opts.seed) >>> 0;
  const r = makeRng(seed);
  const themeName = (!opts.theme || opts.theme === "auto") ? r.pick(THEME_KEYS) : opts.theme;
  const th = THEMES[themeName] || THEMES.gray;
  applyTheme(th);
  const mode = opts.mode || "card";

  let W: number, H: number, ink: string;
  if (mode === "banner") {
    W = 1320; H = 560;
    ink = renderCard(r, W, H, th, compose(r, { banner: true }), 48).svg;
  } else if (mode === "poster") {
    W = 1600; H = 1360;
    ink = renderPoster(r, W, H, th);
  } else { // card — height adapts to the composed content (fixed width)
    W = 1040; const pad = 46, zoneW = W - pad * 2;
    const rec = compose(r);
    const body = draw({ x: pad, y: pad, w: zoneW, r: r }, { type: "stack", children: rec.children, gap: rec.gap });
    // reserve a little negative space below sparse content so it still reads as a card
    let bottom = pad + Math.max(body.h, 150);
    let footerSvg = "";
    if (r.chance(0.72)) {                                     // most cards anchor a footer
      const fy = bottom + 34;
      footerSvg = EL.dashDivider({ x: pad, y: fy, w: zoneW, r: r, opts: {} }).svg +
                  EL.footerRow({ x: pad, y: fy + 16, w: zoneW, r: r, opts: {} }).svg;
      bottom = fy + 30;
    }
    H = Math.round(bottom + pad);
    ink = FRAMES[rec.frame || "none"](W, H) + body.svg + footerSvg;
  }

  return { inner: frameAssemble(ink, W, H, seed, th), w: W, h: H, seed: seed, theme: themeName };
}

function renderPoster(r: Rng, W: number, H: number, th: Theme): string {
  const pad = 44, cols = 3, gap = 42;
  const colW = (W - pad * 2 - gap * (cols - 1)) / cols;
  const colH = new Array(cols).fill(pad);
  const cells: string[] = [];
  let guard = 0;
  while (Math.min.apply(null, colH) < H - pad - 120 && guard++ < 40) {
    let c = 0; for (let i = 1; i < cols; i++) if (colH[i] < colH[c]) c = i;   // shortest column
    const x = pad + c * (colW + gap), y = colH[c];
    const rec = compose(r);
    const framed = r.weighted([["none", 6], ["full", 3], ["corners", 1]]);
    rec.frame = "none"; rec.align = "top";
    const ipad = framed === "none" ? 0 : 14;
    const body = draw({ x: x + ipad, y: y + ipad, w: colW - ipad * 2, r: r }, { type: "stack", children: rec.children });
    const cellH = body.h + ipad * 2;
    let svg = body.svg;
    if (framed === "full") svg += R(x, y, colW, cellH, { sw: 1.5 });
    else if (framed === "corners") { const len = 24, m = 4; svg += L(x + m, y + m, x + m + len, y + m) + L(x + m, y + m, x + m, y + m + len) + L(x + colW - m, y + cellH - m, x + colW - m - len, y + cellH - m) + L(x + colW - m, y + cellH - m, x + colW - m, y + cellH - m - len); }
    cells.push(svg);
    colH[c] = y + cellH + gap;
  }
  return cells.join("");
}

export function standalone(gen: Generated, scale?: number): string {
  scale = scale || 1;
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + gen.w * scale + '" height="' + gen.h * scale +
    '" viewBox="0 0 ' + gen.w + " " + gen.h + '">' + gen.inner + "</svg>";
}
