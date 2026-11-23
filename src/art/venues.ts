import Phaser from 'phaser';
import { rng } from './pixel';
import type { TileType } from '../tactics/Grid';

// Each venue is a Theme: colours + styles for floors, walls, the stage and a
// wall decoration. Cover props (tables, trees, kegs...) are drawn on top of
// the venue's own floor so they blend into every level.

type Ctx = CanvasRenderingContext2D;
export type FloorStyle = 'yard' | 'lino' | 'planks' | 'grass' | 'concrete' | 'tile' | 'checker' | 'gym' | 'trippy' | 'carpet';
export type WallStyle = 'brick' | 'panel' | 'siding' | 'block' | 'hedge' | 'trippy';
export type Decor = 'neon' | 'eagle' | 'flag' | 'window' | 'bulb' | 'poster' | 'banner' | 'eye' | 'bird' | 'tv' | 'lamp';

export interface Theme {
  id: string;
  floor: { style: FloorStyle; c: string[] };
  floor2: { style: FloorStyle; c: string[] };
  wall: { style: WallStyle; c: string[] };
  stage: string[]; // base, seam, sparkle, sparkle
  decor: Decor;
  /** tint laid over the whole map (basement gloom, purple club light...) */
  light?: { color: number; alpha: number };
  /** colour-cycling overlay for Healer */
  trippy?: boolean;
  /** drifting disco-ball light spots */
  disco?: boolean;
}

export const THEMES: Record<string, Theme> = {
  // Eagles Lodge: pale green-gray block walls, glossy cream linoleum, a low
  // gray carpeted riser with flags, round tables, folding tables, a disco ball.
  lodge: {
    id: 'lodge',
    floor: { style: 'lino', c: ['#d6cfbc', '#c2baa6', '#ece6d6'] },
    floor2: { style: 'lino', c: ['#cfc7b2', '#b8b09a', '#f6f0e0'] },
    wall: { style: 'block', c: ['#a9b4a2', '#86907e', '#bcc6b4'] },
    stage: ['#54545c', '#46464e', '#606068', '#6a6a72'],
    decor: 'flag',
    disco: true,
  },
  reef: {
    id: 'reef',
    floor: { style: 'yard', c: ['#4a7a34', '#365e26', '#7a6a44'] },
    floor2: { style: 'concrete', c: ['#8a8a86', '#6a6a66', '#a4a4a0'] },
    wall: { style: 'siding', c: ['#c8b89a', '#a8987a', '#e0d4b8'] },
    stage: ['#7a5230', '#5c3a20', '#ffd34f', '#ff4fa3'],
    decor: 'window',
    light: { color: 0xff8a3a, alpha: 0.08 },
  },
  blockhouse: {
    id: 'blockhouse',
    floor: { style: 'concrete', c: ['#5a5a5e', '#3e3e44', '#6e6e74'] },
    floor2: { style: 'carpet', c: ['#5a2a2a', '#3a1a1a', '#7a3a3a'] },
    wall: { style: 'block', c: ['#7a7a70', '#4a4a44', '#8a8a80'] },
    stage: ['#6a5a40', '#4a3e2c', '#ffd34f', '#ff4fa3'],
    decor: 'bulb',
    light: { color: 0x000010, alpha: 0.28 },
  },
  bishop: {
    id: 'bishop',
    floor: { style: 'planks', c: ['#3a2a22', '#2a1c16', '#4a3a2e'] },
    floor2: { style: 'checker', c: ['#1a1a24', '#0e0e14', '#a8a8b0'] },
    wall: { style: 'brick', c: ['#2a2430', '#16121c', '#3a3444', '#0e0a12'] },
    stage: ['#231d33', '#2f2745', '#4fe3ff', '#ff4fa3'],
    decor: 'poster',
    light: { color: 0x200030, alpha: 0.12 },
  },
  hoosierdome: {
    id: 'hoosierdome',
    floor: { style: 'concrete', c: ['#2e2a36', '#1e1a26', '#3e3a46'] },
    floor2: { style: 'planks', c: ['#4a3022', '#33201a', '#5a3e2e'] },
    wall: { style: 'brick', c: ['#5e2a27', '#2e1515', '#7a3a33', '#241010'] },
    stage: ['#231d33', '#2f2745', '#4fe3ff', '#ff4fa3'],
    decor: 'neon',
    light: { color: 0x2a0a40, alpha: 0.12 },
  },
  bumfights: {
    id: 'bumfights',
    floor: { style: 'gym', c: ['#c89a5a', '#a87a3a', '#e0b470'] },
    floor2: { style: 'gym', c: ['#3a6ab0', '#2a4a80', '#4a7ac0'] },
    wall: { style: 'block', c: ['#c8c0a8', '#9a9480', '#d8d0b8'] },
    stage: ['#3a3a44', '#2a2a34', '#ffd34f', '#ffffff'],
    decor: 'banner',
  },
  healer: {
    id: 'healer',
    floor: { style: 'trippy', c: ['#2c1440', '#24184c', '#1e2450', '#2a1a44'] },
    floor2: { style: 'trippy', c: ['#3a1a5e', '#4a1e6e', '#6a2a7e', '#32145a'] },
    wall: { style: 'trippy', c: ['#2a1450', '#6a2a8a', '#2a5a7a', '#7a5a2a'] },
    stage: ['#1a1030', '#3a2a6a', '#6dff7a', '#ffd34f'],
    decor: 'eye',
    trippy: true,
  },
  bluebird: {
    id: 'bluebird',
    floor: { style: 'checker', c: ['#1a1a24', '#0e0e14', '#7a7a88'] },
    floor2: { style: 'planks', c: ['#5a3a26', '#43291a', '#6b4630'] },
    wall: { style: 'brick', c: ['#2a3a5a', '#16203a', '#3a4a6a', '#0e1428'] },
    stage: ['#231d33', '#2f2745', '#4fa3ff', '#ffffff'],
    decor: 'bird',
    light: { color: 0x10204a, alpha: 0.12 },
  },
  kilroys: {
    id: 'kilroys',
    floor: { style: 'planks', c: ['#6a4426', '#4a2e18', '#8a5a34'] },
    floor2: { style: 'carpet', c: ['#1e4a2e', '#123a20', '#2e6a3e'] },
    wall: { style: 'panel', c: ['#3a2a1e', '#24180e', '#4a3a2a', '#d8344a'] },
    stage: ['#231d33', '#2f2745', '#ffd34f', '#d8344a'],
    decor: 'tv',
  },
  park: {
    id: 'park',
    floor: { style: 'grass', c: ['#4a9a3a', '#3a7a2a', '#6aba4a', '#ffffff'] },
    floor2: { style: 'tile', c: ['#a0786a', '#7a5a4e', '#b8908a'] },
    wall: { style: 'hedge', c: ['#2e5a28', '#1e4a1a', '#4a8a3a'] },
    stage: ['#c8c0b0', '#a8a090', '#ffd34f', '#4fe3ff'],
    decor: 'lamp',
  },
};

