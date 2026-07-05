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
 * ===================================================================== */
(function (root) {
"use strict";

/* ------------------------------------------------------------------ *
 *  PRNG — mulberry32. Same seed => identical graphic.                 *
 * ------------------------------------------------------------------ */
function makeRng(seed) {
  let s = seed >>> 0;
  const next = () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    float: (a, b) => a + (b - a) * next(),
    int:   (a, b) => Math.floor(a + (b - a + 1) * next()),
    pick:  (a) => a[Math.floor(next() * a.length)],
    chance:(p) => next() < p,
    weighted: (pairs) => {           // [[value, weight], ...]
      let tot = 0; for (const p of pairs) tot += p[1];
      let x = next() * tot;
      for (const p of pairs) { if ((x -= p[1]) < 0) return p[0]; }
      return pairs[pairs.length - 1][0];
    },
    shuffle: (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  };
}

/* ------------------------------------------------------------------ *
 *  Text measurement — real canvas in the browser, estimate in node.  *
 * ------------------------------------------------------------------ */
let _mctx = null;
function textWidth(str, px, family, weight) {
  weight = weight || 400;
  if (typeof document !== "undefined") {
    if (!_mctx) _mctx = document.createElement("canvas").getContext("2d");
    _mctx.font = weight + " " + px + "px " + family;
    return _mctx.measureText(str).width;
  }
  let w = 0;                          // node fallback: CJK ~1em, latin ~0.58em
  for (const ch of String(str)) w += /[⺀-鿿＀-￯]/.test(ch) ? px : px * 0.58;
  return w;
}
const isCJK = (s) => /[⺀-鿿＀-￯]/.test(s);
// largest font size at which `str` fits `maxW`, capped at `cap`
function fitSize(str, maxW, cap, family, weight) {
  const w = textWidth(str, cap, family, weight);
  return w <= maxW ? cap : Math.max(8, cap * maxW / w);
}

/* ------------------------------------------------------------------ *
 *  Drawing state + SVG primitives                                    *
 * ------------------------------------------------------------------ */
const S = { ink: "#000", bg: "#fff", mono: "", disp: "", erode: false };
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";
const DISPLAY = [
  "'Arial Narrow',Impact,'Franklin Gothic',sans-serif",   // condensed grotesque
  "'Helvetica Neue',Helvetica,Arial,sans-serif",          // grotesque
  MONO,                                                    // heavy mono
];
const CJK = "'Hiragino Kaku Gothic ProN','PingFang SC','Noto Sans CJK SC','Microsoft YaHei',sans-serif";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function T(x, y, str, o) {
  o = o || {};
  const size = o.size || 14, family = o.family || S.mono, weight = o.weight || 400;
  return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" text-anchor="' + (o.anchor || "start") +
    '" letter-spacing="' + (o.spacing || 0) + '" font-weight="' + weight + '" fill="' + (o.color || S.ink) +
    '" opacity="' + (o.opacity == null ? 1 : o.opacity) + '" font-family="' + family + '">' + esc(str) + "</text>";
}
function L(x1, y1, x2, y2, o) {
  o = o || {};
  return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + (o.color || S.ink) +
    '" stroke-width="' + (o.w || 1.5) + '" stroke-dasharray="' + (o.dash || "") + '" stroke-linecap="' + (o.cap || "butt") +
    '" opacity="' + (o.opacity == null ? 1 : o.opacity) + '"/>';
}
function R(x, y, w, h, o) {
  o = o || {};
  return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (o.rx || 0) +
    '" fill="' + (o.fill || "none") + '" stroke="' + (o.stroke || (o.fill ? "none" : S.ink)) +
    '" stroke-width="' + (o.sw == null ? 1.5 : o.sw) + '" opacity="' + (o.opacity == null ? 1 : o.opacity) + '"/>';
}
function C(cx, cy, r, o) {
  o = o || {};
  return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + (o.fill || "none") +
    '" stroke="' + (o.stroke || (o.fill ? "none" : S.ink)) + '" stroke-width="' + (o.sw == null ? 1.5 : o.sw) +
    '" opacity="' + (o.opacity == null ? 1 : o.opacity) + '"/>';
}
function P(d, o) {
  o = o || {};
  return '<path d="' + d + '" fill="' + (o.fill || "none") + '" stroke="' + (o.stroke || (o.fill ? "none" : S.ink)) +
    '" stroke-width="' + (o.sw == null ? 1.5 : o.sw) + '" stroke-linejoin="round" stroke-linecap="round" opacity="' +
    (o.opacity == null ? 1 : o.opacity) + '"/>';
}
// wrap heavy fills in the erosion filter (screen-print grain) when enabled
const ER = (svg) => S.erode ? '<g filter="url(#erode)">' + svg + "</g>" : svg;

// spaced text justified to fill a width  (returns svg only; caller owns h)
function spaced(x, y, str, w, o) {
  o = o || {};
  const size = o.size || 11, weight = o.weight || 400;
  const base = textWidth(str, size, S.mono, weight);
  const n = Math.max(str.length - 1, 1);
  let sp = (w - base) / n;
  if (sp < 0) sp = 0;
  return T(x, y, str, { size: size, spacing: sp, weight: weight, color: o.color });
}

/* ------------------------------------------------------------------ *
 *  Content pools                                                     *
 * ------------------------------------------------------------------ */
const CO_A = ["CARGO", "SUMMIT", "AXIOM", "NUCLEUS", "COBALT", "DELTA", "RADIAN", "MERIDIAN", "HELIX", "ATLAS", "APEX", "NOVA", "VECTOR"];
const CO_B = ["INDUSTRIES", "SYSTEMS", "DIVISION", "ENGINEERING", "STUDIO", "WORKS", "LABS", "OFFICE"];
const PILL = [
  (r) => "BUILD " + r.int(1, 999),
  (r) => "TOOLS",
  (r) => "TXT2IMG",
  (r) => "V" + r.int(1, 5) + "." + r.int(0, 9),
  (r) => "Y " + r.int(2023, 2029),
  (r) => "REV " + String.fromCharCode(65 + r.int(0, 25)),
];
const EYE = [
  () => "ACCESS GRANTED", () => "ACCESS LOCKED", () => "ACCESS PENDING",
  () => "INPUT VERIFIED / OUTPUT OK", () => "COPY OF RECORD",
  (r) => "STATUS > " + r.pick(["FAULT", "ONLINE", "SEALED", "IDLE", "PASSED", "REJECT", "STANDBY", "DECLASSIFIED", "INDEXED", "OFFLINE"]),
  (r) => r.pick(["FAULT", "DECLASSIFIED", "SEALED", "ONLINE", "INDEXED", "OFFLINE", "STANDBY"]) + " // PORT " + r.int(10, 999),
];
const WORDS = ["CONFIG", "CORE", "SYS", "CONTROL UNIT", "CARGO BAY", "TECHNICAL TESTING", "FIELD STATION",
  "DATA SYSTEMS", "OPERATIONS LAB", "DIGITAL FARM", "AUTONOMOUS UNITS", "VECTOR PATH", "SPEC UNIT CARD", "TEST DATA LABEL"];
const KANJI = ["信号", "演算", "電源", "制御", "検証", "起動", "接続", "同期", "記録", "制御方式", "接続同期", "起動接続", "解析アクセス"];
const HEXW = (r) => "0X" + Array.from({ length: r.int(2, 4) }, () => "0123456789ABCDEF"[r.int(0, 15)]).join("");
const VERW = (r) => "V" + r.int(2, 9);
const NUMW = (r) => r.pick(["007", String(r.int(0, 999)).padStart(4, "0"), String(r.int(100, 999))]);

const HEX = (r, n) => Array.from({ length: n || r.int(4, 6) }, () => "0123456789ABCDEF"[r.int(0, 15)]).join("");
const LET = (r, n) => Array.from({ length: n }, () => String.fromCharCode(65 + r.int(0, 25))).join("");
const serial = (r) => "SN " + LET(r, 4) + "-" + r.int(1000, 9999) + "-" + LET(r, 3);
const coord = (r) => r.int(10, 180) + "." + r.int(10, 99) + " / " + r.int(10, 180) + "." + r.int(10, 99) + " / " + r.int(100, 999) + "." + r.int(10, 99);

const TABLE_LABELS = ["SKU", "PART", "QC", "LOT", "REV", "CFG", "SPEC", "TEST", "UNIT", "CASE", "DOC", "VOL", "ID", "REF"];
const METRICS = ["LOSS", "POWER", "LOAD", "TEMP", "VOLT", "FREQ", "LAT"];
function metricVal(label, r) {
  switch (label) {
    case "LOSS": case "POWER": case "LOAD": return r.int(0, 99) + (r.chance(.3) ? "." + r.int(0, 9) : "") + "%";
    case "TEMP": return r.int(15, 99) + "°C";
    case "VOLT": return (r.chance(.5) ? r.int(2, 48) : r.int(2, 12) + "." + r.int(0, 9)) + "V";
    case "FREQ": return r.int(20, 999) + "HZ";
    case "LAT":  return r.int(1, 99) + "MS";
    default:     return String(r.int(2, 99));
  }
}
const tableCell = (r) => r.chance(.5)
  ? r.pick(TABLE_LABELS) + " " + (r.chance(.5) ? LET(r, 1) + r.int(0, 9) : r.int(10, 99))
  : (function () { const m = r.pick(METRICS); return m + " " + metricVal(m, r); })();

const READOUTS = [
  (r) => "CODE " + HEXW(r),
  (r) => "STATUS > " + r.pick(["FAULT", "ONLINE", "REJECT", "SEALED", "PASSED", "IDLE"]),
  () => "INPUT VERIFIED / OUTPUT OK",
  (r) => "MOD " + LET(r, 1) + r.int(10, 99) + " / PORT " + r.int(10, 99),
  (r) => serial(r),
  (r) => "DATA." + r.int(100, 999) + ".XML",
  (r) => "LOG_" + r.int(100000, 999999) + ".TXT",
  (r) => "REF " + LET(r, 2) + r.int(100, 999),
  (r) => "BIN " + r.int(1, 99),
  (r) => "BAY " + r.int(1, 9),
  (r) => "LINE " + r.int(1, 9),
  (r) => "LOT " + r.int(1, 99),
];
const FOOTER_R = ["UPLINK STABLE", "SIGNAL LOCKED", "STANDBY MODE", "NO FAULT", "TRACE CLEAR", "AWAITING SYNC"];

/* ------------------------------------------------------------------ *
 *  Brand marks + icons  (small vector glyphs, drawn clean)           *
 * ------------------------------------------------------------------ */
const MARKS = {
  sunrise(cx, cy, s) { let o = P("M" + (cx - s) + " " + cy + " A" + s + " " + s + " 0 0 1 " + (cx + s) + " " + cy, { sw: 1.4 }); for (let i = -2; i <= 2; i++) { const a = cx + i * s / 2.5; o += L(a, cy, a, cy - s * 0.55, { w: 1.3 }); } return o; },
  sun(cx, cy, s) { let o = C(cx, cy, s * .5, { sw: 1.3 }); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; o += L(cx + Math.cos(a) * s * .72, cy + Math.sin(a) * s * .72, cx + Math.cos(a) * s, cy + Math.sin(a) * s, { w: 1.2 }); } return o; },
  hex(cx, cy, s) { let d = ""; for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; d += (i ? "L" : "M") + (cx + Math.cos(a) * s).toFixed(1) + " " + (cy + Math.sin(a) * s).toFixed(1) + " "; } return P(d + "Z", { sw: 1.3 }); },
  xbox(cx, cy, s) { return R(cx - s, cy - s, s * 2, s * 2, { sw: 1.3 }) + L(cx - s, cy - s, cx + s, cy + s, { w: 1.2 }) + L(cx + s, cy - s, cx - s, cy + s, { w: 1.2 }); },
  diamond(cx, cy, s) { return P("M" + cx + " " + (cy - s) + "L" + (cx + s) + " " + cy + "L" + cx + " " + (cy + s) + "L" + (cx - s) + " " + cy + "Z", { sw: 1.3 }); },
  target(cx, cy, s) { return C(cx, cy, s, { sw: 1.3 }) + C(cx, cy, s * .45, { sw: 1.2 }) + C(cx, cy, 1.4, { fill: S.ink }); },
  concentric(cx, cy, s) { return C(cx, cy, s, { sw: 1.2 }) + C(cx, cy, s * .62, { sw: 1.2 }) + C(cx, cy, s * .28, { sw: 1.2 }); },
  chev(cx, cy, s) { return P("M" + (cx - s) + " " + (cy - s) + "L" + cx + " " + cy + "L" + (cx - s) + " " + (cy + s), { sw: 1.4 }) + P("M" + cx + " " + (cy - s) + "L" + (cx + s) + " " + cy + "L" + cx + " " + (cy + s), { sw: 1.4 }); },
  grid(cx, cy, s) { let o = ""; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) o += C(cx + i * s * .55, cy + j * s * .55, 1.3, { fill: S.ink }); return o; },
  cross(cx, cy, s) { return L(cx - s, cy, cx + s, cy) + L(cx, cy - s, cx, cy + s); },
  warn(cx, cy, s) { return P("M" + cx + " " + (cy - s) + "L" + (cx + s) + " " + (cy + s) + "L" + (cx - s) + " " + (cy + s) + "Z", { sw: 1.3 }) + L(cx, cy - s * .2, cx, cy + s * .3, { w: 1.2 }); },
  burst(cx, cy, s) { let o = ""; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; o += L(cx, cy, cx + Math.cos(a) * s, cy + Math.sin(a) * s, { w: 1.2 }); } return o; },
  globe(cx, cy, s) { return C(cx, cy, s, { sw: 1.3 }) + L(cx - s, cy, cx + s, cy, { w: 1 }) + P("M" + cx + " " + (cy - s) + " Q" + (cx - s) + " " + cy + " " + cx + " " + (cy + s), { sw: 1 }) + P("M" + cx + " " + (cy - s) + " Q" + (cx + s) + " " + cy + " " + cx + " " + (cy + s), { sw: 1 }); },
  bolt(cx, cy, s) { return P("M" + (cx + s * .3) + " " + (cy - s) + "L" + (cx - s * .4) + " " + (cy + s * .1) + "L" + (cx + s * .1) + " " + (cy + s * .1) + "L" + (cx - s * .2) + " " + (cy + s) + "L" + (cx + s * .5) + " " + (cy - s * .2) + "L" + cx + " " + (cy - s * .2) + "Z", { fill: S.ink, sw: 0 }); },
  rcirc(cx, cy, s) { return C(cx, cy, s, { sw: 1.3 }) + T(cx, cy + s * .45, "R", { size: s * 1.1, anchor: "middle", weight: 700 }); },
};
const MARK_KEYS = Object.keys(MARKS);
const ICON_KEYS = ["target", "cross", "warn", "diamond", "sun", "bolt", "rcirc", "xbox", "concentric", "grid"];

