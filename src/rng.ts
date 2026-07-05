/* PRNG — mulberry32. Same seed => identical graphic. */
import type { Rng } from "./types";

export function makeRng(seed: number): Rng {
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
