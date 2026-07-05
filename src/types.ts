/* Shared types for MicroGfx. The strict contracts live here; the recursive
 * spec-grammar (`Spec`) stays intentionally loose — typing every element's
 * optional fields fully would cost far more than it catches. */

/** Seeded PRNG. Same seed => identical stream. */
export interface Rng {
  next(): number;
  float(a: number, b: number): number;
  int(a: number, b: number): number;
  pick<T>(a: T[]): T;
  chance(p: number): boolean;
  weighted<T>(pairs: [T, number][]): T;
  shuffle<T>(arr: T[]): T[];
}

/** A palette + hand-drawn filter tuning. */
export interface Theme {
  bg: string;
  ink: string;
  erode: boolean;
  grain: number;
  warp: number;
}

/** Options bag shared by every SVG primitive (T/L/R/C/P/spaced). */
export interface StyleOpts {
  size?: number;
  family?: string;
  weight?: number;
  anchor?: string;
  spacing?: number;
  color?: string;
  opacity?: number;
  w?: number;
  dash?: string;
  cap?: string;
  rx?: number;
  fill?: string;
  stroke?: string;
  sw?: number;
}

/** A node in the composition grammar: a `type` plus arbitrary element opts. */
export interface Spec {
  type: string;
  gapBefore?: number;
  [key: string]: unknown;
}

/** A recipe produced by a template: the children to stack + framing hints. */
export interface Recipe {
  frame?: string;
  align?: string;
  gap?: number;
  children: Spec[];
}

/** Every element resolves to raw SVG and the vertical space it consumed. */
export interface ElementResult {
  svg: string;
  h: number;
}

/** Context handed to an element: its box + the rng + its own spec (`opts`). */
export interface Ctx {
  x: number;
  y: number;
  w: number;
  r: Rng;
  // deliberately loose — element bodies read many optional spec fields.
  opts: any;
}

/** A self-measuring drawable component. */
export type ElementFn = (ctx: Ctx) => ElementResult;

export interface GenerateOpts {
  mode?: "card" | "banner" | "poster";
  theme?: string;
  seed?: number;
}

export interface Generated {
  inner: string;
  w: number;
  h: number;
  seed: number;
  theme: string;
}
