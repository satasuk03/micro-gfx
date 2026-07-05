/* ELEMENTS — each returns { svg, h }.  ctx = {x, y, w, r, opts}.
 * Leaf elements register onto the shared `EL` registry; layout.ts adds the
 * recursive `stack` / `row` containers to the same object. */
import type { ElementFn } from "./types";
import { T, L, R, P, ER, spaced, S, DISPLAY, CJK } from "./svg";
import { textWidth, isCJK, fitSize } from "./text";
import { MARKS, MARK_KEYS, ICON_KEYS } from "./marks";
import {
  CO_A, CO_B, PILL, EYE, WORDS, KANJI, HEXW, VERW, NUMW,
  READOUTS, FOOTER_R, METRICS, metricVal, tableCell, serial, coord,
} from "./content";

export const EL: Record<string, ElementFn> = {};

EL.brandLine = function (ctx) {
  const r = ctx.r, my = ctx.y + 10;
  const mark = MARKS[r.pick(MARK_KEYS)];
  let svg = mark(ctx.x + 8, my, 7);
  const name = "©" + r.pick(CO_A) + " " + r.pick(CO_B);
  svg += T(ctx.x + 22, my + 5, name, { size: 13, weight: 500 });
  if (ctx.opts.pill !== false) {
    const p = r.pick(PILL)(r), pw = textWidth(p, 11, S.mono, 500) + 14;
    svg += R(ctx.x + ctx.w - pw, ctx.y, pw, 20, { fill: S.ink });   // solid — too small to erode legibly
    svg += T(ctx.x + ctx.w - pw / 2, my + 4, p, { size: 11, anchor: "middle", color: S.bg, weight: 500 });
  }
  return { svg: svg, h: 22 };
};

EL.eyebrow = function (ctx) {
  const txt = ctx.opts.text || ctx.r.pick(EYE)(ctx.r);
  return { svg: spaced(ctx.x, ctx.y + 11, txt, ctx.w, { size: 11 }), h: 16 };
};

EL.bigDisplay = function (ctx) {
  const r = ctx.r;
  const kind = ctx.opts.kind || r.weighted([["word", 3], ["num", 3], ["cjk", 2], ["hex", 1], ["ver", 1]]);
  const str = kind === "word" ? r.pick(WORDS) : kind === "cjk" ? r.pick(KANJI) : kind === "hex" ? HEXW(r) : kind === "ver" ? VERW(r) : NUMW(r);
  const cjk = isCJK(str);
  const fam = cjk ? CJK : r.pick(DISPLAY);
  const wt = cjk ? 700 : 800;
  const cap = ctx.opts.max || 72;
  const size = fitSize(str, ctx.w, cap, fam, wt);
  return { svg: T(ctx.x, ctx.y + size * 0.8, str, { size: size, weight: wt, family: fam }), h: size * 0.98 };
};

EL.readoutStack = function (ctx) {
  const r = ctx.r, n = ctx.opts.n || r.int(2, 4), lh = 22;
  const pool = r.shuffle(READOUTS);
  let svg = "";
  for (let i = 0; i < n; i++) svg += T(ctx.x, ctx.y + 14 + i * lh, pool[i % pool.length](r), { size: 14 });
  return { svg: svg, h: n * lh };
};

EL.dataTable = function (ctx) {
  const r = ctx.r, rows = ctx.opts.rows || r.int(3, 5), cols = ctx.opts.cols || (r.chance(.6) ? 2 : 1);
  const rh = 21, w = ctx.w, cw = w / cols;
  let svg = R(ctx.x, ctx.y, w, rows * rh, { sw: 1.3 });
  for (let i = 1; i < rows; i++) svg += L(ctx.x, ctx.y + i * rh, ctx.x + w, ctx.y + i * rh, { w: 1 });
  for (let c = 1; c < cols; c++) svg += L(ctx.x + c * cw, ctx.y, ctx.x + c * cw, ctx.y + rows * rh, { w: 1 });
  for (let i = 0; i < rows; i++) for (let c = 0; c < cols; c++)
    svg += T(ctx.x + c * cw + 7, ctx.y + i * rh + 15, tableCell(r), { size: 12 });
  return { svg: svg, h: rows * rh };
};

EL.barcode = function (ctx) {
  const r = ctx.r, h = ctx.opts.h || 60;
  let x = ctx.x, bars = "";
  while (x < ctx.x + ctx.w - 4) {
    const bw = r.pick([2, 2, 3, 4, 6]);
    if (r.chance(.55)) bars += R(x, ctx.y, bw, h, { fill: S.ink });
    x += bw + r.pick([2, 2, 3]);
  }
  let svg = ER(bars);
  if (ctx.opts.num !== false) svg += T(ctx.x, ctx.y + h + 16, r.int(1000, 9999) + " " + r.int(10000, 99999), { size: 13, spacing: 2 });
  return { svg: svg, h: h + (ctx.opts.num !== false ? 20 : 0) };
};