const px = (c: Ctx, color: string, x: number, y: number, w = 1, h = 1) => {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
};

// ---------------------------------------------------------------- floors

function drawFloor(c: Ctx, style: FloorStyle, k: string[], seed: number) {
  const r = rng(seed);
  switch (style) {
    case 'planks':
    case 'gym':
      px(c, k[0], 0, 0, 16, 16);
      for (let row = 0; row < 4; row++) {
        px(c, k[1], 0, row * 4 + 3, 16, 1);
        px(c, k[1], Math.floor(r() * 14) + 1, row * 4, 1, 3);
        px(c, k[2], Math.floor(r() * 16), row * 4 + Math.floor(r() * 3));
        if (style === 'planks') px(c, k[2], Math.floor(r() * 16), row * 4 + Math.floor(r() * 3));
        else px(c, k[2], Math.floor(r() * 12), row * 4 + 1, 4, 1); // varnish shine
      }
      break;
    case 'yard': // trampled party lawn: dirt patches, red cups, crushed cans
      px(c, k[0], 0, 0, 16, 16);
      for (let i = 0; i < 12; i++) px(c, k[1], Math.floor(r() * 16), Math.floor(r() * 15), 1, 2);
      if (r() < 0.5) { const x = Math.floor(r() * 10), y = Math.floor(r() * 10); px(c, k[2], x, y, 5, 3); px(c, k[2], x + 1, y + 3, 3, 1); }
      if (r() < 0.55) { const x = Math.floor(r() * 13) + 1, y = Math.floor(r() * 13) + 1; px(c, '#d8344a', x, y, 2, 1); px(c, '#ffffff', x + 2, y); }
      if (r() < 0.3) px(c, '#c8ccd8', Math.floor(r() * 14) + 1, Math.floor(r() * 14) + 1, 2, 1);
      break;
    case 'grass':
      px(c, k[0], 0, 0, 16, 16);
      for (let i = 0; i < 14; i++) px(c, k[1], Math.floor(r() * 16), Math.floor(r() * 15), 1, 2);
      for (let i = 0; i < 8; i++) px(c, k[2], Math.floor(r() * 16), Math.floor(r() * 16));
      if (k[3] && r() < 0.3) px(c, k[3], Math.floor(r() * 14) + 1, Math.floor(r() * 14) + 1);
      break;
    case 'lino': // glossy linoleum squares with ceiling-light shine
      px(c, k[0], 0, 0, 16, 16);
      px(c, k[1], 0, 15, 16, 1); px(c, k[1], 15, 0, 1, 16);
      for (let i = 0; i < 4; i++) px(c, k[1], Math.floor(r() * 15), Math.floor(r() * 15));
      if (r() < 0.45) { const y = Math.floor(r() * 12) + 2; px(c, k[2], 2, y, 8, 1); px(c, k[2], 4, y + 1, 5, 1); }
      break;
    case 'concrete':
      px(c, k[0], 0, 0, 16, 16);
      for (let i = 0; i < 10; i++) px(c, r() < 0.5 ? k[1] : k[2], Math.floor(r() * 16), Math.floor(r() * 16));
      if (r() < 0.35) {
        let x = Math.floor(r() * 10) + 3, y = 0;
        while (y < 16) { px(c, k[1], x, y); y++; if (r() < 0.4) x += r() < 0.5 ? -1 : 1; if (r() < 0.25) break; }
      }
      break;
    case 'tile':
      for (let ty = 0; ty < 2; ty++)
        for (let tx = 0; tx < 2; tx++) px(c, (tx + ty) % 2 ? k[0] : k[2], tx * 8, ty * 8, 8, 8);
      px(c, k[1], 0, 7, 16, 1); px(c, k[1], 7, 0, 1, 16);
      px(c, k[1], 0, 15, 16, 1); px(c, k[1], 15, 0, 1, 16);
      if (r() < 0.5) px(c, k[1], Math.floor(r() * 14) + 1, Math.floor(r() * 14) + 1);
      break;
    case 'checker':
      for (let ty = 0; ty < 2; ty++)
        for (let tx = 0; tx < 2; tx++) px(c, (tx + ty) % 2 ? k[0] : k[2], tx * 8, ty * 8, 8, 8);
      px(c, k[1], Math.floor(r() * 16), Math.floor(r() * 16));
      break;
    case 'carpet':
      px(c, k[0], 0, 0, 16, 16);
      for (let y = 0; y < 16; y += 4)
        for (let x = (y / 4) % 2 ? 2 : 0; x < 16; x += 4) { px(c, k[1], x, y); px(c, k[2], x + 1, y + 1); }
      break;
    case 'trippy': {
      const off = Math.floor(r() * k.length);
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const band = Math.floor((x + y + Math.sin((x - y) / 3) * 3 + 40) / 3);
          px(c, k[(band + off) % k.length], x, y);
        }
      if (r() < 0.5) px(c, '#c8a8ff', Math.floor(r() * 16), Math.floor(r() * 16)); // a rare dim sparkle
      break;
    }
  }
}

