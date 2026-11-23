/**
 * Dev-only autoplay: plays whole campaigns to check difficulty. Not imported by the game.
 * In the browser console:  const a = await import('/src/dev/autoplay.ts'); a.campaign()
 * then read window.__sim for progress and results.
 *
 * The bot is deliberately plain: it moves to the best covered tile with a shot and fires,
 * advances when nothing is in range, and the medic heals. No other specials, so its
 * results are a floor; a person playing well does better.
 */
import { canTarget, hitChance } from '../tactics/Combat';
import { dist, type Pos } from '../tactics/Grid';
import type { Unit } from '../tactics/Unit';
import { CHARACTERS } from '../data/characters';
import { MISSIONS } from '../data/missions';
import { UPGRADES, squadSize, upgradeLevel } from '../data/upgrades';
import { loadSave, writeSave, progressFor, type SaveData } from '../save';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Scene = any;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(fn: () => boolean, timeout = 180000) {
  const t = Date.now();
  while (!fn()) {
    if (Date.now() - t > timeout) throw new Error('timeout');
    await sleep(40);
  }
}

const SPEED = 25;
const BUY_ORDER = ['toast', 'mindfully-blind', 'never-heard', 'wreck', 'vision', 'pen-and-paper', 'glass-slipper',
  'indy-blvd', 'fire-sale', 'no-running', 'crown', 'electric-ones', 'been-here-before', 'distraction'];
const UPGRADE_ORDER = ['squad5', 'dmg-auto', 'dmg-close', 'squad6', 'dmg-spec', 'ap'];

function shotValue(m: Scene, u: Unit, from: Pos, e: Unit) {
  if (!canTarget(m.grid, u, from, e)) return 0;
  const p = hitChance(m.grid, u, from, e).chance / 100;
  const avg = ((u.weapon.dmg[0] + u.weapon.dmg[1]) / 2) * u.weapon.shots;
  // a checked-in bandmate is freed by any hit on Hotel California
  const freeing = e.controlling ? 6 : 0;
  return p * avg + (e.hp <= u.weapon.dmg[1] * u.weapon.shots ? p * 3 : 0) + p * freeing;
}

/** How exposed a tile is to awake covers (0 = safe). */
function exposure(m: Scene, t: Pos) {
  let s = 0;
  for (const e of m.enemies() as Unit[]) {
    if (!e.active || dist(t, e) > 13 || !m.grid.los(t, e)) continue;
    const c = m.grid.coverAgainst(t, e).cover;
    s += c === 2 ? 0.1 : c === 1 ? 0.6 : 1.6;
  }
  return s;
}

async function act(m: Scene, u: Unit) {
  m.select(u);
  // medic: patch up anyone below half
  if (u.special?.kind === 'heal' && u.cooldown <= 0 && (m.healTargets(u) as Unit[]).some((p) => p.hp <= p.maxHp / 2)) {
    m.onSpecial();
    await m.executePending();
    return;
  }
  // squad-wide specials a sensible player fires as soon as covers are awake
  const awake = (m.enemies() as Unit[]).filter((e) => e.active).length;
  if (u.cooldown <= 0 && awake >= 2 && (u.special?.kind === 'taunt' || (u.special?.kind === 'mark' && m.targetsFor(u, 12).length))) {
    m.onSpecial();
    await m.executePending();
    return;
  }
  const occ = m.occupied(u);
  const near: Map<string, { x: number; y: number; cost: number }> = m.grid.reachable(u, u.move, occ);
  let best: { t: Pos; tgt: Unit | null; score: number } | null = null;
  for (const n of near.values()) {
    const t = { x: n.x, y: n.y };
    let sv = 0;
    let tgt: Unit | null = null;
    for (const e of m.enemies() as Unit[]) { const v = shotValue(m, u, t, e); if (v > sv) { sv = v; tgt = e; } }
    const score = sv * 2 - exposure(m, t) - n.cost * 0.05;
    if (tgt && (!best || score > best.score)) best = { t, tgt, score };
  }
  if (best && best.tgt) {
    if (best.t.x !== u.x || best.t.y !== u.y) {
      await m.moveSelected(best.t);
      if (!u.alive || m.phase !== 'player') return;
      m.select(u);
    }
    if (u.ap > 0 && best.tgt.alive && canTarget(m.grid, u, u, best.tgt)) {
      m.pending = { kind: 'shoot', target: best.tgt };
      await m.executePending();
    }
    return;
  }
  // nothing in range: advance toward the nearest cover song, preferring cover
  const far: Map<string, { x: number; y: number; cost: number }> = m.grid.reachable(u, u.move, occ);
  let pick: Pos | null = null;
  let ps = Infinity;
  for (const n of far.values()) {
    const nearest = Math.min(...(m.enemies() as Unit[]).map((e) => dist(n, e)));
    const s = nearest + exposure(m, n) * 3;
    if (s < ps) { ps = s; pick = { x: n.x, y: n.y }; }
  }
  if (pick && (pick.x !== u.x || pick.y !== u.y)) await m.moveSelected(pick);
  else u.ap = 0;
}

