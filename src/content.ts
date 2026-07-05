/* Content pools — the text/number/glyph vocabulary the elements draw from.
 * Every generator is a pure function of the rng, so output stays seed-stable. */
import type { Rng } from "./types";

export const CO_A = ["CARGO", "SUMMIT", "AXIOM", "NUCLEUS", "COBALT", "DELTA", "RADIAN", "MERIDIAN", "HELIX", "ATLAS", "APEX", "NOVA", "VECTOR"];
export const CO_B = ["INDUSTRIES", "SYSTEMS", "DIVISION", "ENGINEERING", "STUDIO", "WORKS", "LABS", "OFFICE"];

export const PILL: ((r: Rng) => string)[] = [
  (r) => "BUILD " + r.int(1, 999),
  (r) => "TOOLS",
  (r) => "TXT2IMG",
  (r) => "V" + r.int(1, 5) + "." + r.int(0, 9),
  (r) => "Y " + r.int(2023, 2029),
  (r) => "REV " + String.fromCharCode(65 + r.int(0, 25)),
];

export const EYE: ((r: Rng) => string)[] = [
  () => "ACCESS GRANTED", () => "ACCESS LOCKED", () => "ACCESS PENDING",
  () => "INPUT VERIFIED / OUTPUT OK", () => "COPY OF RECORD",
  (r) => "STATUS > " + r.pick(["FAULT", "ONLINE", "SEALED", "IDLE", "PASSED", "REJECT", "STANDBY", "DECLASSIFIED", "INDEXED", "OFFLINE"]),
  (r) => r.pick(["FAULT", "DECLASSIFIED", "SEALED", "ONLINE", "INDEXED", "OFFLINE", "STANDBY"]) + " // PORT " + r.int(10, 999),
];

export const WORDS = ["CONFIG", "CORE", "SYS", "CONTROL UNIT", "CARGO BAY", "TECHNICAL TESTING", "FIELD STATION",
  "DATA SYSTEMS", "OPERATIONS LAB", "DIGITAL FARM", "AUTONOMOUS UNITS", "VECTOR PATH", "SPEC UNIT CARD", "TEST DATA LABEL"];
export const KANJI = ["信号", "演算", "電源", "制御", "検証", "起動", "接続", "同期", "記録", "制御方式", "接続同期", "起動接続", "解析アクセス"];

export const HEXW = (r: Rng) => "0X" + Array.from({ length: r.int(2, 4) }, () => "0123456789ABCDEF"[r.int(0, 15)]).join("");
export const VERW = (r: Rng) => "V" + r.int(2, 9);
export const NUMW = (r: Rng) => r.pick(["007", String(r.int(0, 999)).padStart(4, "0"), String(r.int(100, 999))]);

export const HEX = (r: Rng, n?: number) => Array.from({ length: n || r.int(4, 6) }, () => "0123456789ABCDEF"[r.int(0, 15)]).join("");
export const LET = (r: Rng, n: number) => Array.from({ length: n }, () => String.fromCharCode(65 + r.int(0, 25))).join("");
export const serial = (r: Rng) => "SN " + LET(r, 4) + "-" + r.int(1000, 9999) + "-" + LET(r, 3);
export const coord = (r: Rng) => r.int(10, 180) + "." + r.int(10, 99) + " / " + r.int(10, 180) + "." + r.int(10, 99) + " / " + r.int(100, 999) + "." + r.int(10, 99);

export const TABLE_LABELS = ["SKU", "PART", "QC", "LOT", "REV", "CFG", "SPEC", "TEST", "UNIT", "CASE", "DOC", "VOL", "ID", "REF"];
export const METRICS = ["LOSS", "POWER", "LOAD", "TEMP", "VOLT", "FREQ", "LAT"];

export function metricVal(label: string, r: Rng): string {
  switch (label) {
    case "LOSS": case "POWER": case "LOAD": return r.int(0, 99) + (r.chance(.3) ? "." + r.int(0, 9) : "") + "%";
    case "TEMP": return r.int(15, 99) + "°C";
    case "VOLT": return (r.chance(.5) ? r.int(2, 48) : r.int(2, 12) + "." + r.int(0, 9)) + "V";
    case "FREQ": return r.int(20, 999) + "HZ";
    case "LAT":  return r.int(1, 99) + "MS";
    default:     return String(r.int(2, 99));
  }
}

export const tableCell = (r: Rng): string => r.chance(.5)
  ? r.pick(TABLE_LABELS) + " " + (r.chance(.5) ? LET(r, 1) + r.int(0, 9) : r.int(10, 99))
  : (function () { const m = r.pick(METRICS); return m + " " + metricVal(m, r); })();

export const READOUTS: ((r: Rng) => string)[] = [
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

export const FOOTER_R = ["UPLINK STABLE", "SIGNAL LOCKED", "STANDBY MODE", "NO FAULT", "TRACE CLEAR", "AWAITING SYNC"];
