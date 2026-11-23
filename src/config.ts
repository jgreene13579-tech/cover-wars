// Screen is 640x360 (16:9). The battlefield is drawn at 2x so every art
// pixel is a chunky 2x2 block; HUD text uses an 8px pixel font at 1x.
export const GAME_W = 640;
export const GAME_H = 360;
/** The canvas is drawn at this multiple of 640x360 so small text keeps every pixel. Layout stays in 640x360 units. */
export const RES = 2;
export const TILE = 16;
export const WS = 2; // world scale
export const MAP_COLS = 20;
export const MAP_ROWS = 9;
export const HUD_Y = MAP_ROWS * TILE * WS; // 288
export const FONT = '"Press Start 2P", monospace';

export const COLORS = {
  bg: 0x0b0710,
  panel: 0x161022,
  panelHi: 0x2a1f40,
  border: 0x4a3a6a,
  pink: 0xff4fa3,
  cyan: 0x4fe3ff,
  gold: 0xffd34f,
  red: 0xff4f4f,
  green: 0x6dff7a,
  gray: 0xa398bc, // bright enough to read on the dark panels
  white: 0xffffff,
};

export const css = (n: number) => '#' + n.toString(16).padStart(6, '0');