/** Plays one show to the end. */
export async function playMission(missionIndex: number, squad: string[]) {
  const g = (window as any).__game;
  g.scene.getScenes(true).forEach((s: any) => g.scene.stop(s.scene.key));
  g.scene.start('Mission', { squad, mission: missionIndex });
  await sleep(300);
  const m = g.scene.getScene('Mission');
  m.time.timeScale = SPEED;
  m.tweens.timeScale = SPEED;
  // skip the scene and intro cards
  while (m.phase !== 'player' && m.phase !== 'over') {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27 }));
    await sleep(80);
  }
  while (m.phase !== 'over') {
    await until(() => m.phase === 'player' || m.phase === 'over');
    if (m.phase === 'over') break;
    if (m.turn > 30) break; // stalemate guard
    for (const u of [...m.players()] as Unit[]) {
      if (m.phase !== 'player') break;
      for (let k = 0; k < 3 && u.alive && u.ap > 0 && !u.controlledBy && m.phase === 'player'; k++) await act(m, u);
    }
    if (m.phase === 'player') m.endPlayerTurn();
    await sleep(20);
  }
  const victory = m.enemies().length === 0;
  return { victory, turns: m.turn, survivors: m.players().length, squadSize: squad.length };
}

function spend(save: SaveData) {
  // level-ups: rotate aim, health, attack
  for (const [id, p] of Object.entries(save.progress)) {
    while (p.picks > 0) { const k = (['aim', 'hp', 'atk'] as const)[p.level % 3]; p[k]++; p.picks--; void id; }
  }
  // buy songs to fill the squad, then upgrades
  let bought = true;
  while (bought) {
    bought = false;
    if (save.unlocked.length < squadSize(save) + 2) {
      const c = BUY_ORDER.map((id) => CHARACTERS.find((x) => x.id === id)!).find((x) => !save.unlocked.includes(x.id) && x.price <= save.coins);
      if (c) { save.coins -= c.price; save.unlocked.push(c.id); bought = true; continue; }
      if (save.unlocked.length < squadSize(save)) break; // save up for the next song first
    }
    for (const id of UPGRADE_ORDER) {
      const u = UPGRADES.find((x) => x.id === id)!;
      const lvl = upgradeLevel(save, id);
      if (lvl >= u.prices.length || (u.requires && !upgradeLevel(save, u.requires))) continue;
      // squad-size upgrades only when there is also money for the song to fill the slot
      const reserve = id.startsWith('squad') ? 300 : 0;
      if (u.prices[lvl] + reserve <= save.coins) { save.coins -= u.prices[lvl]; save.upgrades[id] = lvl + 1; bought = true; }
      break; // buy upgrades in order
    }
  }
}

function chooseSquad(save: SaveData) {
  const lvl = (id: string) => save.progress[id]?.level ?? 1;
  // the medic and the tank always come along; the rest by level
  const must = ['mindfully-blind', 'toast'].filter((id) => save.unlocked.includes(id));
  const rest = save.unlocked.filter((id) => !must.includes(id)).sort((a, b) => lvl(b) - lvl(a));
  return [...must, ...rest].slice(0, squadSize(save));
}

/** Plays the whole tour from a fresh save, retrying lost shows. Results in window.__sim. */
export async function campaign(opts: { maxAttempts?: number } = {}) {
  const maxAttempts = opts.maxAttempts ?? 5;
  const g = (window as any).__game;
  const sim: any = ((window as any).__sim = { running: true, log: [] as any[], done: false });
  try { localStorage.removeItem('mb-cover-wars-save-v1'); } catch { /* ignore */ }
  for (let i = 0; i < MISSIONS.length; i++) {
    let won = false;
    for (let attempt = 1; attempt <= maxAttempts && !won; attempt++) {
      const before = loadSave();
      const squad = chooseSquad(before);
      const levels = squad.map((id) => before.progress[id]?.level ?? 1);
      const r = await playMission(i, squad);
      await until(() => g.scene.isActive('Results'), 20000).catch(() => {});
      await sleep(300);
      const save = loadSave();
      for (const id of squad) progressFor(save, id);
      spend(save);
      writeSave(save);
      won = r.victory;
      sim.log.push({ level: i + 1, venue: MISSIONS[i].venue, attempt, ...r, levels, coins: save.coins,
        owned: save.unlocked.length, upgrades: { ...save.upgrades } });
    }
    if (!won) { sim.stuckAt = i + 1; break; }
  }
  sim.running = false;
  sim.done = true;
  return sim;
}
