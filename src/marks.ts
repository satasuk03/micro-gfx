/* Brand marks + icons — small vector glyphs, drawn clean (no warp of their own). */
import { P, C, L, R, T, S } from "./svg";

export const MARKS: Record<string, (cx: number, cy: number, s: number) => string> = {
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

export const MARK_KEYS = Object.keys(MARKS);
export const ICON_KEYS = ["target", "cross", "warn", "diamond", "sun", "bolt", "rcirc", "xbox", "concentric", "grid"];
