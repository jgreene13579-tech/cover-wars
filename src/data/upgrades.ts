import type { Weapon } from './characters';
import type { GunKind } from './weapons';

/** Set-list upgrades bought at the merch table. Each level costs more than the last. */
export interface UpgradeDef {
  id: string;
  name: string;
  desc: string;
  prices: number[]; // one price per level
  requires?: string; // another upgrade that has to be bought first
}

/** The standard guns, grouped for damage upgrades. */
export const GUN_GROUPS: { id: string; kinds: GunKind[] }[] = [
  { id: 'dmg-close', kinds: ['pistol', 'shotgun', 'sawedoff'] },
  { id: 'dmg-auto', kinds: ['smg', 'assault', 'lmg'] },
  { id: 'dmg-spec', kinds: ['dualpistols', 'precision', 'carbine'] },
];

export const UPGRADES: UpgradeDef[] = [
  { id: 'squad5', name: 'FIFTH MEMBER', desc: 'BRING 5 SONGS TO EVERY SHOW INSTEAD OF 4.', prices: [1500] },
  { id: 'squad6', name: 'SIXTH MEMBER', desc: 'BRING 6 SONGS TO EVERY SHOW.', prices: [3000], requires: 'squad5' },
  { id: 'dmg-close', name: 'CLOSE QUARTERS', desc: '+1 DAMAGE PER LEVEL: PISTOL, SHOTGUN, DOUBLE-BARREL SAWED-OFF.', prices: [500, 1000, 1800] },
  { id: 'dmg-auto', name: 'AUTOMATICS', desc: '+1 DAMAGE PER LEVEL: SMG, ASSAULT RIFLE, LMG.', prices: [500, 1000, 1800] },
  { id: 'dmg-spec', name: 'SPECIALIST', desc: '+1 DAMAGE PER LEVEL: DUAL PISTOLS, PRECISION RIFLE, SCOPED CARBINE.', prices: [500, 1000, 1800] },
  { id: 'kevlar', name: 'ROADIE KEVLAR', desc: '+1 MAX HP PER LEVEL FOR EVERY BAND MEMBER.', prices: [700, 1400, 2200] },
  { id: 'cd', name: 'SIGNATURE MOVES', desc: 'EVERY SPECIAL RECHARGES 1 TURN FASTER (NEVER FASTER THAN EVERY OTHER TURN).', prices: [1000] },
  { id: 'secondwind', name: 'SECOND WIND', desc: 'ONCE PER SHOW, THE FIRST SONG KNOCKED OUT GETS BACK UP WITH 2 HP.', prices: [2500] },
  { id: 'merch', name: 'MERCH SALES', desc: '+25% COINS FROM EVERY SHOW PER LEVEL.', prices: [800, 1600] },
  { id: 'ap', name: 'EXTRA ACTION', desc: 'EVERY BAND MEMBER GETS 3 ACTIONS A TURN INSTEAD OF 2.', prices: [6000] },
];

type WithUpgrades = { upgrades: Record<string, number> };

export const upgradeLevel = (save: WithUpgrades, id: string) => save.upgrades[id] ?? 0;
export const squadSize = (save: WithUpgrades) => 4 + upgradeLevel(save, 'squad5') + upgradeLevel(save, 'squad6');
export const actionsPerTurn = (save: WithUpgrades) => 2 + upgradeLevel(save, 'ap');
export const bonusHp = (save: WithUpgrades) => upgradeLevel(save, 'kevlar');
export const hasSecondWind = (save: WithUpgrades) => upgradeLevel(save, 'secondwind') > 0;
export const coinMultiplier = (save: WithUpgrades) => 1 + 0.25 * upgradeLevel(save, 'merch');
/** A special's recharge time with Signature Moves (a cooldown of 0 stays 0). */
export const specialCooldown = (base: number, save: WithUpgrades) =>
  base > 2 && upgradeLevel(save, 'cd') ? base - 1 : base;

/** A gun with the damage upgrades for its group applied. */
export function upgradedWeapon(w: Weapon, save: WithUpgrades): Weapon {
  const group = w.kind ? GUN_GROUPS.find((g) => g.kinds.includes(w.kind!)) : undefined;
  const bonus = group ? upgradeLevel(save, group.id) : 0;
  return bonus ? { ...w, dmg: [w.dmg[0] + bonus, w.dmg[1] + bonus] } : w;
}