// ---------------------------------------------------------------- walls

function drawWall(c: Ctx, style: WallStyle, k: string[]) {
  switch (style) {
    case 'brick':
      px(c, k[0], 0, 0, 16, 16);
      for (let row = 0; row < 4; row++) {
        const y = row * 4, off = row % 2 ? 4 : 0;
        px(c, k[1], 0, y + 3, 16, 1);
        for (let x = off; x < 16; x += 8) px(c, k[1], x, y, 1, 3);
        px(c, k[2], off + 1, y, 3, 1);
        px(c, k[2], (off + 9) % 16, y, 3, 1);
      }
      px(c, k[3] ?? k[1], 0, 14, 16, 2);
      break;
    case 'panel':
      px(c, k[0], 0, 0, 16, 16);
      for (let x = 0; x < 16; x += 4) { px(c, k[1], x, 0, 1, 16); px(c, k[2], x + 1, 0, 1, 16); }
      px(c, k[3], 0, 9, 16, 1); // chair rail
      px(c, k[1], 0, 10, 16, 1);
      px(c, k[1], 0, 14, 16, 2);
      break;
    case 'siding':
      px(c, k[0], 0, 0, 16, 16);
      for (let y = 0; y < 16; y += 3) { px(c, k[1], 0, y + 2, 16, 1); px(c, k[2], 0, y, 16, 1); }
      px(c, '#5a4a3a', 0, 14, 16, 2);
      break;
    case 'block':
      px(c, k[0], 0, 0, 16, 16);
      for (let row = 0; row < 3; row++) {
        const y = row * 5, off = row % 2 ? 4 : 0;
        px(c, k[1], 0, y + 4, 16, 1);
        for (let x = off; x < 16; x += 8) px(c, k[1], x, y, 1, 4);
        px(c, k[2], off + 1, y, 5, 1);
      }
      px(c, k[1], 0, 15, 16, 1);
      break;
    case 'hedge': {
      const r = rng(5);
      px(c, k[1], 0, 0, 16, 16);
      for (let i = 0; i < 30; i++) px(c, k[0], Math.floor(r() * 15), Math.floor(r() * 15), 2, 2);
      for (let i = 0; i < 14; i++) px(c, k[2], Math.floor(r() * 16), Math.floor(r() * 14));
      px(c, '#142e10', 0, 15, 16, 1);
      break;
    }
    case 'trippy':
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) px(c, k[Math.floor((y + Math.sin(x / 2.5) * 2.5 + 8) / 4) % k.length], x, y);
      px(c, '#0b0710', 0, 15, 16, 1);
      break;
  }
}

