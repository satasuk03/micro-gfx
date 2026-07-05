/* Drawing state + SVG primitives. `S` is the shared, theme-mutated drawing
 * state that every primitive reads (ink/bg colour, active fonts, erode flag). */
import type { StyleOpts } from "./types";
import { textWidth } from "./text";

export const S = { ink: "#000", bg: "#fff", mono: "", disp: "", erode: false };

export const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";
export const DISPLAY = [
  "'Arial Narrow',Impact,'Franklin Gothic',sans-serif",   // condensed grotesque
  "'Helvetica Neue',Helvetica,Arial,sans-serif",          // grotesque
  MONO,                                                    // heavy mono
];
export const CJK = "'Hiragino Kaku Gothic ProN','PingFang SC','Noto Sans CJK SC','Microsoft YaHei',sans-serif";

export const esc = (s: string | number): string =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function T(x: number, y: number, str: string | number, o?: StyleOpts): string {
  o = o || {};
  const size = o.size || 14, family = o.family || S.mono, weight = o.weight || 400;
  return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" text-anchor="' + (o.anchor || "start") +
    '" letter-spacing="' + (o.spacing || 0) + '" font-weight="' + weight + '" fill="' + (o.color || S.ink) +
    '" opacity="' + (o.opacity == null ? 1 : o.opacity) + '" font-family="' + family + '">' + esc(str) + "</text>";
}

export function L(x1: number, y1: number, x2: number, y2: number, o?: StyleOpts): string {
  o = o || {};
  return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + (o.color || S.ink) +
    '" stroke-width="' + (o.w || 1.5) + '" stroke-dasharray="' + (o.dash || "") + '" stroke-linecap="' + (o.cap || "butt") +
    '" opacity="' + (o.opacity == null ? 1 : o.opacity) + '"/>';
}

export function R(x: number, y: number, w: number, h: number, o?: StyleOpts): string {
  o = o || {};
  return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (o.rx || 0) +
    '" fill="' + (o.fill || "none") + '" stroke="' + (o.stroke || (o.fill ? "none" : S.ink)) +
    '" stroke-width="' + (o.sw == null ? 1.5 : o.sw) + '" opacity="' + (o.opacity == null ? 1 : o.opacity) + '"/>';
}

export function C(cx: number, cy: number, r: number, o?: StyleOpts): string {
  o = o || {};
  return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + (o.fill || "none") +
    '" stroke="' + (o.stroke || (o.fill ? "none" : S.ink)) + '" stroke-width="' + (o.sw == null ? 1.5 : o.sw) +
    '" opacity="' + (o.opacity == null ? 1 : o.opacity) + '"/>';
}

export function P(d: string, o?: StyleOpts): string {
  o = o || {};
  return '<path d="' + d + '" fill="' + (o.fill || "none") + '" stroke="' + (o.stroke || (o.fill ? "none" : S.ink)) +
    '" stroke-width="' + (o.sw == null ? 1.5 : o.sw) + '" stroke-linejoin="round" stroke-linecap="round" opacity="' +
    (o.opacity == null ? 1 : o.opacity) + '"/>';
}

// wrap heavy fills in the erosion filter (screen-print grain) when enabled
export const ER = (svg: string): string => S.erode ? '<g filter="url(#erode)">' + svg + "</g>" : svg;

// spaced text justified to fill a width  (returns svg only; caller owns h)
export function spaced(x: number, y: number, str: string, w: number, o?: StyleOpts): string {
  o = o || {};
  const size = o.size || 11, weight = o.weight || 400;
  const base = textWidth(str, size, S.mono, weight);
  const n = Math.max(str.length - 1, 1);
  let sp = (w - base) / n;
  if (sp < 0) sp = 0;
  return T(x, y, str, { size: size, spacing: sp, weight: weight, color: o.color });
}
