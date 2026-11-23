import { Grid, Pos, ReachNode, dist, key } from './Grid';
import { canTarget, hitChance } from './Combat';
import type { Unit } from './Unit';
import { ENEMIES } from '../data/enemies';

export type EnemyAction =
  | { type: 'shoot'; target: Unit }
  | { type: 'melee'; target: Unit }
  | { type: 'clap'; center: Pos };

export interface EnemyPlan {
  path: Pos[];
  /** Free Bird skips the walk and blinks straight here. */
  teleport?: Pos;
  action: EnemyAction | null;
}

/** Mr. Brightside: rush the closest reachable band member and hit them. */
function planMelee(grid: Grid, e: Unit, targets: Unit[], reach: Map<string, ReachNode>): EnemyPlan | null {
  let best: { node: ReachNode; target: Unit; score: number } | null = null;
  for (const p of targets) {
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) {
        const n = reach.get(key(p.x + dx, p.y + dy));
        if (!n || (!dx && !dy)) continue;
        const score = -n.cost - p.hp * 2 + Math.random(); // prefer close, hurt targets
        if (!best || score > best.score) best = { node: n, target: p, score };
      }
  }
  if (!best) return null;
  return { path: grid.pathTo(reach, best.node), action: { type: 'melee', target: best.target } };
}

/** Free Bird: every open tile within range counts as "reachable" for free. */
function teleportReach(grid: Grid, e: Unit, range: number, occupied: Set<string>) {
  const out = new Map<string, ReachNode>();
  for (let y = 0; y < grid.rows; y++)
    for (let x = 0; x < grid.cols; x++) {
      if (dist(e, { x, y }) > range || !grid.walkable(x, y) || occupied.has(key(x, y))) continue;
      out.set(key(x, y), { x, y, cost: 0, prev: null });
    }
  out.set(key(e.x, e.y), { x: e.x, y: e.y, cost: 0, prev: null });
  return out;
}

const CLAP_RANGE = 8;
/** How far Toast's taunt reaches. */
export const TAUNT_RANGE = 10;

/**
 * Score every tile the enemy can reach this turn: good cover against the
 * squad, a good shot from there, and not standing out in the open. If no tile
 * offers a shot, dash toward the nearest band member instead.
 */
export function planEnemy(grid: Grid, units: Unit[], e: Unit): EnemyPlan {
  // checked-in band members are on the covers' side for now
  let targets = units.filter((u) => u.alive && u.isPlayer && !u.stealth && !u.controlledBy);
  // Toast's Trading Punches: anyone close enough has to go after him
  const taunters = targets.filter((u) => u.taunting && dist(u, e) <= TAUNT_RANGE);
  // Distraction's decoy beats even Toast: anything in range shoots the fake
  const decoys = targets.filter((u) => u.decoy && dist(u, e) <= TAUNT_RANGE);
  if (decoys.length) targets = decoys;
  else if (taunters.length) targets = taunters;
  if (!targets.length) return { path: [], action: null };

  const occupied = new Set(units.filter((u) => u.alive && u !== e).map((u) => key(u.x, u.y)));
  const def = ENEMIES[e.id];
  const blink = !!def?.teleport && e.tpCd <= 0;
  const reach = blink ? teleportReach(grid, e, def.teleport!.range, occupied) : grid.reachable(e, e.move, occupied);

  if (def?.melee) {
    const rush = planMelee(grid, e, targets, reach);
    if (rush) return rush;
  }

  let best: ReachNode | null = null;
  let bestScore = -Infinity;
  let bestHasShot = false;

  for (const n of reach.values()) {
    const t = { x: n.x, y: n.y };
    let score = 0;
    let bestShot = 0;
    for (const p of targets) {
      const d = dist(t, p);
      if (d > 12 || !grid.los(t, p)) continue;
      const c = grid.coverAgainst(t, p).cover;
      score += c === 2 ? 18 : c === 1 ? 9 : -14;
      if (d <= e.weapon.range) {
        const hc = hitChance(grid, e, t, p).chance;
        bestShot = Math.max(bestShot, hc + (p.hp <= e.weapon.dmg[1] ? 10 : 0));
      }
    }
    if (bestShot > 0) score += bestShot * 0.7;
    else score -= 25 + Math.min(...targets.map((p) => dist(t, p))) * 3;
    score -= blink ? 0 : n.cost * 0.8;
    score += Math.random() * 4;
    if (score > bestScore) {
      bestScore = score;
      best = n;
      bestHasShot = bestShot > 0;
    }
  }

  // Free Bird blinks to the best spot (shot or not) and fires from there.
  if (blink && best) {
    const to = { x: best.x, y: best.y };
    let target: Unit | null = null;
    let bestValue = -1;
    for (const p of targets) {
      if (!canTarget(grid, e, to, p)) continue;
      const v = hitChance(grid, e, to, p).chance + (p.hp <= e.weapon.dmg[1] ? 40 : 0);
      if (v > bestValue) { bestValue = v; target = p; }
    }
    return { path: [], teleport: to, action: target ? { type: 'shoot', target } : null };
  }

  // No shot from anywhere this turn: dash (both actions) toward the squad.
  if (!best || !bestHasShot) {
    const far = grid.reachable(e, e.move * 2, occupied);
    let dash: ReachNode | null = null;
    let dashScore = -Infinity;
    for (const n of far.values()) {
      const nearest = Math.min(...targets.map((p) => dist(n, p)));
      const cover = Math.max(...targets.map((p) => grid.coverAgainst(n, p).cover));
      const s = -nearest * 4 + cover * 6 + Math.random() * 2;
      if (s > dashScore) { dashScore = s; dash = n; }
    }
    return { path: dash ? grid.pathTo(far, dash) : [], action: null };
  }

  const from = { x: best.x, y: best.y };
  const path = grid.pathTo(reach, from);

  // Boss: clap shockwave on the biggest cluster when it is charged.
  if (e.boss && e.clapCd <= 0) {
    const center = bestClapCenter(targets, from);
    if (center) return { path, action: { type: 'clap', center } };
  }

  let target: Unit | null = null;
  let bestValue = -1;
  for (const p of targets) {
    if (!canTarget(grid, e, from, p)) continue;
    const hc = hitChance(grid, e, from, p).chance;
    const value = hc * ((e.weapon.dmg[0] + e.weapon.dmg[1]) / 2) + (p.hp <= e.weapon.dmg[1] ? 120 : 0);
    if (value > bestValue) { bestValue = value; target = p; }
  }
  return { path, action: target ? { type: 'shoot', target } : null };
}

function bestClapCenter(targets: Unit[], from: Pos): Pos | null {
  let best: Pos | null = null;
  let bestCount = 0;
  for (const p of targets) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const c = { x: p.x + dx, y: p.y + dy };
        if (dist(c, from) > CLAP_RANGE) continue;
        const count = targets.filter((t) => Math.abs(t.x - c.x) <= 1 && Math.abs(t.y - c.y) <= 1).length;
        if (count > bestCount) { bestCount = count; best = c; }
      }
    }
  }
  return best;
}