function drawDecor(c: Ctx, d: Decor) {
  switch (d) {
    case 'neon': {
      const p = '#ff4fa3', g = '#ffc2e0', b = '#4fe3ff';
      px(c, b, 2, 2, 12, 1); px(c, b, 2, 11, 12, 1); px(c, b, 2, 2, 1, 10); px(c, b, 13, 2, 1, 10);
      px(c, p, 8, 4, 1, 5); px(c, p, 9, 4, 2, 1); px(c, p, 10, 5, 1, 1);
      px(c, p, 6, 8, 3, 2); px(c, g, 7, 8, 1, 1);
      break;
    }
    case 'flag': // framed American flag
      px(c, '#3a2a1a', 1, 2, 14, 10);
      for (let i = 0; i < 8; i++) px(c, i % 2 ? '#f2f2f2' : '#d8344a', 2, 3 + i, 12, 1);
      px(c, '#2a3a8a', 2, 3, 5, 4); px(c, '#ffffff', 3, 4); px(c, '#ffffff', 5, 4); px(c, '#ffffff', 4, 5);
      break;
    case 'eagle': // gold eagle plaque
      px(c, '#3a2410', 3, 1, 10, 8); px(c, '#5a3a1a', 4, 2, 8, 6);
      px(c, '#ffd34f', 4, 3, 3, 1); px(c, '#ffd34f', 9, 3, 3, 1);
      px(c, '#ffd34f', 5, 4, 6, 1); px(c, '#ffd34f', 7, 5, 2, 2); px(c, '#ffffff', 7, 3, 2, 1);
      break;
    case 'window':
      px(c, '#f2f2f2', 2, 1, 12, 11); px(c, '#ffd38a', 3, 2, 10, 9);
      px(c, '#f2f2f2', 7, 2, 2, 9); px(c, '#f2f2f2', 3, 6, 10, 1);
      px(c, '#fff4c8', 4, 3, 2, 2);
      break;
    case 'bulb':
      px(c, '#1a1a1a', 8, 0, 1, 5);
      px(c, '#fff4b0', 7, 5, 3, 3); px(c, '#ffffff', 8, 6);
      px(c, '#ffd34f', 6, 6); px(c, '#ffd34f', 10, 6); px(c, '#ffd34f', 8, 9);
      break;
    case 'poster':
      px(c, '#0b0710', 3, 1, 10, 12); px(c, '#ff4fa3', 4, 2, 8, 10);
      px(c, '#ffd34f', 5, 3, 6, 2); px(c, '#0b0710', 6, 7, 4, 3); px(c, '#4fe3ff', 5, 11, 6, 1);
      break;
    case 'banner': // championship pennant
      px(c, '#d8344a', 2, 1, 12, 6); px(c, '#d8344a', 4, 7, 8, 2); px(c, '#d8344a', 6, 9, 4, 2); px(c, '#d8344a', 7, 11, 2, 1);
      px(c, '#ffffff', 4, 3, 8, 1); px(c, '#ffd34f', 6, 5, 4, 1);
      break;
    case 'eye':
      px(c, '#ffffff', 3, 5, 10, 5); px(c, '#ffffff', 5, 4, 6, 7);
      px(c, '#6dff7a', 6, 5, 4, 5); px(c, '#0b0710', 7, 6, 2, 3);
      px(c, '#ff4fa3', 2, 7); px(c, '#ff4fa3', 13, 7);
      break;
    case 'bird': {
      const b = '#4fa3ff', w = '#cfe8ff';
      px(c, b, 4, 6, 6, 3); px(c, b, 9, 4, 3, 3); px(c, '#ffd34f', 12, 5, 2, 1);
      px(c, w, 5, 4, 3, 2); px(c, b, 2, 7, 2, 1); px(c, '#0b0710', 10, 5);
      break;
    }
    case 'tv':
      px(c, '#0b0710', 1, 2, 14, 10); px(c, '#2a6a3a', 2, 3, 12, 8);
      px(c, '#ffffff', 7, 3, 1, 8); px(c, '#ffffff', 5, 6, 5, 2);
      px(c, '#ffd34f', 3, 4); px(c, '#d8344a', 12, 9);
      break;
    case 'lamp':
      px(c, '#1a1a1a', 7, 4, 2, 12); px(c, '#1a1a1a', 5, 1, 6, 4); px(c, '#fff4b0', 6, 2, 4, 2);
      break;
  }
}

