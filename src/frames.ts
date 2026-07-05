/* FRAMES — outer decorations drawn around a whole card. */
import { R, L } from "./svg";

export const FRAMES: Record<string, (w: number, h: number) => string> = {
  none: () => "",
  full: (w, h) => R(22, 22, w - 44, h - 44, { sw: 1.6 }),
  corners: (w, h) => {
    const m = 24, len = Math.min(46, w * .1);
    const bracket = (x: number, y: number, dx: number, dy: number) =>
      L(x, y, x + dx * len, y, { w: 1.6 }) + L(x, y, x, y + dy * len, { w: 1.6 });
    return bracket(m, m, 1, 1) + bracket(w - m, m, -1, 1) + bracket(m, h - m, 1, -1) + bracket(w - m, h - m, -1, -1);
  },
};
