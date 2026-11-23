import type { Weapon } from './characters';
import type { GunKind } from './weapons';

/** Set-list upgrades bought at the merch table. Each level costs more than the last. */
export interface UpgradeDef {
  id: string;
  name: string;
  desc: string;
  prices: number[]; // one price per level
  requires?: string; // another upgrade that has to be bought first
  /** Per-level card titles (the card shows the next level's name). */
  levelNames?: string[];
  /** Save keys, one per level, for upgrades that were once separate cards (keeps old saves working). */
  keys?: string[];
}

/** The standard guns, grouped for damage upgrades. */
export const GUN_GROUPS: { id: string; kinds: GunKind[] }[] = [
  { id: 'dmg-close', kinds: ['pistol', 'shotgun', 'sawedoff'] },
  { id: 'dmg-auto', kinds: ['smg', 'assault', 'lmg'] },
  { id: 'dmg-spec', kinds: ['dualpistols', 'precision', 'carbine'] },
];

export const UPGRADES: UpgradeDef[] = [
  { id: 'encore', name: 'ENCORE', levelNames: ['ENCORE 1', 'ENCORE 2', 'TIGHT 45'], keys: ['squad5', 'squad6', 'squad7'],
    desc: 'EACH LEVEL ADDS A SONG TO YOUR SET LIST FOR EVERY SHOW: 5, THEN 6, THEN 7.', prices: [1000, 2000, 3000] },
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

export function upgradeLevel(save: WithUpgrades, id: string) {
  const keys = UPGRADES.find((u) => u.id === id)?.keys;
  return keys ? keys.filter((k) => (save.upgrades[k] ?? 0) > 0).length : save.upgrades[id] ?? 0;
}
/** Records one more level of an upgrade in the save. */
export function addUpgradeLevel(save: WithUpgrades, u: UpgradeDef) {
  const lvl = upgradeLevel(save, u.id);
  if (u.keys) save.upgrades[u.keys[lvl]] = 1;
  else save.upgrades[u.id] = lvl + 1;
}
export const squadSize = (save: WithUpgrades) => 4 + upgradeLevel(save, 'encore');
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