EL.qrcode = function (ctx) {
  const r = ctx.r, size = ctx.opts.size || Math.min(ctx.w, 120), n = ctx.opts.matrix || r.pick([21, 23, 25]);
  const cell = size / n;
  let m = "";
  for (let gy = 0; gy < n; gy++) for (let gx = 0; gx < n; gx++) {
    const finder = (gx < 7 && gy < 7) || (gx >= n - 7 && gy < 7) || (gx < 7 && gy >= n - 7);
    if (finder) continue;
    if (r.chance(.48)) m += R(ctx.x + gx * cell, ctx.y + gy * cell, cell + 0.5, cell + 0.5, { fill: S.ink });
  }
  const finder = (ox: number, oy: number) => {                    // the three positioning eyes
    let s = R(ctx.x + ox * cell, ctx.y + oy * cell, cell * 7, cell * 7, { fill: S.ink });
    s += R(ctx.x + (ox + 1) * cell, ctx.y + (oy + 1) * cell, cell * 5, cell * 5, { fill: S.bg });
    s += R(ctx.x + (ox + 2) * cell, ctx.y + (oy + 2) * cell, cell * 3, cell * 3, { fill: S.ink });
    return s;
  };
  m += finder(0, 0) + finder(n - 7, 0) + finder(0, n - 7);
  return { svg: ER(m), h: size };
};

EL.dataMatrix = function (ctx) {
  const r = ctx.r, size = ctx.opts.size || Math.min(ctx.w, 120), n = r.pick([14, 16, 18]);
  const cell = size / n;
  let m = R(ctx.x, ctx.y, cell, size, { fill: S.ink }) + R(ctx.x, ctx.y + size - cell, size, cell, { fill: S.ink }); // solid L
  for (let i = 0; i < n; i += 2) { m += R(ctx.x + i * cell, ctx.y, cell, cell, { fill: S.ink }); m += R(ctx.x + size - cell, ctx.y + i * cell, cell, cell, { fill: S.ink }); } // timing
  for (let gy = 1; gy < n - 1; gy++) for (let gx = 1; gx < n; gx++) if (r.chance(.45)) m += R(ctx.x + gx * cell, ctx.y + gy * cell, cell, cell, { fill: S.ink });
  return { svg: ER(m), h: size };
};

EL.lineChart = function (ctx) {
  const r = ctx.r, h = ctx.opts.h || 120, w = ctx.w, box = ctx.opts.box !== false;
  let svg = box ? R(ctx.x, ctx.y, w, h, { sw: 1.3 }) : "";
  const pad = box ? 10 : 0, iy = ctx.y + pad, ih = h - pad * 2, ix = ctx.x + pad, iw = w - pad * 2;
  for (let g = 1; g <= 3; g++) svg += L(ix, iy + ih * g / 4, ix + iw, iy + ih * g / 4, { w: .8, dash: "1 5" }); // gridlines
  const series = (dash: string) => {
    const pts = r.int(6, 11); let d = "";
    for (let i = 0; i <= pts; i++) d += (i ? "L" : "M") + (ix + iw * i / pts).toFixed(1) + " " + (iy + r.float(.05, .95) * ih).toFixed(1) + " ";
    return P(d, { w: 1.5, dash: dash });
  };
  svg += series("");
  if (r.chance(.4)) svg += series("5 4");
  return { svg: svg, h: h };
};

EL.waveform = function (ctx) {
  const r = ctx.r, h = ctx.opts.h || 90, w = ctx.w, mid = ctx.y + h / 2;
  let svg = "";
  for (let g = 0; g < 3; g++) svg += L(ctx.x, ctx.y + h * (g + .5) / 3, ctx.x + w, ctx.y + h * (g + .5) / 3, { w: .8, dash: "1 5" });
  const cyc = r.float(2, 4), amp = h * .35, ph = r.float(0, 6);
  let d = "M" + ctx.x + " " + mid;
  for (let i = 0; i <= 60; i++) { const x = ctx.x + w * i / 60; d += "L" + x.toFixed(1) + " " + (mid - Math.sin(ph + i / 60 * Math.PI * 2 * cyc) * amp).toFixed(1); }
  return { svg: svg + P(d, { w: 1.5 }), h: h };
};

EL.dimension = function (ctx) {
  const r = ctx.r, w = ctx.w, ly = ctx.y + 22, x2 = ctx.x + w;
  const label = r.pick(METRICS) + " " + metricVal(r.pick(METRICS), r);
  let svg = L(ctx.x, ly, x2, ly, { w: 1.3 });
  svg += P("M" + (ctx.x + 9) + " " + (ly - 4) + "L" + ctx.x + " " + ly + "L" + (ctx.x + 9) + " " + (ly + 4), { sw: 1.3 });   // < arrow
  svg += P("M" + (x2 - 9) + " " + (ly - 4) + "L" + x2 + " " + ly + "L" + (x2 - 9) + " " + (ly + 4), { sw: 1.3 });             // > arrow
  svg += T(ctx.x + w / 2, ly - 6, label, { size: 12, anchor: "middle", spacing: 1 });
  return { svg: svg, h: 30 };
};