/* ================================================================== *
 *  ELEMENTS — each returns { svg, h }.  ctx = {x, y, w, r}            *
 * ================================================================== */
const EL = {};

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
  const finder = (ox, oy) => {                    // the three positioning eyes
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
  const series = (dash) => {
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

/* ------------------------------------------------------------------ *
 *  LAYOUT containers (also elements → fully recursive composition)   *
 * ------------------------------------------------------------------ */
function draw(ctx, spec) {
  const fn = EL[spec.type];
  if (!fn) throw new Error("unknown element: " + spec.type);
  return fn({ x: ctx.x, y: ctx.y, w: ctx.w, r: ctx.r, opts: spec });
}

EL.stack = function (ctx) {
  const children = ctx.opts.children, gap = ctx.opts.gap == null ? 14 : ctx.opts.gap;
  let cur = ctx.y, svg = "";
  children.forEach((ch, i) => {
    if (i) cur += (ch.gapBefore == null ? gap : ch.gapBefore);
    const res = draw({ x: ctx.x, y: cur, w: ctx.w, r: ctx.r }, ch);
    svg += res.svg; cur += res.h;
  });
  return { svg: svg, h: cur - ctx.y };
};

EL.row = function (ctx) {
  const children = ctx.opts.children, gap = ctx.opts.gap == null ? 20 : ctx.opts.gap;
  const fixed = children.reduce((s, c) => s + (c.width || 0), 0);
  const flexCount = children.filter((c) => !c.width).length;
  const flexW = flexCount ? (ctx.w - fixed - gap * (children.length - 1)) / flexCount : 0;
  let x = ctx.x, svg = "", maxh = 0;
  for (const c of children) {
    const w = c.width || flexW;
    const res = draw({ x: x, y: ctx.y, w: w, r: ctx.r }, c.spec);
    svg += res.svg; maxh = Math.max(maxh, res.h); x += w + gap;
  }
  return { svg: svg, h: maxh };
};

/* ------------------------------------------------------------------ *
 *  FRAMES                                                            *
 * ------------------------------------------------------------------ */
const FRAMES = {
  none: () => "",
  full: (w, h) => R(22, 22, w - 44, h - 44, { sw: 1.6 }),
  corners: (w, h) => {
    const m = 24, len = Math.min(46, w * .1), c = [];
    const bracket = (x, y, dx, dy) => L(x, y, x + dx * len, y, { w: 1.6 }) + L(x, y, x, y + dy * len, { w: 1.6 });
    return bracket(m, m, 1, 1) + bracket(w - m, m, -1, 1) + bracket(m, h - m, 1, -1) + bracket(w - m, h - m, -1, -1);
  },
};

/* ------------------------------------------------------------------ *
 *  THEMES                                                            *
 * ------------------------------------------------------------------ */
const THEMES = {
  gray:   { bg: "#3d3d3b", ink: "#e9e6dc", erode: true,  grain: .05, warp: 2.2 },
  orange: { bg: "#d1783f", ink: "#f4ede0", erode: true,  grain: .06, warp: 2.6 },
  cream:  { bg: "#efe9d7", ink: "#26231d", erode: true,  grain: .05, warp: 2.4 },
  acid:   { bg: "#0c0d0a", ink: "#d7e84a", erode: true,  grain: .04, warp: 2.4 },
  lav:    { bg: "#c7c6cf", ink: "#1b1b1e", erode: true,  grain: .05, warp: 2.6 },
  olive:  { bg: "#8b9184", ink: "#282c22", erode: false, grain: .05, warp: 2.6 },
  steel:  { bg: "#99a0a4", ink: "#22282b", erode: false, grain: .05, warp: 2.6 },
  sand:   { bg: "#b8ac93", ink: "#38311f", erode: false, grain: .05, warp: 2.6 },
};
const THEME_KEYS = Object.keys(THEMES);

/* ------------------------------------------------------------------ *
 *  COMPOSE — the grammar. Returns a recipe (array of specs).          *
 * ------------------------------------------------------------------ */
function heroSpec(r, max) { return { type: "bigDisplay", max: max || 72 }; }
function bodySpec(r) {
  return r.weighted([
    [{ type: "dataTable" }, 3],
    [{ type: "readoutStack" }, 3],
    [{ type: "row", gap: 18, children: [{ width: 118, spec: { type: r.chance(.7) ? "qrcode" : "dataMatrix", size: 118 } }, { spec: { type: "readoutStack", n: r.int(2, 3) } }] }, 3],
    [{ type: "lineChart" }, 2],
    [{ type: "waveform" }, 1],
  ]);
}

const TEMPLATES = [
  // access-hero : big number + table
  (r) => ({ frame: "none", children: [{ type: "brandLine" }, { type: "eyebrow" }, heroSpec(r), { type: "dataTable", gapBefore: 18 }] }),
  // config : word + barcode
  (r) => ({ frame: "none", children: [{ type: "brandLine" }, { type: "eyebrow" }, heroSpec(r), { type: "barcode", gapBefore: 16 }, { type: "serialLine" }] }),
  // engineering-qr : brand + split(readouts | code)
  (r) => ({ frame: r.chance(.5) ? "full" : "none", children: [{ type: "brandLine" }, { type: "row", gapBefore: 18, gap: 20, children: [{ spec: { type: "readoutStack", n: 3 } }, { width: 118, spec: { type: r.chance(.6) ? "qrcode" : "dataMatrix", size: 118 } }] }] }),
  // studio-num-qr : num + split(code | readouts)
  (r) => ({ frame: "none", children: [{ type: "brandLine" }, { type: "eyebrow" }, { type: "bigDisplay", kind: "num", max: 64 }, { type: "row", gapBefore: 16, gap: 18, children: [{ width: 96, spec: { type: "qrcode", size: 96 } }, { spec: { type: "readoutStack", n: 3 } }] }] }),
  // cargo-bay : framed word + readouts + side icon
  (r) => ({ frame: "full", children: [{ type: "brandLine" }, { type: "eyebrow" }, heroSpec(r, 56), { type: "readoutStack", n: 3, gapBefore: 14 }] }),
  // chart card
  (r) => ({ frame: r.chance(.4) ? "full" : "none", children: [{ type: "brandLine" }, { type: "eyebrow" }, heroSpec(r, 60), { type: r.chance(.5) ? "lineChart" : "waveform", gapBefore: 14, h: 120 }, { type: "dimension", gapBefore: 12 }] }),
  // spec-card : inverted title bar
  (r) => ({ frame: r.chance(.5) ? "full" : "none", children: [{ type: "titleBar", invert: true }, { type: "eyebrow", gapBefore: 12 }, { type: "bigDisplay", kind: r.chance(.5) ? "cjk" : "word", max: 48 }, { type: "readoutStack", n: 3 }] }),
  // digital-farm : word + bracket rule + serial
  (r) => ({ frame: "none", children: [{ type: "brandLine" }, { type: "eyebrow" }, heroSpec(r, 48), { type: "bracketRule", gapBefore: 16 }, { type: "serialLine", gapBefore: 10 }] }),
  // dimension-stack
  (r) => ({ frame: "none", children: [{ type: "brandLine" }, { type: "eyebrow" }, { type: "coordReadout", gapBefore: 6 }, { type: "dimension", gapBefore: 14 }, { type: "serialLine", gapBefore: 8 }] }),
  // sys-pills
  (r) => ({ frame: "none", children: [{ type: "brandLine" }, { type: "eyebrow" }, heroSpec(r, 68), { type: "pillRow", gapBefore: 12 }, { type: "statusLine", gapBefore: 8 }] }),
];

function compose(r, opts) {
  opts = opts || {};
  const t = opts.banner
    ? (r) => ({ frame: "corners", align: "center", children: [{ type: "brandLine" }, { type: "eyebrow", gapBefore: 16 }, heroSpec(r, 96), { type: "pillRow", gapBefore: 14 }] })
    : r.pick(TEMPLATES);
  const rec = t(r);
  rec.align = rec.align || "top";
  return rec;
}

/* ------------------------------------------------------------------ *
 *  RENDER                                                            *
 * ------------------------------------------------------------------ */
function applyTheme(th) {
  S.ink = th.ink; S.bg = th.bg; S.mono = MONO; S.disp = DISPLAY[0]; S.erode = th.erode;
}

function defsFor(seed, th) {
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

function frameAssemble(inkSvg, w, h, seed, th) {
  return defsFor(seed, th) +
    R(0, 0, w, h, { fill: th.bg, sw: 0 }) +
    '<g filter="url(#warp)">' + inkSvg + "</g>" +
    R(0, 0, w, h, { fill: "#000", sw: 0, opacity: th.grain }).replace('fill="#000"', 'fill="#000" filter="url(#grain)"');
}

// one self-contained card (used by card/banner modes and poster cells)
function renderCard(r, w, h, th, rec, pad) {
  pad = pad == null ? 40 : pad;
  const zoneW = w - pad * 2;
  const body = draw({ x: pad, y: 0, w: zoneW, r: r }, { type: "stack", children: rec.children, gap: rec.gap });
  let offY = pad;
  if (rec.align === "center") offY = Math.max(pad, (h - body.h) / 2);
  const ink = FRAMES[rec.frame || "none"](w, h) + '<g transform="translate(0,' + offY + ')">' + body.svg + "</g>";
  return { svg: ink, contentH: body.h + offY + pad };
}

function generate(opts) {
  opts = opts || {};
  const seed = (opts.seed == null ? Math.floor(Math.random() * 4294967296) : opts.seed) >>> 0;
  const r = makeRng(seed);
  const themeName = (!opts.theme || opts.theme === "auto") ? r.pick(THEME_KEYS) : opts.theme;
  const th = THEMES[themeName] || THEMES.gray;
  applyTheme(th);
  const mode = opts.mode || "card";

  let W, H, ink;
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

function renderPoster(r, W, H, th) {
  const pad = 44, cols = 3, gap = 42;
  const colW = (W - pad * 2 - gap * (cols - 1)) / cols;
  const colH = new Array(cols).fill(pad);
  const cells = [];
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

/* ------------------------------------------------------------------ *
 *  Export helpers                                                    *
 * ------------------------------------------------------------------ */
function standalone(gen, scale) {
  scale = scale || 1;
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + gen.w * scale + '" height="' + gen.h * scale +
    '" viewBox="0 0 ' + gen.w + " " + gen.h + '">' + gen.inner + "</svg>";
}

/* ------------------------------------------------------------------ *
 *  Public API                                                        *
 * ------------------------------------------------------------------ */
const MicroGfx = {
  generate: generate,
  standalone: standalone,
  makeRng: makeRng,
  themes: THEMES,
  themeKeys: THEME_KEYS,
  elements: EL,
  marks: MARKS,
  frames: FRAMES,
  templates: TEMPLATES,
  compose: compose,
};

root.MicroGfx = MicroGfx;
if (typeof module !== "undefined" && module.exports) module.exports = MicroGfx;

})(typeof window !== "undefined" ? window : globalThis);