// ---------------------------------------------------------------- props

function circle(c: Ctx, cx: number, cy: number, r: number, fill: string, rim: string) {
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= r) px(c, d > r - 1.2 ? rim : fill, x, y);
    }
}
const shadow = (c: Ctx, cx: number, cy: number, r: number) => circle(c, cx, cy, r, '#0b0710', '#0b0710');

const PROPS: Partial<Record<TileType, (c: Ctx, t: Theme) => void>> = {
  table: (c) => {
    shadow(c, 8, 9, 7);
    circle(c, 8, 8, 6.5, '#8a5a34', '#5c3a20');
    px(c, '#a87245', 5, 4, 3, 1); px(c, '#a87245', 4, 5, 1, 2);
    px(c, '#ffd34f', 9, 7, 2, 2); px(c, '#ffffff', 9, 6, 2, 1); px(c, '#4fe3ff', 5, 9, 1, 2);
  },
  stool: (c) => {
    shadow(c, 8, 9, 5);
    circle(c, 8, 8, 4.5, '#c0304a', '#7a1a2a');
    px(c, '#ff6f86', 6, 6, 2, 1);
  },
  crate: (c) => {
    px(c, '#0b0710', 1, 2, 14, 13);
    px(c, '#a0703a', 2, 2, 12, 12);
    px(c, '#6b4520', 2, 2, 12, 1); px(c, '#6b4520', 2, 13, 12, 1);
    px(c, '#6b4520', 2, 2, 1, 12); px(c, '#6b4520', 13, 2, 1, 12);
    for (let i = 0; i < 10; i++) { px(c, '#6b4520', 3 + i, 3 + i); px(c, '#6b4520', 12 - i, 3 + i); }
    px(c, '#3fae5a', 4, 1, 1, 2); px(c, '#3fae5a', 11, 1, 1, 2);
  },
  bar: (c) => {
    px(c, '#3b2416', 0, 0, 16, 16);
    px(c, '#6e4a2c', 0, 0, 16, 6);
    px(c, '#8a5e38', 0, 0, 16, 1);
    px(c, '#4a2e1c', 0, 6, 16, 1);
    px(c, '#c9a44a', 0, 12, 16, 1);
    px(c, '#7a6020', 0, 13, 16, 1);
    px(c, '#c8ccd8', 4, 1, 1, 3); px(c, '#ffd34f', 4, 1);
    px(c, '#c8ccd8', 11, 1, 1, 3); px(c, '#ff4fa3', 11, 1);
    px(c, '#2a1a10', 0, 15, 16, 1);
  },
  amp: (c) => {
    px(c, '#0b0710', 0, 0, 16, 16);
    px(c, '#1c1a20', 1, 1, 14, 14);
    px(c, '#3a3640', 1, 1, 14, 1);
    px(c, '#ffd34f', 3, 2); px(c, '#ffd34f', 6, 2); px(c, '#ffd34f', 9, 2);
    px(c, '#ff4fa3', 12, 2, 2, 1);
    for (let y = 4; y < 14; y++) for (let x = 2; x < 14; x++) px(c, (x + y) % 2 ? '#2c2a32' : '#4a4652', x, y);
    px(c, '#c8ccd8', 7, 8, 2, 2);
  },
  bush: (c) => {
    shadow(c, 8, 9, 7);
    circle(c, 8, 8, 6.5, '#3a7a2a', '#1e4a1a');
    const r = rng(3);
    for (let i = 0; i < 9; i++) px(c, '#5aaa4a', 4 + Math.floor(r() * 8), 4 + Math.floor(r() * 8));
    px(c, '#ff4fa3', 6, 6); px(c, '#ffd34f', 10, 9);
  },
  tree: (c) => {
    shadow(c, 9, 9, 7.5);
    circle(c, 8, 8, 7.5, '#2e6a2a', '#1a4a16');
    circle(c, 7, 7, 4.5, '#4a8a3a', '#3a7a2a');
    px(c, '#6aba4a', 5, 5, 2, 1); px(c, '#6aba4a', 4, 6);
  },
  fence: (c) => {
    for (let x = 0; x < 16; x += 4) {
      px(c, '#0b0710', x, 2, 4, 12);
      px(c, '#a87245', x, 3, 3, 10); px(c, '#c89a5a', x, 3, 1, 10); px(c, '#6b4520', x + 2, 3, 1, 10);
    }
    px(c, '#5c3a20', 0, 5, 16, 1); px(c, '#5c3a20', 0, 10, 16, 1);
  },
  couch: (c) => {
    px(c, '#0b0710', 0, 2, 16, 13);
    px(c, '#6a7a3a', 1, 3, 14, 4); // back
    px(c, '#8a9a4a', 1, 7, 14, 6); // seat
    px(c, '#6a7a3a', 0, 5, 2, 9); px(c, '#6a7a3a', 14, 5, 2, 9);
    px(c, '#5a6a2a', 8, 7, 1, 6); px(c, '#a8b85a', 3, 8, 3, 1);
    px(c, '#4a3a2a', 10, 9, 2, 2); // stain
  },
  bleacher: (c) => {
    px(c, '#0b0710', 0, 0, 16, 16);
    for (let i = 0; i < 3; i++) {
      px(c, '#8a8a96', 0, i * 5 + 1, 16, 3);
      px(c, '#b8b8c4', 0, i * 5 + 1, 16, 1);
      px(c, '#4a4a56', 0, i * 5 + 4, 16, 1);
    }
  },
  post: (c) => {
    px(c, '#0b0710', 3, 3, 10, 10);
    px(c, '#3a3a44', 4, 4, 8, 8);
    px(c, '#d8344a', 5, 5, 6, 6); px(c, '#ff6f86', 5, 5, 2, 2);
  },
  rope: (c) => {
    px(c, '#d8344a', 0, 4, 16, 1); px(c, '#f2f2f2', 0, 7, 16, 1); px(c, '#3a6ab0', 0, 10, 16, 1);
    px(c, '#0b0710', 0, 5, 16, 1); px(c, '#0b0710', 0, 8, 16, 1); px(c, '#0b0710', 0, 11, 16, 1);
  },
  ropev: (c) => {
    px(c, '#d8344a', 4, 0, 1, 16); px(c, '#f2f2f2', 7, 0, 1, 16); px(c, '#3a6ab0', 10, 0, 1, 16);
    px(c, '#0b0710', 5, 0, 1, 16); px(c, '#0b0710', 8, 0, 1, 16); px(c, '#0b0710', 11, 0, 1, 16);
  },
  pillar: (c) => {
    px(c, '#0b0710', 2, 2, 13, 13);
    px(c, '#8a8a8a', 2, 1, 12, 12);
    px(c, '#b8b8b8', 2, 1, 12, 2); px(c, '#6a6a6a', 12, 3, 2, 10);
  },
  keg: (c) => {
    shadow(c, 8, 9, 6);
    circle(c, 8, 8, 5.5, '#b8bcc8', '#6a6e7a');
    circle(c, 8, 8, 2.5, '#8a8e9a', '#6a6e7a');
    px(c, '#ffffff', 5, 5, 2, 1); px(c, '#1a1a1a', 8, 8);
  },
  grill: (c) => {
    shadow(c, 8, 9, 6);
    circle(c, 8, 8, 5.5, '#1a1a1a', '#0b0b0b');
    for (let y = 5; y < 12; y += 2) px(c, '#6a6a6a', 4, y, 9, 1);
    px(c, '#ff7a2a', 6, 8); px(c, '#ffd34f', 9, 10); px(c, '#ff4f1a', 10, 7);
  },
  fountain: (c) => {
    circle(c, 8, 8, 7.5, '#a8a090', '#6a6458');
    circle(c, 8, 8, 5.5, '#3a8ad8', '#2a6ab0');
    circle(c, 8, 8, 1.8, '#ffffff', '#cfe8ff');
    px(c, '#cfe8ff', 4, 6); px(c, '#cfe8ff', 11, 10);
  },
  bench: (c) => {
    px(c, '#0b0710', 1, 4, 14, 9);
    for (let y = 5; y < 12; y += 2) px(c, '#a87245', 2, y, 12, 1);
    px(c, '#2a2a2a', 1, 4, 1, 9); px(c, '#2a2a2a', 14, 4, 1, 9);
  },
  arcade: (c) => {
    px(c, '#0b0710', 1, 0, 14, 16);
    px(c, '#2a1a4a', 2, 1, 12, 14);
    px(c, '#4fe3ff', 3, 2, 10, 6); px(c, '#ff4fa3', 5, 4, 2, 2); px(c, '#ffd34f', 9, 5, 2, 1);
    px(c, '#d8344a', 4, 10, 2, 2); px(c, '#ffd34f', 8, 10); px(c, '#6dff7a', 10, 11);
  },
  // ---- the morning after a college party
  cooler: (c) => {
    px(c, '#0b0710', 2, 3, 13, 11);
    px(c, '#2a6ab0', 3, 6, 11, 7); px(c, '#f2f2f2', 3, 3, 11, 3); px(c, '#cfd8e8', 3, 5, 11, 1);
    px(c, '#9aa3b5', 6, 4, 5, 1); // handle
    px(c, '#c8ccd8', 12, 8, 2, 3); px(c, '#d8344a', 0, 12, 2, 1); px(c, '#ffffff', 2, 12); // can + cup
  },
  flipchair: (c) => { // white plastic lawn chair on its side
    px(c, '#0b0710', 1, 4, 14, 9);
    px(c, '#f2f2f2', 2, 5, 7, 7); px(c, '#d8d8e0', 9, 6, 5, 5);
    for (let x = 3; x < 8; x += 2) px(c, '#c8c8d0', x, 6, 1, 5);
    px(c, '#f2f2f2', 13, 3, 1, 3); px(c, '#f2f2f2', 10, 12, 1, 3); // legs in the air
  },
  pong: (c) => { // beer pong table end with a rack of red cups
    px(c, '#0b0710', 0, 2, 16, 12);
    px(c, '#e8e4dc', 0, 3, 16, 10); px(c, '#c8c4bc', 0, 12, 16, 1);
    const cup = (x: number, y: number) => { px(c, '#d8344a', x, y, 2, 2); px(c, '#ffffff', x, y); };
    cup(3, 4); cup(3, 7); cup(3, 10); cup(6, 5); cup(6, 8); cup(9, 7);
    px(c, '#f2f2f2', 13, 7, 2, 2); // ball
  },
  trash: (c) => { // black bags spilling cups and cans
    shadow(c, 8, 9, 6.5);
    circle(c, 6, 8, 5, '#2a2a30', '#141418');
    circle(c, 11, 10, 4, '#34343a', '#141418');
    px(c, '#4a4a52', 4, 5, 2, 1); px(c, '#4a4a52', 10, 8);
    px(c, '#d8344a', 12, 3, 2, 2); px(c, '#ffffff', 12, 3); px(c, '#c8ccd8', 1, 13, 2, 1);
  },
  // long white folding table: neighbours join into one long table
  folding: (c) => {
    px(c, '#0b0710', 0, 3, 16, 10);
    px(c, '#f2f0ea', 0, 4, 16, 8);
    px(c, '#ffffff', 0, 4, 16, 1); px(c, '#cfcac0', 0, 11, 16, 1);
    px(c, '#d8344a', 7, 6, 3, 3); px(c, '#d8344a', 6, 7, 5, 1); // red star centrepiece
    px(c, '#3a3a40', 1, 13, 1, 2); px(c, '#3a3a40', 14, 13, 1, 2);
  },
  chair: (c) => {
    px(c, '#0b0710', 4, 3, 9, 10);
    px(c, '#2a2a30', 5, 6, 7, 6); // seat
    px(c, '#1a1a1e', 5, 3, 7, 3); px(c, '#4a4a52', 6, 4, 5, 1); // back
  },
  podium: (c) => {
    px(c, '#0b0710', 3, 2, 11, 13);
    px(c, '#b07a3a', 4, 3, 9, 11);
    px(c, '#d09a5a', 4, 3, 9, 3); px(c, '#7a4e20', 4, 6, 9, 1);
    px(c, '#ffd34f', 7, 9, 3, 2); // eagle badge
  },
  flag: (c) => {
    px(c, '#c9a44a', 3, 0, 1, 16); px(c, '#ffd34f', 2, 0, 3, 1);
    for (let i = 0; i < 6; i++) px(c, i % 2 ? '#f2f2f2' : '#d8344a', 4, 1 + i, 10, 1);
    px(c, '#2a3a8a', 4, 1, 4, 3); px(c, '#ffffff', 5, 2); px(c, '#ffffff', 7, 2);
    px(c, '#0b0710', 4, 7, 10, 1);
  },
  barricade: (c) => { // Indy Blvd's deployable steel barrier with hazard stripes
    px(c, '#0b0710', 1, 2, 14, 13);
    px(c, '#5a6068', 2, 3, 12, 11);
    px(c, '#7a828c', 2, 3, 12, 1); px(c, '#3a3f46', 2, 13, 12, 1);
    for (let x = 2; x < 14; x++) px(c, (x >> 1) % 2 ? '#1a1a1a' : '#ffd34f', x, 5, 1, 2);
    px(c, '#1a1a1a', 6, 9, 4, 1); // viewing slot
    px(c, '#9aa2ac', 3, 11); px(c, '#9aa2ac', 12, 11); // rivets
  },
  shroom: (c) => {
    shadow(c, 8, 9, 7);
    circle(c, 8, 8, 7, '#ff4fa3', '#a62a6a');
    px(c, '#ffffff', 5, 4, 2, 2); px(c, '#ffffff', 10, 6, 2, 2); px(c, '#ffffff', 6, 10, 2, 2); px(c, '#ffffff', 10, 11);
    px(c, '#ffd34f', 8, 8);
  },
};