EL.pillRow = function (ctx) {
  const r = ctx.r, n = r.int(2, 3);
  let x = ctx.x, svg = "";
  for (let i = 0; i < n; i++) {
    const p = r.pick(PILL)(r), pw = textWidth(p, 12, S.mono, 500) + 20;
    if (i) { svg += T(x + 6, ctx.y + 16, "/", { size: 13 }); x += 18; }
    svg += R(x, ctx.y, pw, 24, { rx: 12, sw: 1.4 }) + T(x + pw / 2, ctx.y + 16, p, { size: 12, anchor: "middle", weight: 500 });
    x += pw + 6;
  }
  return { svg: svg, h: 26 };
};

EL.iconRow = function (ctx) {
  const r = ctx.r, keys = r.shuffle(ICON_KEYS).slice(0, ctx.opts.n || r.int(3, 4));
  const gap = ctx.w / (keys.length + 1);
  let svg = "";
  keys.forEach((k, i) => { svg += MARKS[k](ctx.x + gap * (i + 1), ctx.y + 16, 13); });
  return { svg: svg, h: 36 };
};

EL.titleBar = function (ctx) {
  const r = ctx.r, invert = ctx.opts.invert != null ? ctx.opts.invert : r.chance(.5), h = 30;
  const txt = ctx.opts.text || r.pick(WORDS);
  let svg = invert ? ER(R(ctx.x, ctx.y, ctx.w, h, { fill: S.ink })) : R(ctx.x, ctx.y, ctx.w, h, { sw: 1.4 });
  svg += spaced(ctx.x + 10, ctx.y + 20, txt, ctx.w - 20, { size: 14, weight: 600, color: invert ? S.bg : S.ink });
  return { svg: svg, h: h };
};

EL.dashDivider = function (ctx) {
  const y = ctx.y + 4;
  return { svg: L(ctx.x, y - 4, ctx.x, y + 4) + L(ctx.x + ctx.w, y - 4, ctx.x + ctx.w, y + 4) + L(ctx.x, y, ctx.x + ctx.w, y, { dash: "2 6", w: 1.3 }), h: 10 };
};
EL.solidDivider = function (ctx) { return { svg: L(ctx.x, ctx.y + 3, ctx.x + ctx.w, ctx.y + 3, { w: 1.4 }), h: 6 }; };

EL.bracketRule = function (ctx) {
  const r = ctx.r, w = ctx.w, num = "< " + r.int(1000, 9999) + " " + r.int(1000, 9999) + " " + r.int(10, 99) + " >";
  let svg = L(ctx.x, ctx.y, ctx.x + w, ctx.y, { w: 1.3 });
  svg += T(ctx.x + w / 2, ctx.y + 20, num, { size: 16, anchor: "middle", spacing: 2 });
  svg += L(ctx.x, ctx.y + 30, ctx.x + w, ctx.y + 30, { w: 1.3 });
  return { svg: svg, h: 34 };
};

EL.coordReadout = function (ctx) { return { svg: T(ctx.x, ctx.y + 15, coord(ctx.r), { size: 16, spacing: 1 }), h: 20 }; };
EL.serialLine = function (ctx) { return { svg: T(ctx.x, ctx.y + 13, ctx.opts.text || serial(ctx.r), { size: 13, spacing: 1 }), h: 16 }; };
EL.statusLine = function (ctx) { return { svg: T(ctx.x, ctx.y + 13, ctx.r.pick(READOUTS)(ctx.r), { size: 13 }), h: 16 }; };
EL.footerRow = function (ctx) {
  const r = ctx.r;
  return { svg: T(ctx.x, ctx.y + 12, "©" + r.int(2023, 2029), { size: 12 }) + T(ctx.x + ctx.w, ctx.y + 12, r.pick(FOOTER_R), { size: 12, anchor: "end" }), h: 16 };
};
EL.hatch = function (ctx) {                          // decorative diagonal-fill square
  const s = ctx.opts.size || 60; let svg = "";
  for (let i = -s; i < s; i += 6) svg += L(ctx.x + Math.max(0, i), ctx.y + Math.max(0, -i), ctx.x + Math.min(s, s + i), ctx.y + Math.min(s, s - i), { w: 1 });
  return { svg: R(ctx.x, ctx.y, s, s, { sw: 1.3 }) + svg, h: s };
};
EL.spring = function (ctx) {                         // stacked ellipses (coil)
  const w = ctx.opts.w || 40; let svg = "";
  for (let i = 0; i < 5; i++) svg += '<ellipse cx="' + (ctx.x + w / 2) + '" cy="' + (ctx.y + 6 + i * 6) + '" rx="' + w / 2 + '" ry="4" fill="none" stroke="' + S.ink + '" stroke-width="1.3"/>';
  return { svg: svg, h: 40 };
};
EL.gap = function (ctx) { return { svg: "", h: ctx.opts.h || 12 }; };
