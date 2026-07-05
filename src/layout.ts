/* LAYOUT containers — also elements, so composition is fully recursive.
 * `draw` dispatches a spec to its registered element; `stack` / `row` flow
 * children and are registered onto the same `EL` object the leaves use. */
import type { Rng, Spec, ElementResult } from "./types";
import { EL } from "./elements";

export function draw(ctx: { x: number; y: number; w: number; r: Rng }, spec: Spec): ElementResult {
  const fn = EL[spec.type];
  if (!fn) throw new Error("unknown element: " + spec.type);
  return fn({ x: ctx.x, y: ctx.y, w: ctx.w, r: ctx.r, opts: spec });
}

EL.stack = function (ctx) {
  const children = ctx.opts.children, gap = ctx.opts.gap == null ? 14 : ctx.opts.gap;
  let cur = ctx.y, svg = "";
  children.forEach((ch: Spec, i: number) => {
    if (i) cur += (ch.gapBefore == null ? gap : ch.gapBefore);
    const res = draw({ x: ctx.x, y: cur, w: ctx.w, r: ctx.r }, ch);
    svg += res.svg; cur += res.h;
  });
  return { svg: svg, h: cur - ctx.y };
};

EL.row = function (ctx) {
  const children = ctx.opts.children, gap = ctx.opts.gap == null ? 20 : ctx.opts.gap;
  const fixed = children.reduce((s: number, c: any) => s + (c.width || 0), 0);
  const flexCount = children.filter((c: any) => !c.width).length;
  const flexW = flexCount ? (ctx.w - fixed - gap * (children.length - 1)) / flexCount : 0;
  let x = ctx.x, svg = "", maxh = 0;
  for (const c of children) {
    const w = c.width || flexW;
    const res = draw({ x: x, y: ctx.y, w: w, r: ctx.r }, c.spec);
    svg += res.svg; maxh = Math.max(maxh, res.h); x += w + gap;
  }
  return { svg: svg, h: maxh };
};
