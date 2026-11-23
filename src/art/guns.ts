import type { GunKind } from '../data/weapons';
import { tone, type Palette } from './pixel';

/**
 * Gun sprites drawn over a character's right hand, pointing right.
 * '0' marks where the hand grips it; the gun is placed so that pixel lands on the hand.
 * Keys: 1 dark steel, 2 metal, 3 muzzle highlight, 4 wood, 5 dark wood, 6 brass ammo, 7 scope lens.
 * Every gun has its own silhouette so you can tell them apart at a glance.
 */
export interface GunArt { rows: string[]; left?: string[] }

export const GUN_ART: Record<GunKind, GunArt> = {
  // tiny and thin: a slide above the hand
  pistol: { rows: [
    '12223',
    '01...',
  ] },
  // one in each hand, pointing both ways
  dualpistols: {
    rows: [
      '12223',
      '01...',
    ],
    left: [
      '32221',
      '...10',
    ],
  },
  // long barrel, wood stock and a wood pump under the barrel
  shotgun: { rows: [
    '4411222223',
    '.5501.444.',
  ] },
  // short and fat: two stacked barrels
  sawedoff: { rows: [
    '.441223',
    '4450223',
    '.5.....',
  ] },
  // the longest gun, with a big scope
  precision: { rows: [
    '...17711....',
    '441111222223',
    '.5501.......',
  ] },
  // mid-length with a small scope and wood furniture
  carbine: { rows: [
    '...171...',
    '441112223',
    '.550.1...',
  ] },
  // black stock and a curved magazine
  assault: { rows: [
    '1111122223',
    '.11011....',
    '.....1....',
    '......1...',
  ] },
  // stubby, no stock, long straight magazine
  smg: { rows: [
    '112223',
    '01.1..',
    '...1..',
    '...1..',
  ] },
  // bulky, brass ammo box and a bipod
  lmg: { rows: [
    '...1111....',
    '11111122223',
    '11.0661..1.',
    '....66..1.1',
  ] },
};

export const GUN_NO_SHADE = ['7'];

/** Colours for the gun keys; a weapon tint recolours the metal. */
export function gunPalette(tint?: number): Palette {
  const metal = tint ?? 0x6a707e;
  return {
    '1': 0x23252b,
    '2': metal,
    '3': tone(metal, tint ? 1.35 : 1.5),
    '4': 0x8a5a30,
    '5': 0x5a3418,
    '6': 0xc9a44a,
    '7': 0x4fe3ff,
  };
}

/** Find a '0' in a gun grid. */
function grip(rows: string[]): [number, number] {
  for (let y = 0; y < rows.length; y++) {
    const x = rows[y].indexOf('0');
    if (x >= 0) return [x, y];
  }
  return [0, 0];
}

/** Find the hand on a body grid: the outermost skin pixel on the arms row band. */
function hand(rows: string[], side: 'right' | 'left'): [number, number] {
  let best: [number, number] | null = null;
  for (let y = 9; y <= 12 && y < rows.length; y++) {
    const r = rows[y];
    for (let x = 0; x < r.length; x++) {
      if (r[x] !== 's') continue;
      if (side === 'right' && x >= 11 && (!best || x > best[0])) best = [x, y];
      if (side === 'left' && x <= 4 && (!best || x < best[0])) best = [x, y];
    }
  }
  return best ?? (side === 'right' ? [12, 11] : [3, 11]);
}

/** Stamp a gun grid onto a (padded) body grid so its grip sits on the hand. */
function stamp(body: string[], gun: string[], at: [number, number]) {
  const [gx, gy] = grip(gun);
  const handKey = body[at[1]]?.[at[0]] && body[at[1]][at[0]] !== '.' ? body[at[1]][at[0]] : 's';
  gun.forEach((row, y) => {
    const by = at[1] - gy + y;
    if (by < 0 || by >= body.length) return;
    const line = body[by].split('');
    [...row].forEach((c, x) => {
      const bx = at[0] - gx + x;
      if (c === '.' || bx < 0 || bx >= line.length) return;
      line[bx] = c === '0' ? handKey : c;
    });
    body[by] = line.join('');
  });
}

/** Pads a 16-wide body grid by `pad` on each side and puts the gun in its hands. */
export function armBody(top: string[], kind: GunKind, pad: number): string[] {
  const side = '.'.repeat(pad);
  const body = top.map((r) => side + r + side);
  const art = GUN_ART[kind];
  const [rx, ry] = hand(top, 'right');
  stamp(body, art.rows, [rx + pad, ry]);
  if (art.left) {
    const [lx, ly] = hand(top, 'left');
    stamp(body, art.left, [lx + pad, ly]);
  }
  return body;
}
