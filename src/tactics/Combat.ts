import { Grid, Pos, dist } from './Grid';
import type { Unit } from './Unit';

export interface ShotInfo {
  chance: number;
  crit: number;
  cover: 0 | 1 | 2;
  flanked: boolean;
  dist: number;
}

export interface ShotMods {
  aimBonus?: number;
  ignoreHalf?: boolean;
}

export const COVER_PENALTY = [0, 20, 40];
export const MARK_AIM = 20;
/** Indy Blvd's barrier stops more than ordinary cover. */
export const BARRICADE_DEF = 10;
/** Aim for a band member who started the turn braced behind a barrier. */
export const BRACE_AIM = 15;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Hit = aim − cover − range falloff. No cover (or flanked) adds +30 crit. */
export function hitChance(grid: Grid, att: Unit, from: Pos, target: Unit, mods: ShotMods = {}): ShotInfo {
  const d = dist(from, target);
  const ci = grid.coverAgainst(target, from);
  let cover = ci.cover;
  if (mods.ignoreHalf) cover = cover === 2 ? 1 : 0;
  let ch = att.aim + (mods.aimBonus ?? 0) - COVER_PENALTY[cover];
  if (target.marked && att.team !== target.team) ch += MARK_AIM;
  if (ci.barricade && cover > 0) ch -= BARRICADE_DEF;
  if (att.braced) ch += BRACE_AIM;
  const w = att.weapon;
  if (w.close || w.falloff) {
    // a standard gun's own sweet spot
    if (w.close && d <= w.close.within) ch += w.close.aim;
    if (w.falloff && d > w.falloff.from) ch -= Math.round((d - w.falloff.from) * w.falloff.per);
  } else if (w.sniper) {
    if (d <= 2.5) ch -= 25;
  } else {
    if (d <= 2) ch += 10;
    if (d > 7) ch -= Math.round((d - 7) * 4);
  }
  return {
    chance: clamp(Math.round(ch), 5, 95),
    crit: clamp(w.crit + (cover === 0 ? 30 : 0), 0, 100),
    cover,
    flanked: ci.any && ci.cover === 0,
    dist: d,
  };
}

export function canTarget(grid: Grid, att: Unit, from: Pos, target: Unit, range = att.weapon.range): boolean {
  return (
    target.alive &&
    target.team !== att.team &&
    !target.stealth &&
    dist(from, target) <= range &&
    grid.los(from, target)
  );
}

export const rollDamage = (w: { dmg: [number, number] }) =>
  w.dmg[0] + Math.floor(Math.random() * (w.dmg[1] - w.dmg[0] + 1));
