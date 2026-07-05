/* Text measurement — real canvas in the browser, estimate in node. */

let _mctx: CanvasRenderingContext2D | null = null;

export function textWidth(str: string | number, px: number, family: string, weight?: number): number {
  weight = weight || 400;
  if (typeof document !== "undefined") {
    if (!_mctx) _mctx = document.createElement("canvas").getContext("2d");
    _mctx!.font = weight + " " + px + "px " + family;
    return _mctx!.measureText(String(str)).width;
  }
  let w = 0;                          // node fallback: CJK ~1em, latin ~0.58em
  for (const ch of String(str)) w += /[⺀-鿿＀-￯]/.test(ch) ? px : px * 0.58;
  return w;
}

export const isCJK = (s: string): boolean => /[⺀-鿿＀-￯]/.test(s);

// largest font size at which `str` fits `maxW`, capped at `cap`
export function fitSize(str: string, maxW: number, cap: number, family: string, weight?: number): number {
  const w = textWidth(str, cap, family, weight);
  return w <= maxW ? cap : Math.max(8, cap * maxW / w);
}
