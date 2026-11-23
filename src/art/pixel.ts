import Phaser from 'phaser';

/** Maps a character in a pixel grid to a colour. '.' is transparent. */
export type Palette = Record<string, number>;

export const SPR_W = 16;
export const SPR_H = 20;
const OUTLINE = 0x0b0710;

export const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');

/** Scale a colour's brightness (0.8 = 20% darker, 1.15 = 15% lighter). */
export function tone(n: number, f: number) {
  const ch = (s: number) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** Keys that are tiny details (eyes, mouths, lenses) and never get shaded. */
const NO_SHADE = new Set(['e', 'm', 'L', 'O', 'v', 'w']);

// Legs shared by every character; palette keys p (pants) and k (boots).
export const LEGS = {
  stand: [
    '....ppp..ppp....',
    '....ppp..ppp....',
    '....pp....pp....',
    '....pp....pp....',
    '...kkk....kkk...',
    '...kkk....kkk...',
  ],
  walkA: [
    '....ppp..ppp....',
    '...ppp...ppp....',
    '...pp.....pp....',
    '..kkk.....pp....',
    '..kkk....kkk....',
    '.........kkk....',
  ],
  walkB: [
    '....ppp..ppp....',
    '....ppp...ppp...',
    '....pp.....pp...',
    '....pp.....kkk..',
    '...kkk.....kkk..',
    '...kkk..........',
  ],
};

export function normalize(rows: string[], w: number, h: number): string[] {
  const out = rows.slice(0, h).map((r) => r.padEnd(w, '.').slice(0, w));
  while (out.length < h) out.push('.'.repeat(w));
  return out;
}

/** idle A, idle B (1px bob), walk A, walk B */
export function charFrames(top: string[]): string[][] {
  const t = normalize(top, SPR_W, 14);
  const blank = '.'.repeat(SPR_W);
  return [
    [...t, ...LEGS.stand],
    [blank, ...t, ...LEGS.stand.slice(1)],
    [...t, ...LEGS.walkA],
    [...t, ...LEGS.walkB],
  ];
}

/** Paint a pixel grid with a 1px dark outline for that crisp 8-bit pop. */
export function paint(ctx: CanvasRenderingContext2D, rows: string[], pal: Palette, ox = 0, oy = 0, outline = true, shade = false) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const solid = (x: number, y: number) => {
    if (y < 0 || y >= h || x < 0 || x >= w) return false;
    const c = rows[y][x];
    return !!c && c !== '.' && c !== ' ' && pal[c] !== undefined;
  };
  if (outline) {
    ctx.fillStyle = hex(OUTLINE);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (!solid(x, y) && (solid(x + 1, y) || solid(x - 1, y) || solid(x, y + 1) || solid(x, y - 1)))
          ctx.fillRect(ox + x, oy + y, 1, 1);
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!solid(x, y)) continue;
      const k = rows[y][x];
      let col = pal[k];
      if (shade && !NO_SHADE.has(k)) {
        // one light source for the whole cast: up and to the left
        if (!solid(x + 1, y) || !solid(x, y + 1)) col = tone(col, 0.7);
        else if (!solid(x + 2, y)) col = tone(col, 0.86); // soft second step of the shadow
        else if (!solid(x - 1, y) || !solid(x, y - 1)) col = tone(col, 1.18);
      }
      ctx.fillStyle = hex(col);
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

export function makeImage(scene: Phaser.Scene, key: string, rows: string[], pal: Palette, outline = false) {
  if (scene.textures.exists(key)) return;
  const w = Math.max(...rows.map((r) => r.length));
  const t = scene.textures.createCanvas(key, w, rows.length)!;
  paint(t.getContext(), normalize(rows, w, rows.length), pal, 0, 0, outline);
  t.refresh();
}

/** Builds a 4-frame character sheet plus `${key}-idle` / `${key}-walk` animations. */
export function makeCharacter(scene: Phaser.Scene, key: string, top: string[], pal: Palette) {
  if (scene.textures.exists(key)) return;
  const frames = charFrames(top);
  const t = scene.textures.createCanvas(key, SPR_W * frames.length, SPR_H)!;
  const ctx = t.getContext();
  frames.forEach((f, i) => {
    paint(ctx, f, pal, i * SPR_W, 0, true, true);
    t.add(`f${i}`, 0, i * SPR_W, 0, SPR_W, SPR_H);
  });
  t.refresh();
  scene.anims.create({
    key: `${key}-idle`,
    frames: [{ key, frame: 'f0' }, { key, frame: 'f1' }],
    frameRate: 2,
    repeat: -1,
  });
  scene.anims.create({
    key: `${key}-walk`,
    frames: [{ key, frame: 'f2' }, { key, frame: 'f0' }, { key, frame: 'f3' }, { key, frame: 'f0' }],
    frameRate: 10,
    repeat: -1,
  });
}

/** Small seeded RNG so tile art is the same every load. */
export function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
