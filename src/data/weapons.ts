import type { Weapon } from './characters';

/**
 * The band's standard guns. Every character carries one of these, with the
 * same numbers as everyone else who carries it. Each gun has its own sweet
 * spot: `close` is the aim bonus (or penalty) within a few tiles, and
 * `falloff` is how much aim it loses per tile past a distance.
 */
export type GunKind = 'pistol' | 'dualpistols' | 'shotgun' | 'sawedoff' | 'precision' | 'carbine' | 'assault' | 'smg' | 'lmg';

export const GUNS: Record<GunKind, Weapon> = {
  pistol: {
    kind: 'pistol', name: 'PISTOL', dmg: [1, 3], range: 8, shots: 1, crit: 15, sfx: 'pistol',
    close: { within: 2, aim: 10 }, falloff: { from: 6, per: 5 },
  },
  dualpistols: {
    kind: 'dualpistols', name: 'DUAL PISTOLS', dmg: [1, 3], range: 8, shots: 2, crit: 15, sfx: 'pistol',
    close: { within: 2, aim: 10 }, falloff: { from: 6, per: 5 },
  },
  shotgun: {
    kind: 'shotgun', name: 'SHOTGUN', dmg: [3, 5], range: 6, shots: 1, crit: 20, sfx: 'shotgun',
    close: { within: 2, aim: 20 }, falloff: { from: 3, per: 8 },
  },
  sawedoff: {
    kind: 'sawedoff', name: 'DOUBLE-BARREL SAWED-OFF', dmg: [2, 4], range: 4, shots: 2, crit: 20, sfx: 'shotgun',
    close: { within: 2, aim: 25 }, falloff: { from: 2, per: 12 },
  },
  precision: {
    kind: 'precision', name: 'PRECISION RIFLE', dmg: [4, 6], range: 18, shots: 1, crit: 25, sniper: true, sfx: 'sniper',
    close: { within: 2.5, aim: -25 },
  },
  carbine: {
    kind: 'carbine', name: 'SCOPED CARBINE', dmg: [2, 4], range: 14, shots: 1, crit: 15, sfx: 'rifle',
    falloff: { from: 10, per: 3 },
  },
  assault: {
    kind: 'assault', name: 'ASSAULT RIFLE', dmg: [3, 4], range: 12, shots: 1, crit: 10, sfx: 'rifle',
    close: { within: 2, aim: 10 }, falloff: { from: 8, per: 4 },
  },
  smg: {
    kind: 'smg', name: 'SUBMACHINE GUN', dmg: [1, 2], range: 8, shots: 3, crit: 10, sfx: 'pistol',
    close: { within: 3, aim: 10 }, falloff: { from: 5, per: 6 },
  },
  lmg: {
    kind: 'lmg', name: 'LMG', dmg: [4, 5], range: 14, shots: 1, crit: 5, sfx: 'rifle',
    close: { within: 2, aim: -10 }, falloff: { from: 10, per: 3 },
  },
};

/** A standard gun (a fresh copy, so nobody's tweaks leak into anyone else's). */
export function gun(kind: GunKind, opts: { tint?: number } = {}): Weapon {
  const base = GUNS[kind];
  const w: Weapon = { ...base, close: base.close && { ...base.close }, falloff: base.falloff && { ...base.falloff } };
  if (opts.tint !== undefined) w.tint = opts.tint;
  return w;
}

/** One line describing how a gun plays, for cards and the shop. */
export function gunBlurb(w: Weapon): string {
  const parts = [`${w.dmg[0]}-${w.dmg[1]} DMG${w.shots > 1 ? ' x' + w.shots : ''}`, `RANGE ${w.range}`];
  if (w.close && w.close.aim > 0) parts.push(`+${w.close.aim} AIM UP CLOSE`);
  if (w.close && w.close.aim < 0) parts.push(`${w.close.aim} AIM UP CLOSE`);
  return parts.join(', ');
}