function drawStage(c: Ctx, k: string[], seed: number) {
  const r = rng(seed);
  px(c, k[0], 0, 0, 16, 16);
  px(c, k[1], 0, 7, 16, 1); px(c, k[1], 0, 15, 16, 1);
  px(c, k[1], 7, 0, 1, 16); px(c, k[1], 15, 0, 1, 16);
  if (r() < 0.5) px(c, k[2], Math.floor(r() * 14) + 1, Math.floor(r() * 14) + 1);
  if (r() < 0.4) px(c, k[3], Math.floor(r() * 14) + 1, Math.floor(r() * 14) + 1);
}

function drawMat(c: Ctx, seed: number) {
  const r = rng(seed);
  px(c, '#d8d0c8', 0, 0, 16, 16);
  for (let i = 0; i < 6; i++) px(c, '#bcb4ac', Math.floor(r() * 16), Math.floor(r() * 16));
  if (r() < 0.2) px(c, '#a01a2a', Math.floor(r() * 14), Math.floor(r() * 14), 2, 1);
}

const FLOOR_VARIANTS = 4;

function canvasTex(scene: Phaser.Scene, key: string, draw: (c: Ctx) => void) {
  if (scene.textures.exists(key)) return;
  const t = scene.textures.createCanvas(key, 16, 16)!;
  draw(t.getContext());
  t.refresh();
}

