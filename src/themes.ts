/* THEMES — palette + hand-drawn filter tuning. Extend by adding an entry. */
import type { Theme } from "./types";

export const THEMES: Record<string, Theme> = {
  gray:   { bg: "#3d3d3b", ink: "#e9e6dc", erode: true,  grain: .05, warp: 2.2 },
  orange: { bg: "#d1783f", ink: "#f4ede0", erode: true,  grain: .06, warp: 2.6 },
  cream:  { bg: "#efe9d7", ink: "#26231d", erode: true,  grain: .05, warp: 2.4 },
  acid:   { bg: "#0c0d0a", ink: "#d7e84a", erode: true,  grain: .04, warp: 2.4 },
  lav:    { bg: "#c7c6cf", ink: "#1b1b1e", erode: true,  grain: .05, warp: 2.6 },
  olive:  { bg: "#8b9184", ink: "#282c22", erode: false, grain: .05, warp: 2.6 },
  steel:  { bg: "#99a0a4", ink: "#22282b", erode: false, grain: .05, warp: 2.6 },
  sand:   { bg: "#b8ac93", ink: "#38311f", erode: false, grain: .05, warp: 2.6 },
};

export const THEME_KEYS = Object.keys(THEMES);
