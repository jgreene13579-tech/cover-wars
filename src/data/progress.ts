import type { CharacterDef, Weapon } from './characters';

/** What a level-up can raise. */
export type StatPick = 'atk' | 'aim' | 'hp';

/** One band member's experience and the stats they've chosen on level-ups. */
export interface CharProgress {
  xp: number; // toward the next level
  level: number;
  atk: number; // +damage picks
  aim: number; // +aim picks
  hp: number; // +health picks
  picks: number; // level-ups waiting for a choice
}

export const MAX_LEVEL = 10;
/** XP needed to go from `level` to `level + 1`. */
export const xpToNext = (level: number) => 100 * level;

/** What each pick is worth. */
export const STAT_GAIN = { atk: 1, aim: 5, hp: 1 } as const;

export const STAT_LABEL: Record<StatPick, { name: string; gain: string }> = {
  atk: { name: 'ATTACK', gain: `+${STAT_GAIN.atk} DAMAGE` },
  aim: { name: 'AIM', gain: `+${STAT_GAIN.aim} AIM` },
  hp: { name: 'HEALTH', gain: `+${STAT_GAIN.hp} MAX HP` },
};

/** XP for one show: win or lose, plus knockouts; going down halves it. */
export const XP = { win: 100, loss: 40, perKill: 25, downedMult: 0.5 };

export const freshProgress = (): CharProgress => ({ xp: 0, level: 1, atk: 0, aim: 0, hp: 0, picks: 0 });

export function xpFor(victory: boolean, kills: number, downed: boolean) {
  const base = (victory ? XP.win : XP.loss) + kills * XP.perKill;
  return Math.round(downed ? base * XP.downedMult : base);
}

/** Adds XP in place; returns how many levels were gained. */
export function addXp(p: CharProgress, n: number): number {
  let gained = 0;
  p.xp += n;
  while (p.level < MAX_LEVEL && p.xp >= xpToNext(p.level)) {
    p.xp -= xpToNext(p.level);
    p.level++;
    p.picks++;
    gained++;
  }
  if (p.level >= MAX_LEVEL) p.xp = 0;
  return gained;
}

/** A band member's stats with their level-up picks applied. */
export function boostedStats(c: CharacterDef, p: CharProgress | undefined): { hp: number; aim: number; weapon: Weapon } {
  const pr = p ?? freshProgress();
  const a = pr.atk * STAT_GAIN.atk;
  return {
    hp: c.hp + pr.hp * STAT_GAIN.hp,
    aim: c.aim + pr.aim * STAT_GAIN.aim,
    weapon: a ? { ...c.weapon, dmg: [c.weapon.dmg[0] + a, c.weapon.dmg[1] + a] } : c.weapon,
  };
}

/** Deeper into the tour, every cover song is a little sharper and tougher. */
export const enemyVeterancy = (missionIndex: number) => ({ aim: Math.round(missionIndex * 1.5), hp: Math.floor(missionIndex / 4) });