/** Builds every tile texture a venue needs (idempotent). */
export function buildVenue(scene: Phaser.Scene, t: Theme) {
  const k = (type: string, v = 0) => `v-${t.id}-${type}-${v}`;
  for (let v = 0; v < FLOOR_VARIANTS; v++) {
    canvasTex(scene, k('floor', v), (c) => drawFloor(c, t.floor.style, t.floor.c, v + 1));
    canvasTex(scene, k('floor2', v), (c) => drawFloor(c, t.floor2.style, t.floor2.c, v + 11));
    canvasTex(scene, k('stage', v), (c) => drawStage(c, t.stage, v + 7));
    canvasTex(scene, k('mat', v), (c) => drawMat(c, v + 3));
  }
  canvasTex(scene, k('rubble'), (c) => {
    drawFloor(c, t.floor.style, t.floor.c, 55);
    const r = rng(99);
    for (let i = 0; i < 18; i++) {
      px(c, ['#6a6a72', '#4a3a2a', '#8a8a92', '#a9d8f5'][Math.floor(r() * 4)], Math.floor(r() * 15), Math.floor(r() * 15), r() < 0.5 ? 2 : 1, 1);
    }
  });
  canvasTex(scene, k('wall'), (c) => drawWall(c, t.wall.style, t.wall.c));
  canvasTex(scene, k('neon'), (c) => { drawWall(c, t.wall.style, t.wall.c); drawDecor(c, t.decor); });
  for (const [type, draw] of Object.entries(PROPS)) {
    canvasTex(scene, k(type), (c) => {
      if (type === 'post' || type === 'rope' || type === 'ropev') drawMat(c, 9);
      else if (type === 'flag' && t.id === 'lodge') drawStage(c, t.stage, 4); // flags stand on the riser
      else drawFloor(c, t.floor.style, t.floor.c, 33);
      draw!(c, t);
    });
  }
}

/** Texture key for a tile in a venue (floors get a few variants for texture). */
export function venueTile(theme: string, type: TileType, x: number, y: number) {
  if (type === 'floor' || type === 'floor2' || type === 'mat') return `v-${theme}-${type}-${(x * 7 + y * 13) % FLOOR_VARIANTS}`;
  if (type === 'stage') return `v-${theme}-stage-${(x + y * 2) % FLOOR_VARIANTS}`;
  return `v-${theme}-${type}-0`;
}
