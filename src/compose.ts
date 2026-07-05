/* COMPOSE — the grammar. A template is a function of the rng that returns a
 * recipe (children to stack + framing hints). Add a template to extend. */
import type { Rng, Recipe, Spec } from "./types";

function heroSpec(r: Rng, max?: number): Spec { return { type: "bigDisplay", max: max || 72 }; }

export const TEMPLATES: ((r: Rng) => Recipe)[] = [
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

export function compose(r: Rng, opts?: { banner?: boolean }): Recipe {
  opts = opts || {};
  const t = opts.banner
    ? (r: Rng): Recipe => ({ frame: "corners", align: "center", children: [{ type: "brandLine" }, { type: "eyebrow", gapBefore: 16 }, heroSpec(r, 96), { type: "pillRow", gapBefore: 14 }] })
    : r.pick(TEMPLATES);
  const rec = t(r);
  rec.align = rec.align || "top";
  return rec;
}
