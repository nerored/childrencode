/**
 * Stage3D palettes.
 *
 * Pure data only: no three.js import, every color is a 0xRRGGBB number so the
 * model builders and the renderer can consume the theme without touching a
 * WebGL context.
 */

/** Landmark model used by a scene's decorative centerpiece. */
export type LandmarkKind = "windmill" | "tidegate" | "gears" | "lantern";

/** Every color and scale a Stage3D scene needs, keyed by scene. */
export interface StageTheme {
  id: string;
  sceneId: string;
  name: string;
  sky: number;
  fog: number;
  iceTop: number;
  iceSide: number;
  iceEdge: number;
  snow: number;
  waterTop: number;
  waterDeep: number;
  bridge: number;
  pineDark: number;
  pineLight: number;
  trunk: number;
  rock: number;
  igloo: number;
  iglooDoor: number;
  coder: number;
  coderVisor: number;
  penguinBody: number;
  penguinBelly: number;
  penguinBeak: number;
  metal: number;
  wood: number;
  accent: number;
  glow: number;
  landmark: LandmarkKind;
  landmarkScale: number;
}

/** 风车原野 — snowy meadow with a wooden windmill. */
const WINDMILL_THEME: StageTheme = {
  id: "windmill",
  sceneId: "s01",
  name: "风车原野",
  sky: 0xbcd8e8,
  fog: 0xd8e9f2,
  iceTop: 0xdceef7,
  iceSide: 0xa6cbdc,
  iceEdge: 0x79aec4,
  snow: 0xf5fbff,
  waterTop: 0x5aa6c2,
  waterDeep: 0x1e6580,
  bridge: 0xa97747,
  pineDark: 0x27584a,
  pineLight: 0x3c7a5e,
  trunk: 0x6a4a30,
  rock: 0x8a98a4,
  igloo: 0xeef7fc,
  iglooDoor: 0x28394a,
  coder: 0x4a7196,
  coderVisor: 0x93e6ff,
  penguinBody: 0x1c2733,
  penguinBelly: 0xf2f8fb,
  penguinBeak: 0xe08a2e,
  metal: 0x7f92a2,
  wood: 0x8a5a36,
  accent: 0x5b8fb0,
  glow: 0xffb45e,
  landmark: "windmill",
  landmarkScale: 1,
};

/** 潮汐回廊 — turquoise ice coast with a tide gate. */
const TIDE_THEME: StageTheme = {
  id: "tide",
  sceneId: "s02",
  name: "潮汐回廊",
  sky: 0x9fd6dd,
  fog: 0xc3ebef,
  iceTop: 0xd0f0ef,
  iceSide: 0x8fc9cd,
  iceEdge: 0x5aa3ab,
  snow: 0xf1fbfb,
  waterTop: 0x36b3b7,
  waterDeep: 0x0b5d6b,
  bridge: 0x9a6b3f,
  pineDark: 0x1f5a55,
  pineLight: 0x2f7d72,
  trunk: 0x5c3f2c,
  rock: 0x7d939b,
  igloo: 0xe6f6f7,
  iglooDoor: 0x203a44,
  coder: 0x3f7f8a,
  coderVisor: 0x8ff2ff,
  penguinBody: 0x1a2630,
  penguinBelly: 0xeff9fb,
  penguinBeak: 0xe8862c,
  metal: 0x6f8d92,
  wood: 0x855733,
  accent: 0x3a9b9f,
  glow: 0xffc46b,
  landmark: "tidegate",
  landmarkScale: 1.05,
};

/** 齿轮工坊 — steel and copper workshop with interlocking gears. */
const GEARS_THEME: StageTheme = {
  id: "gears",
  sceneId: "s03",
  name: "齿轮工坊",
  sky: 0x8ea6bd,
  fog: 0xbfd0dd,
  iceTop: 0xc9d7e2,
  iceSide: 0x94a8b8,
  iceEdge: 0x6a8094,
  snow: 0xeef4f9,
  waterTop: 0x527f96,
  waterDeep: 0x24455c,
  bridge: 0xb5763f,
  pineDark: 0x2b4a52,
  pineLight: 0x3d6470,
  trunk: 0x5b3d2b,
  rock: 0x7b7f86,
  igloo: 0xe4ecf3,
  iglooDoor: 0x2b3440,
  coder: 0x4c6b84,
  coderVisor: 0x9ff0ff,
  penguinBody: 0x1b2730,
  penguinBelly: 0xf0f6fa,
  penguinBeak: 0xe58a2d,
  metal: 0x8a97a5,
  wood: 0x9a6238,
  accent: 0xb87333,
  glow: 0xffb347,
  landmark: "gears",
  landmarkScale: 1.1,
};

/** 雾林岔路 — deep teal mist forest with a floating lantern post. */
const MIST_THEME: StageTheme = {
  id: "mist",
  sceneId: "s04",
  name: "雾林岔路",
  sky: 0x2f5560,
  fog: 0x3d6b74,
  iceTop: 0x93b9bd,
  iceSide: 0x6a9398,
  iceEdge: 0x4c747b,
  snow: 0xdcf0ee,
  waterTop: 0x2c7c82,
  waterDeep: 0x123f4a,
  bridge: 0x7b5636,
  pineDark: 0x1b3f42,
  pineLight: 0x2b5c58,
  trunk: 0x4c3528,
  rock: 0x66757a,
  igloo: 0xd7e8ea,
  iglooDoor: 0x1c2e33,
  coder: 0x3c6b6b,
  coderVisor: 0x94f0e0,
  penguinBody: 0x17232b,
  penguinBelly: 0xe9f5f3,
  penguinBeak: 0xe07f2a,
  metal: 0x6b7c80,
  wood: 0x6f4c30,
  accent: 0x3f8f82,
  glow: 0xffc866,
  landmark: "lantern",
  landmarkScale: 1,
};

/** Fallback theme (and the s01 palette) used when a scene has no stage theme. */
export const DEFAULT_THEME: StageTheme = WINDMILL_THEME;

const THEMES: Record<string, StageTheme> = {
  s01: WINDMILL_THEME,
  s02: TIDE_THEME,
  s03: GEARS_THEME,
  s04: MIST_THEME,
};

/** Resolve a scene palette; unknown scene ids fall back to {@link DEFAULT_THEME}. */
export function stageTheme(sceneId: string): StageTheme {
  return THEMES[sceneId] ?? DEFAULT_THEME;
}
