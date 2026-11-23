import Phaser from 'phaser';
import { COLORS, HUD_Y, TILE, WS, css } from '../config';
import { Grid, Pos, ReachNode, dist, key } from '../tactics/Grid';
import { Unit, tileToWorld } from '../tactics/Unit';
import { BARRICADE_DEF, BRACE_AIM, ShotMods, canTarget, hitChance, rollDamage } from '../tactics/Combat';
import { TAUNT_RANGE, planEnemy } from '../tactics/EnemyAI';
import { getCharacter } from '../data/characters';
import { gunBlurb } from '../data/weapons';
import { BAND_COMEBACKS, ENEMIES, FREED_LINES, HYPNO_LINES } from '../data/enemies';
import { ENEMY_CHARS, MISSIONS, MissionDef, Scene as ShowScene, mapTiles } from '../data/missions';
import { NPCS } from '../data/npcs';
import { ENEMY_INTROS } from '../data/intros';
import { loadSave, loadSeen, markSeen } from '../save';
import { boostedStats, enemyVeterancy } from '../data/progress';
import { THEMES, Theme, buildVenue, venueTile } from '../art/venues';
import { Hud, HudState } from '../ui/Hud';
import { txt } from '../ui/text';
import { sfx } from '../audio/Synth';
import { Music } from '../audio/Music';

type Mode = 'idle' | 'shoot' | 'special';
interface Pending { kind: 'shoot' | 'special'; target?: Unit; tile?: Pos }
interface AttackOpts extends ShotMods { dmgBonus?: number; critOnFlank?: boolean; leaf?: boolean; noCrit?: boolean }

const GRENADE_RANGE = 6;
const ROCKET_RANGE = 9;
const ROCKET_DMG = 4;
const GRENADE_DMG = 3;
const FAN_RANGE = 7;
const FAN_SHOTS = 6;
const FAN_AIM = -10;
const CHARGE_RANGE = 5;
const CHARGE_DMG = 5;
const MARK_RANGE = 14;
const FLAME_RANGE = 4;
const FLAME_DMG = 2;
const FLAME_BURN = 2;
const FLAME_ANGLE = 0.62; // half-width of the cone, radians
const CHAIN_DMG = 3;
const CHAIN_JUMP_DMG = 2;
const CHAIN_JUMPS = 2;
const CHAIN_JUMP_RANGE = 3.5;
const OW_AIM = -10;
const HEAL_RANGE = 4;
const FULL_HEAL = true; // You Can Breathe restores everyone to full HP
const BLINK_RANGE = 6;
const SERIAL_CUT = 1; // damage Pen & Paper gives up per shot while Bleed You Dry is on
const DECOY_RANGE = 6;
const DEPLOY_RANGE = 4; // how far Indy Blvd can throw his barricade // how far Distraction can throw his fake
const BLINK_AIM = 15;
const TUTORIAL: { on: string; text: string }[] = [
  { on: 'move', text: 'CLICK A BLUE TILE TO MOVE. GOLD TILES ARE A DASH: FARTHER, BUT IT USES BOTH ACTIONS.' },
  { on: 'shoot', text: 'SHIELDS SHOW COVER: HALF IS -20 AIM, FULL IS -40. CLICK AN ENEMY TO AIM, THEN FIRE.' },
  { on: 'special', text: 'NICE SHOT! EVERY SONG HAS A SPECIAL. SELECT SOMEONE AND PRESS SPECIAL (OR KEY 2).' },
  { on: 'end', text: "ATTACKING ENDS THAT SONG'S TURN. WHEN EVERYONE'S DONE, PRESS END TURN." },
  { on: '', text: 'NOW THE COVERS SHOOT BACK. STAY IN COVER, FLANK THEM, AND KNOCK THEM ALL OUT!' },
];
const HYPNO_TINT = 0xc77dff;
const TAUNT_ARMOR = 1; // damage Toast shrugs off per hit while taunting
const AMBUSH_DMG = 2; // ESYNH's shot out of stealth
const TILE_SPECIALS = new Set(['grenade', 'rocket', 'flame', 'blink', 'decoy', 'deploy']);
const TARGET_SPECIALS = new Set(['aimedShot', 'chain', 'charge', 'axe', 'grapple']);
const MELEE_SPECIALS = new Set(['charge', 'axe']);
const AXE_RANGE = 4;
const GRAPPLE_RANGE = 7; // Been Here Before's hook
const GRAPPLE_DMG = 4;
const AXE_DMG = 6;
const CLAP_DMG = 2;
const ACTIVATE_RANGE = 10;

export class MissionScene extends Phaser.Scene {
  grid!: Grid;
  units: Unit[] = [];
  tileImgs: Phaser.GameObjects.Image[][] = [];
  shadows!: Phaser.GameObjects.Graphics;
  world!: Phaser.GameObjects.Container;
  under!: Phaser.GameObjects.Graphics; // ranges, paths (below units)
  over!: Phaser.GameObjects.Graphics; // reticles, aim lines (above units)
  overC!: Phaser.GameObjects.Container;
  markers: Phaser.GameObjects.GameObject[] = [];
  hud!: Hud;

  phase: 'player' | 'enemy' | 'busy' | 'over' = 'player';
  turn = 1;
  selected: Unit | null = null;
  mode: Mode = 'idle';
  pending: Pending | null = null;
  reach: Map<string, ReachNode> | null = null;
  hover: Pos | null = null;
  touchPreview: string | null = null;
  kills = 0;
  killsBy: Record<string, number> = {}; // knockouts per band member, for XP
  squad: string[] = [];
  missionIndex = 0;
  mission!: MissionDef;
  theme!: Theme;
  tutStep = -1;
  tutText?: Phaser.GameObjects.Text;
  tutBg?: Phaser.GameObjects.Rectangle;

  constructor() { super('Mission'); }

  init(data: { squad: string[]; mission?: number }) {
    this.squad = data.squad;
    this.missionIndex = Phaser.Math.Clamp(data.mission ?? 0, 0, MISSIONS.length - 1);
    this.mission = MISSIONS[this.missionIndex];
    this.theme = THEMES[this.mission.theme];
    this.tutStep = -1;
    this.units = [];
    this.tileImgs = [];
    this.markers = [];
    this.phase = 'busy';
    this.turn = 1;
    this.selected = null;
    this.mode = 'idle';
    this.pending = null;
    this.reach = null;
    this.hover = null;
    this.touchPreview = null;
    this.kills = 0;
    this.killsBy = {};
  }

  // ================================================================ setup

  create() {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    const rows = this.mission.map;
    buildVenue(this, this.theme);
    this.grid = new Grid(mapTiles(rows));

    const tilesC = this.add.container(0, 0).setScale(WS).setDepth(0);
    for (let y = 0; y < this.grid.rows; y++) {
      this.tileImgs.push([]);
      for (let x = 0; x < this.grid.cols; x++) {
        const img = this.add.image(x * TILE, y * TILE, venueTile(this.theme.id, this.grid.tiles[y][x], x, y)).setOrigin(0);
        tilesC.add(img);
        this.tileImgs[y].push(img);
      }
    }
    // soft shadows where walls and cover meet the floor
    this.shadows = this.add.graphics();
    tilesC.add(this.shadows);
    this.drawShadows();
    // venue lighting: a glow on the stage, plus the room's own mood
    const lights = this.add.graphics();
    tilesC.add(lights);
    const mapW = this.grid.cols * TILE, mapH = this.grid.rows * TILE;
    if (this.theme.light) lights.fillStyle(this.theme.light.color, this.theme.light.alpha).fillRect(0, 0, mapW, mapH);
    for (let y = 0; y < this.grid.rows; y++)
      for (let x = 0; x < this.grid.cols; x++)
        if (this.grid.tiles[y][x] === 'stage') lights.fillStyle(COLORS.pink, 0.08).fillRect(x * TILE, y * TILE, TILE, TILE);
    if (this.theme.disco) {
      // disco-ball spots drifting slowly across the hall
      for (let i = 0; i < 14; i++) {
        const spot = this.add.rectangle(Phaser.Math.Between(16, mapW - 16), Phaser.Math.Between(20, mapH - 8), 2, 2,
          Phaser.Utils.Array.GetRandom([0xffffff, 0xfff4c8, 0xcfe8ff, 0xffc2e0]), 0.55);
        tilesC.add(spot);
        this.tweens.add({
          targets: spot, x: spot.x + Phaser.Math.Between(40, 90), alpha: { from: 0.15, to: 0.6 },
          duration: Phaser.Math.Between(2500, 4500), yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
      }
    }
    if (this.theme.trippy) {
      const glow = this.add.rectangle(0, 0, mapW, mapH, 0xff4fa3, 0.08).setOrigin(0).setBlendMode(Phaser.BlendModes.ADD);
      tilesC.add(glow);
      this.tweens.addCounter({
        from: 0, to: 360, duration: 6000, repeat: -1,
        onUpdate: (tw) => glow.setFillStyle(Phaser.Display.Color.HSVToRGB((tw.getValue() ?? 0) / 360, 0.7, 1).color, 0.08),
      });
    }
    // a soft vignette pulls the eye to the middle of the room
    const vig = this.add.graphics();
    tilesC.add(vig);
    for (let i = 0; i < 6; i++) {
      const a = 0.07 * (1 - i / 6);
      vig.fillStyle(0x0b0710, a);
      vig.fillRect(0, mapH - 3 - i * 3, mapW, 3);
      vig.fillRect(i * 3, 0, 3, mapH);
      vig.fillRect(mapW - 3 - i * 3, 0, 3, mapH);
    }

    const underC = this.add.container(0, 0).setScale(WS).setDepth(1);
    this.under = this.add.graphics();
    underC.add(this.under);
    this.world = this.add.container(0, 0).setScale(WS).setDepth(2);
    this.overC = this.add.container(0, 0).setScale(WS).setDepth(3);
    this.over = this.add.graphics();
    this.overC.add(this.over);

    // spawn
    const spawns: Pos[] = [];
    const vet = enemyVeterancy(this.missionIndex);
    const save = loadSave();
    rows.forEach((r, y) => [...r].forEach((ch, x) => {
      if (ch === 'P') spawns.push({ x, y });
      const eid = ENEMY_CHARS[ch];
      if (eid) {
        const d = ENEMIES[eid];
        this.units.push(new Unit(this, this.world, {
          id: d.id, team: 'enemy', name: d.name,
          archetype: { boss: 'BOSS', tank: 'TANK', elite: 'ELITE COVER', legend: 'LEGENDARY COVER', basic: 'COVER SONG' }[d.tier],
          hp: d.hp + vet.hp, aim: d.aim + vet.aim, move: d.move, weapon: d.weapon, tex: `enemy-${d.id}`, x, y, boss: d.boss,
        }));
      }
    }));
    this.squad.slice(0, spawns.length).forEach((id, i) => {
      const c = getCharacter(id);
      const st = boostedStats(c, save.progress[id]);
      this.units.push(new Unit(this, this.world, {
        id: c.id, team: 'player', name: c.short, archetype: c.archetype,
        hp: st.hp, aim: st.aim, move: c.move, weapon: st.weapon, special: c.special,
        tex: c.id, x: spawns[i].x, y: spawns[i].y, idleFx: c.idleFx,
      }));
    });

    this.hud = new Hud(this, {
      onShoot: () => this.onShoot(),
      onSpecial: () => this.onSpecial(),
      onNext: () => this.selectNext(true),
      onEnd: () => this.endPlayerTurn(),
      onConfirm: () => void this.executePending(),
      onCancel: () => this.cancel(),
    });

    this.bindInput();
    this.time.addEvent({ delay: 700, loop: true, callback: () => this.idleFx() });

    // intro
    this.hud.banner(`NIGHT ${this.missionIndex + 1}: ${this.mission.venue}`, css(COLORS.gold), 1400);
    this.time.delayedCall(1500, async () => {
      if (this.mission.scene) await this.playScene(this.mission.scene);
      await this.showIntros();
      this.hud.toast(this.mission.intro);
      this.startPlayerPhase(true);
      if (this.mission.tutorial) this.tutorial('start');
    });
    this.refresh();
  }

  update() {
    for (const u of this.units) u.sync();
    this.world.sort('depth');
  }

  // ================================================================ helpers

  /** Walls and cover cast a short shadow down and to the right onto open floor. */
  drawShadows() {
    const g = this.shadows;
    g.clear();
    for (let y = 0; y < this.grid.rows; y++)
      for (let x = 0; x < this.grid.cols; x++) {
        if (this.grid.walkable(x, y)) continue;
        if (this.grid.walkable(x, y + 1)) {
          g.fillStyle(0x0b0710, 0.3).fillRect(x * TILE, (y + 1) * TILE, TILE, 2);
          g.fillStyle(0x0b0710, 0.14).fillRect(x * TILE, (y + 1) * TILE + 2, TILE, 3);
        }
        if (this.grid.walkable(x + 1, y)) {
          g.fillStyle(0x0b0710, 0.2).fillRect((x + 1) * TILE, y * TILE + 3, 2, TILE - 3);
        }
      }
  }

  players() { return this.units.filter((u) => u.alive && u.isPlayer && !u.decoy); }
  decoys() { return this.units.filter((u) => u.alive && u.decoy); }
  enemies() { return this.units.filter((u) => u.alive && !u.isPlayer); }
  unitAt(x: number, y: number) { return this.units.find((u) => u.alive && u.x === x && u.y === y) ?? null; }
  occupied(except?: Unit) {
    return new Set(this.units.filter((u) => u.alive && u !== except).map((u) => key(u.x, u.y)));
  }
  targetsFor(u: Unit, range = u.weapon.range) {
    return this.enemies().filter((e) => canTarget(this.grid, u, u, e, range));
  }
  bestTarget(u: Unit, mods: ShotMods = {}) {
    let best: Unit | undefined;
    let bestCh = -1;
    for (const e of this.targetsFor(u)) {
      const ch = hitChance(this.grid, u, u, e, mods).chance;
      if (ch > bestCh) { bestCh = ch; best = e; }
    }
    return best;
  }

  wait(ms: number) { return new Promise<void>((r) => this.time.delayedCall(ms, () => r())); }
  tween(cfg: Phaser.Types.Tweens.TweenBuilderConfig) {
    return new Promise<void>((r) => this.tweens.add({ ...cfg, onComplete: () => r() }));
  }

  toTile(p: Phaser.Input.Pointer): Pos | null {
    if (p.y >= HUD_Y) return null;
    const x = Math.floor(p.x / (TILE * WS));
    const y = Math.floor(p.y / (TILE * WS));
    return this.grid.inBounds(x, y) ? { x, y } : null;
  }

  // ================================================================ input

  bindInput() {
    this.input.mouse?.disableContextMenu();
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const t = this.toTile(p);
      if ((t && this.hover && t.x === this.hover.x && t.y === this.hover.y) || (!t && !this.hover)) return;
      this.hover = t;
      if (this.phase === 'player') this.refresh();
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length) return; // a HUD button took it
      if (p.rightButtonDown()) { this.cancel(); return; }
      const t = this.toTile(p);
      if (!t || this.phase !== 'player') return;
      this.hover = t;
      this.onTileClick(t, p.wasTouch);
    });
    const kb = this.input.keyboard;
    if (!kb) return;
    kb.addCapture('TAB,SPACE');
    kb.on('keydown-ONE', () => this.onShoot());
    kb.on('keydown-TWO', () => this.onSpecial());
    kb.on('keydown-TAB', () => this.selectNext(true));
    kb.on('keydown-ESC', () => this.cancel());
    kb.on('keydown-SPACE', () => void this.executePending());
    kb.on('keydown-ENTER', () => { if (this.pending) void this.executePending(); else this.endPlayerTurn(); });
  }

  onTileClick(t: Pos, touch: boolean) {
    const u = this.selected;
    const clicked = this.unitAt(t.x, t.y);

    const sk = u && this.mode === 'special' ? u.special?.kind : undefined;
    if (u && sk && TILE_SPECIALS.has(sk)) {
      if (!this.validSpecialTile(u, t)) return;
      if (this.pending?.tile && this.pending.tile.x === t.x && this.pending.tile.y === t.y) void this.executePending();
      else { this.pending = { kind: 'special', tile: t }; this.refresh(); }
      return;
    }
    if (u && sk && TARGET_SPECIALS.has(sk) && clicked && !clicked.isPlayer) {
      if (!this.validSpecialTarget(u, clicked)) return;
      if (this.pending?.target === clicked) void this.executePending();
      else { this.pending = { kind: 'special', target: clicked }; this.refresh(); }
      return;
    }

    if (clicked?.isPlayer) { this.select(clicked); return; }

    if (clicked && !clicked.isPlayer) {
      if (u && u.ap > 0 && canTarget(this.grid, u, u, clicked)) {
        if (this.mode === 'shoot' && this.pending?.target === clicked) void this.executePending();
        else { this.mode = 'shoot'; this.pending = { kind: 'shoot', target: clicked }; sfx.click(); this.refresh(); }
      } else this.refresh();
      return;
    }

    // empty tile → movement
    if (this.mode !== 'idle') { this.cancel(); }
    if (!u || u.ap <= 0) return;
    if (!this.reach) this.refresh();
    const k = key(t.x, t.y);
    const node = this.reach?.get(k);
    if (!node || node.cost === 0) return;
    if (touch && this.touchPreview !== k) { this.touchPreview = k; this.refresh(); return; }
    void this.moveSelected(t);
  }

  select(u: Unit) {
    if (!u.alive || !u.isPlayer || u.decoy) return;
    if (u.controlledBy) { this.hud.toast('CHECKED IN! HIT HOTEL CALIFORNIA TO FREE THEM.'); return; }
    if (this.selected !== u) sfx.select();
    this.selected = u;
    this.mode = 'idle';
    this.pending = null;
    this.touchPreview = null;
    Music.playCharacter(this, u.id);
    this.refresh();
  }

  selectNext(manual: boolean) {
    if (this.phase !== 'player') return;
    const ps = this.players();
    if (!ps.length) return;
    const start = this.selected ? ps.indexOf(this.selected) : -1;
    for (let i = 1; i <= ps.length; i++) {
      const c = ps[(start + i + ps.length) % ps.length];
      if (c.ap > 0 && (c !== this.selected || !manual)) { this.select(c); return; }
    }
    if (!manual) this.refresh();
  }

  cancel() {
    if (this.phase !== 'player') return;
    this.mode = 'idle';
    this.pending = null;
    this.touchPreview = null;
    this.refresh();
  }

  onShoot() {
    const u = this.selected;
    if (this.phase !== 'player' || !u || u.ap <= 0) return;
    const t = this.bestTarget(u);
    if (!t) { this.hud.toast('NO TARGETS IN SIGHT'); return; }
    this.mode = 'shoot';
    this.pending = { kind: 'shoot', target: t };
    this.refresh();
  }

  onSpecial() {
    const u = this.selected;
    if (this.phase !== 'player' || !u || !u.special || u.ap <= 0) return;
    if (u.cooldown > 0) { this.hud.toast(`RECHARGING: ${u.cooldown} TURN${u.cooldown > 1 ? 'S' : ''}`); return; }
    this.mode = 'special';
    switch (u.special.kind) {
      case 'grenade': case 'rocket': case 'flame': case 'blink': case 'decoy': case 'deploy': this.pending = null; break;
      case 'aimedShot': this.pending = { kind: 'special', target: this.bestTarget(u, { aimBonus: 30, ignoreHalf: true }) }; break;
      case 'chain': this.pending = { kind: 'special', target: this.bestTarget(u) }; break;
      case 'grapple': {
        const opts = this.enemies().filter((e) => this.grapplePlan(u, e)).sort((a, b) => dist(u, a) - dist(u, b));
        this.pending = { kind: 'special', target: opts[0] };
        break;
      }
      case 'charge': case 'axe': {
        const options = this.enemies().filter((e) => this.chargePlan(u, e)).sort((a, b) => dist(u, a) - dist(u, b));
        this.pending = { kind: 'special', target: options[0] };
        break;
      }
      default: this.pending = { kind: 'special' };
    }
    this.refresh();
  }

  validSpecialTile(u: Unit, t: Pos) {
    const d = dist(u, t);
    switch (u.special?.kind) {
      case 'grenade': return d <= GRENADE_RANGE;
      case 'rocket': return d > 0 && d <= ROCKET_RANGE && this.grid.los(u, t); // flies straight: needs a clear line
      case 'flame': return d > 0 && d <= FLAME_RANGE + 0.5;
      case 'blink': return d > 0 && d <= BLINK_RANGE && this.grid.walkable(t.x, t.y) && !this.unitAt(t.x, t.y);
      case 'deploy': return d > 0 && d <= DEPLOY_RANGE + 0.5 && this.grid.walkable(t.x, t.y) && !this.unitAt(t.x, t.y);
      case 'decoy': return d > 0 && d <= DECOY_RANGE && this.grid.walkable(t.x, t.y) && !this.unitAt(t.x, t.y);
      default: return false;
    }
  }

  validSpecialTarget(u: Unit, e: Unit) {
    if (MELEE_SPECIALS.has(u.special?.kind ?? '')) return !!this.chargePlan(u, e);
    if (u.special?.kind === 'grapple') return !!this.grapplePlan(u, e);
    return canTarget(this.grid, u, u, e);
  }

  /** Where Wreck ends up to smash `e`: the cheapest tile next to it within charge range. */
  chargePlan(u: Unit, e: Unit): { dest: Pos; path: Pos[] } | null {
    if (!e.alive || e.isPlayer) return null;
    if (Math.abs(u.x - e.x) <= 1 && Math.abs(u.y - e.y) <= 1) return { dest: { x: u.x, y: u.y }, path: [] };
    const reach = this.grid.reachable(u, u.special?.kind === 'axe' ? AXE_RANGE : CHARGE_RANGE, this.occupied(u));
    let best: ReachNode | undefined;
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) {
        const n = reach.get(key(e.x + dx, e.y + dy));
        if ((dx || dy) && n && (!best || n.cost < best.cost)) best = n;
      }
    return best ? { dest: { x: best.x, y: best.y }, path: this.grid.pathTo(reach, best) } : null;
  }

  /** Where Been Here Before lands when he hooks `e`: the open tile next to it closest to him. */
  grapplePlan(u: Unit, e: Unit): { dest: Pos } | null {
    if (!e.alive || e.isPlayer || e.stealth) return null;
    if (Math.abs(u.x - e.x) <= 1 && Math.abs(u.y - e.y) <= 1) return { dest: { x: u.x, y: u.y } };
    if (dist(u, e) > GRAPPLE_RANGE || !this.grid.los(u, e)) return null;
    let best: Pos | null = null;
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) {
        const t = { x: e.x + dx, y: e.y + dy };
        if ((!dx && !dy) || !this.grid.walkable(t.x, t.y) || this.unitAt(t.x, t.y)) continue;
        if (!best || dist(u, t) < dist(u, best)) best = t;
      }
    return best ? { dest: best } : null;
  }

  /** Tiles in Fire Sale's flame cone, aimed at `t`. */
  coneTiles(u: Pos, t: Pos): Pos[] {
    const ang = Math.atan2(t.y - u.y, t.x - u.x);
    const out: Pos[] = [];
    for (let y = 0; y < this.grid.rows; y++)
      for (let x = 0; x < this.grid.cols; x++) {
        const d = dist(u, { x, y });
        if (d === 0 || d > FLAME_RANGE + 0.5 || this.grid.isWall(x, y)) continue;
        let diff = Math.atan2(y - u.y, x - u.x) - ang;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        if (Math.abs(diff) > FLAME_ANGLE || !this.grid.los(u, { x, y })) continue;
        out.push({ x, y });
      }
    return out;
  }

  /** Electric Ones' lightning path: the first target, then up to 2 jumps to the nearest new enemy. */
  chainTargets(first: Unit): Unit[] {
    const hit = [first];
    let last = first;
    for (let i = 0; i < CHAIN_JUMPS; i++) {
      const next = this.enemies()
        .filter((e) => !hit.includes(e) && dist(e, last) <= CHAIN_JUMP_RANGE)
        .sort((a, b) => dist(a, last) - dist(b, last))[0];
      if (!next) break;
      hit.push(next);
      last = next;
    }
    return hit;
  }

  healTargets(u: Unit) { return this.players().filter((p) => dist(p, u) <= HEAL_RANGE); }

  // ================================================================ overlay + HUD

  refresh() {
    const g = this.under;
    const o = this.over;
    g.clear();
    o.clear();
    this.markers.forEach((m) => m.destroy());
    this.markers = [];
    this.reach = null;

    const u = this.selected?.alive ? this.selected : null;
    const myTurn = this.phase === 'player';

    if (u && myTurn) {
      g.lineStyle(1, COLORS.cyan, 1).strokeRect(u.x * TILE + 1.5, u.y * TILE + 1.5, 13, 13);

      if (this.mode === 'idle' && u.ap > 0) {
        this.reach = this.grid.reachable(u, u.move * (u.ap >= 2 ? 2 : 1), this.occupied(u));
        for (const n of this.reach.values()) {
          if (n.cost === 0) continue;
          const blue = n.cost <= u.move;
          g.fillStyle(blue ? 0x3a8bff : 0xffc83a, blue ? 0.24 : 0.2).fillRect(n.x * TILE + 1, n.y * TILE + 1, 14, 14);
        }
        const hv = this.hover;
        const hk = hv ? key(hv.x, hv.y) : '';
        const node = this.reach.get(hk);
        if (hv && node && node.cost > 0) this.drawMovePreview(u, hv, node);
      }

      if (u.ap > 0 && (this.mode === 'idle' || this.mode === 'shoot')) {
        for (const e of this.targetsFor(u)) this.reticle(e, this.pending?.target === e ? COLORS.gold : COLORS.red);
      }
      if (this.pending?.target) this.aimLine(u, this.pending.target);
      if (this.mode === 'special' && u.special) this.drawSpecialPreview(u);
    }

    // status markers: Second Sight eyes over marked enemies, a watch ring under No Running
    for (const e of this.enemies()) if (e.marked) {
      const cx = e.x * TILE + 8, cy = e.y * TILE - 12;
      o.fillStyle(COLORS.cyan, 1).fillRect(cx - 3, cy, 7, 1).fillRect(cx - 2, cy - 1, 5, 3);
      o.fillStyle(0x0b0710, 1).fillRect(cx, cy, 1, 1);
    }
    // Hotel California's hold: a wavy purple line to the checked-in band member, swirl over their head
    for (const e of this.enemies()) if (e.controlling?.alive) {
      const a = e.chest(), b = e.controlling.chest();
      o.fillStyle(HYPNO_TINT, 0.8);
      for (let i = 2; i < 30; i++) {
        const t = i / 30, wob = Math.sin(t * Math.PI * 6) * 2;
        if (i % 2) o.fillRect(Math.round(a.x + (b.x - a.x) * t + wob), Math.round(a.y + (b.y - a.y) * t - wob), 1, 1);
      }
      o.lineStyle(1, HYPNO_TINT, 1).strokeCircle(b.x, e.controlling.sprite.y - 24, 3);
      o.lineStyle(1, 0xffffff, 1).strokeCircle(b.x, e.controlling.sprite.y - 24, 1.5);
    }
    // Wonderwall's singalong range
    for (const e of this.enemies()) {
      const aura = ENEMIES[e.id]?.aura;
      if (aura && e.active) o.lineStyle(1, 0xd89a4a, 0.45).strokeCircle(e.x * TILE + 8, e.y * TILE + 8, aura.range * TILE + 8);
    }
    for (const p of this.players()) if (p.braced) o.lineStyle(1, 0xffd34f, 0.9).strokeRect(p.x * TILE + 2.5, p.y * TILE + 12.5, 11, 3);
    for (const p of this.players()) if (p.serial) o.lineStyle(1, 0xd8344a, 1).strokeEllipse(p.x * TILE + 8, p.y * TILE + 14, 16, 6);
    for (const d of this.decoys()) o.lineStyle(1, 0xd27aff, 1).strokeEllipse(d.x * TILE + 8, d.y * TILE + 14, 18, 7);
    for (const p of this.players()) if (p.taunting) {
      o.lineStyle(1, 0xff4f4f, 1).strokeEllipse(p.x * TILE + 8, p.y * TILE + 14, 18, 7);
    }
    for (const p of this.players()) if (p.overwatch) {
      o.lineStyle(1, COLORS.gold, 1).strokeEllipse(p.x * TILE + 8, p.y * TILE + 14, 16, 6);
    }

    this.hud.render(this.hudState());
  }

  drawMovePreview(u: Unit, hv: Pos, node: ReachNode) {
    const g = this.under;
    const path = this.grid.pathTo(this.reach!, hv);
    const dash = node.cost > u.move;
    g.fillStyle(dash ? COLORS.gold : COLORS.cyan, 1);
    let prev = { x: u.x, y: u.y };
    for (const p of path) {
      const ax = prev.x * TILE + 8, ay = prev.y * TILE + 8;
      const bx = p.x * TILE + 8, by = p.y * TILE + 8;
      g.fillRect(Math.round((ax + bx) / 2) - 1, Math.round((ay + by) / 2) - 1, 2, 2);
      prev = p;
    }
    g.lineStyle(1, dash ? COLORS.gold : COLORS.cyan, 1).strokeRect(hv.x * TILE + 0.5, hv.y * TILE + 0.5, 15, 15);
    if (this.touchPreview === key(hv.x, hv.y)) {
      this.addMarker(txt(this, hv.x * TILE + 8, hv.y * TILE - 2, 'TAP', 8, css(COLORS.cyan)).setOrigin(0.5, 1).setScale(0.5));
    }
    // cover shields
    for (const c of this.grid.coverAround(hv)) {
      const img = this.add.image(hv.x * TILE + 8 + c.dir.x * 7, hv.y * TILE + 8 + c.dir.y * 7, c.cover === 2 ? 'shield-full' : 'shield-half');
      this.addMarker(img);
    }
    // flank warning: any alert enemy that would see this tile with no cover
    const exposed = this.enemies().some((e) =>
      e.active && dist(e, hv) <= 12 && this.grid.los(e, hv) && this.grid.coverAgainst(hv, e).cover === 0);
    if (exposed) this.addMarker(this.add.image(hv.x * TILE + 13, hv.y * TILE + 3, 'warn'));
  }

  drawSpecialPreview(u: Unit) {
    const o = this.over;
    const kind = u.special!.kind;
    if (kind === 'grenade' || kind === 'rocket') {
      const g = this.under;
      for (let y = 0; y < this.grid.rows; y++)
        for (let x = 0; x < this.grid.cols; x++)
          if (this.validSpecialTile(u, { x, y }) && !this.grid.isWall(x, y))
            g.fillStyle(COLORS.cyan, 0.08).fillRect(x * TILE, y * TILE, 16, 16);
      const t = this.pending?.tile ?? (this.hover && this.validSpecialTile(u, this.hover) ? this.hover : null);
      if (t) {
        o.fillStyle(COLORS.cyan, this.pending?.tile ? 0.35 : 0.2).fillRect((t.x - 1) * TILE, (t.y - 1) * TILE, 48, 48);
        o.lineStyle(1, 0xffffff, 1).strokeRect((t.x - 1) * TILE + 0.5, (t.y - 1) * TILE + 0.5, 47, 47);
      }
    } else if (kind === 'fanfire') {
      for (const e of this.targetsFor(u, FAN_RANGE)) { this.reticle(e, COLORS.gold); this.aimLine(u, e); }
    } else if (kind === 'aimedShot') {
      for (const e of this.targetsFor(u)) this.reticle(e, this.pending?.target === e ? COLORS.gold : COLORS.red);
    } else if (kind === 'stealth') {
      o.lineStyle(1, COLORS.pink, 1).strokeCircle(u.x * TILE + 8, u.y * TILE + 8, 10);
    } else if (kind === 'grapple') {
      for (const e of this.enemies()) if (this.grapplePlan(u, e)) this.reticle(e, this.pending?.target === e ? COLORS.gold : COLORS.red);
      const t = this.pending?.target;
      const plan = t ? this.grapplePlan(u, t) : null;
      if (t && plan) {
        o.lineStyle(1, 0x9aa2ac, 0.9).lineBetween(u.chest().x, u.chest().y, t.chest().x, t.chest().y);
        o.lineStyle(1, COLORS.gold, 1).strokeRect(plan.dest.x * TILE + 0.5, plan.dest.y * TILE + 0.5, 15, 15);
      }
    } else if (kind === 'charge' || kind === 'axe') {
      for (const e of this.enemies()) if (this.chargePlan(u, e)) this.reticle(e, this.pending?.target === e ? COLORS.gold : COLORS.red);
      const t = this.pending?.target;
      const plan = t ? this.chargePlan(u, t) : null;
      if (plan) {
        o.fillStyle(COLORS.gold, 1);
        for (const p of plan.path) o.fillRect(p.x * TILE + 7, p.y * TILE + 7, 2, 2);
        if (kind === 'charge') o.fillStyle(0xff7a2a, 0.25).fillRect((t!.x - 1) * TILE, (t!.y - 1) * TILE, 48, 48);
      }
    } else if (kind === 'mark') {
      for (const e of this.targetsFor(u, MARK_RANGE)) { this.reticle(e, COLORS.cyan); this.aimLine(u, e); }
    } else if (kind === 'flame') {
      const g = this.under;
      for (let y = 0; y < this.grid.rows; y++)
        for (let x = 0; x < this.grid.cols; x++)
          if (this.validSpecialTile(u, { x, y }) && !this.grid.isWall(x, y))
            g.fillStyle(0xff9a2e, 0.08).fillRect(x * TILE, y * TILE, 16, 16);
      const t = this.pending?.tile ?? (this.hover && this.validSpecialTile(u, this.hover) ? this.hover : null);
      if (t) for (const c of this.coneTiles(u, t)) {
        o.fillStyle(0xff5a1a, this.pending?.tile ? 0.45 : 0.28).fillRect(c.x * TILE, c.y * TILE, 16, 16);
      }
    } else if (kind === 'chain') {
      for (const e of this.targetsFor(u)) this.reticle(e, this.pending?.target === e ? COLORS.gold : COLORS.red);
      const t = this.pending?.target;
      if (t) {
        const chain = this.chainTargets(t);
        o.lineStyle(1, COLORS.cyan, 0.9);
        for (let i = 1; i < chain.length; i++) {
          this.reticle(chain[i], COLORS.cyan);
          o.lineBetween(chain[i - 1].chest().x, chain[i - 1].chest().y, chain[i].chest().x, chain[i].chest().y);
        }
      }
    } else if (kind === 'overwatch') {
      o.lineStyle(1, COLORS.gold, 1).strokeEllipse(u.x * TILE + 8, u.y * TILE + 14, 16, 6);
      for (const e of this.enemies()) if (this.grid.los(u, e) && dist(u, e) <= u.weapon.range) this.reticle(e, COLORS.gold);
    } else if (kind === 'heal') {
      o.lineStyle(1, COLORS.green, 0.8).strokeCircle(u.x * TILE + 8, u.y * TILE + 8, HEAL_RANGE * TILE + 8);
      for (const p of this.healTargets(u)) o.lineStyle(1, COLORS.green, 1).strokeRect(p.x * TILE + 1.5, p.y * TILE + 1.5, 13, 13);
    } else if (kind === 'blink') {
      const g = this.under;
      for (let y = 0; y < this.grid.rows; y++)
        for (let x = 0; x < this.grid.cols; x++)
          if (this.validSpecialTile(u, { x, y })) g.fillStyle(0xcfefff, 0.12).fillRect(x * TILE + 1, y * TILE + 1, 14, 14);
      const t = this.pending?.tile ?? (this.hover && this.validSpecialTile(u, this.hover) ? this.hover : null);
      if (t) {
        o.lineStyle(1, 0xffffff, 1).strokeRect(t.x * TILE + 0.5, t.y * TILE + 0.5, 15, 15);
        const shot = this.blinkShot(u, t);
        if (shot) this.reticle(shot.target, COLORS.gold);
      }
    } else if (kind === 'deploy') {
      const g = this.under;
      for (let y = 0; y < this.grid.rows; y++)
        for (let x = 0; x < this.grid.cols; x++)
          if (this.validSpecialTile(u, { x, y })) g.fillStyle(0xffd34f, 0.12).fillRect(x * TILE + 1, y * TILE + 1, 14, 14);
      const t = this.pending?.tile ?? (this.hover && this.validSpecialTile(u, this.hover) ? this.hover : null);
      if (t) {
        o.lineStyle(1, 0xffd34f, 1).strokeRect(t.x * TILE + 0.5, t.y * TILE + 0.5, 15, 15);
        o.lineStyle(1, 0xffd34f, 0.6).lineBetween(t.x * TILE + 3, t.y * TILE + 3, t.x * TILE + 13, t.y * TILE + 13);
        o.lineBetween(t.x * TILE + 13, t.y * TILE + 3, t.x * TILE + 3, t.y * TILE + 13);
      }
    } else if (kind === 'decoy') {
      const g = this.under;
      for (let y = 0; y < this.grid.rows; y++)
        for (let x = 0; x < this.grid.cols; x++)
          if (this.validSpecialTile(u, { x, y })) g.fillStyle(0xd27aff, 0.12).fillRect(x * TILE + 1, y * TILE + 1, 14, 14);
      const t = this.pending?.tile ?? (this.hover && this.validSpecialTile(u, this.hover) ? this.hover : null);
      if (t) {
        o.lineStyle(1, 0xffffff, 1).strokeRect(t.x * TILE + 0.5, t.y * TILE + 0.5, 15, 15);
        o.lineStyle(1, 0xd27aff, 0.8).strokeCircle(t.x * TILE + 8, t.y * TILE + 8, TAUNT_RANGE * TILE);
        for (const e of this.enemies()) if (dist(e, t) <= TAUNT_RANGE) this.reticle(e, 0xd27aff);
      }
    } else if (kind === 'taunt') {
      o.lineStyle(1, 0xff4f4f, 0.8).strokeCircle(u.x * TILE + 8, u.y * TILE + 8, TAUNT_RANGE * TILE);
      for (const e of this.enemies()) if (dist(e, u) <= TAUNT_RANGE) this.reticle(e, 0xff4f4f);
    } else if (kind === 'rally') {
      for (const p of this.players()) if (p !== u) o.lineStyle(1, COLORS.gold, 1).strokeEllipse(p.x * TILE + 8, p.y * TILE + 14, 16, 6);
    }
  }

  /** Glass Slipper's free shot after teleporting to `t`: the best target from there. */
  blinkShot(u: Unit, t: Pos): { target: Unit; chance: number } | null {
    let best: { target: Unit; chance: number } | null = null;
    for (const e of this.enemies()) {
      if (!canTarget(this.grid, u, t, e)) continue;
      const chance = hitChance(this.grid, u, t, e, { aimBonus: BLINK_AIM }).chance;
      if (!best || chance > best.chance) best = { target: e, chance };
    }
    return best;
  }

  reticle(e: Unit, color: number) {
    const o = this.over;
    const x0 = e.x * TILE, y0 = e.y * TILE - 8, x1 = x0 + 15, y1 = y0 + 23;
    o.fillStyle(color, 1);
    for (const [x, y, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
      o.fillRect(dx > 0 ? x : x - 3, y, 4, 1);
      o.fillRect(x, dy > 0 ? y : y - 3, 1, 4);
    }
  }

  aimLine(a: Unit, b: Unit) {
    const o = this.over;
    const from = a.chest(), to = b.chest();
    const d = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
    o.fillStyle(COLORS.red, 0.9);
    for (let i = 6; i < d - 4; i += 4) {
      const t = i / d;
      o.fillRect(Math.round(from.x + (to.x - from.x) * t), Math.round(from.y + (to.y - from.y) * t), 1, 1);
    }
  }

  addMarker(m: Phaser.GameObjects.Image | Phaser.GameObjects.Text) {
    this.overC.add(m);
    this.markers.push(m);
  }

  hudState(): HudState {
    const u = this.selected?.alive ? this.selected : null;
    const myTurn = this.phase === 'player';
    let info: string[] = [];
    let infoColor = '#ffffff';
    let confirm: string | null = null;

    if (this.phase === 'enemy') info = ['ENEMY TURN...'];
    else if (this.phase === 'busy' || this.phase === 'over') info = [];
    else if (u) {
      const p = this.pending;
      if (p?.kind === 'shoot' && p.target) {
        info = this.shotLines(u, p.target, {}, u.serial ? -SERIAL_CUT : 0);
        confirm = 'FIRE';
      } else if (this.mode === 'special' && u.special) {
        ({ info, confirm } = this.specialInfo(u));
        infoColor = css(COLORS.gold);
      } else {
        const hv = this.hover ? this.unitAt(this.hover.x, this.hover.y) : null;
        if (hv && !hv.isPlayer) {
          info = [hv.name, `HP ${hv.hp}/${hv.maxHp}`, hv.active ? '' : 'UNAWARE'];
          infoColor = css(COLORS.red);
        } else if (u.ap > 0) {
          info = ['CLICK A TILE', 'TO MOVE, OR AN', 'ENEMY TO AIM.'];
          if (this.touchPreview) info = ['TAP AGAIN', 'TO MOVE.'];
        } else info = ['OUT OF ACTIONS.'];
      }
    }

    const sp = u?.special;
    return {
      unit: u,
      turn: this.turn,
      playerTurn: myTurn,
      canShoot: !!u && myTurn && u.ap > 0 && this.targetsFor(u).length > 0,
      canSpecial: !!u && myTurn && u.ap > 0 && !!sp && u.cooldown === 0,
      specialLabel: sp ? (u!.cooldown > 0 ? `${sp.name} (${u!.cooldown})` : sp.name) : 'SPECIAL',
      shootActive: this.mode === 'shoot',
      specialActive: this.mode === 'special',
      canNext: myTurn && this.players().some((p) => p.ap > 0 && p !== u),
      info,
      infoColor,
      confirm,
      showCancel: myTurn && this.mode !== 'idle',
    };
  }

  shotLines(u: Unit, t: Unit, mods: ShotMods, dmgBonus = 0, critOnFlank = false): string[] {
    const s = hitChance(this.grid, u, u, t, mods);
    const crit = critOnFlank && s.cover === 0 ? 100 : u.stealth ? 100 : s.crit;
    const [lo, hi] = u.weapon.dmg;
    const amb = u.stealth ? AMBUSH_DMG : 0; // ESYNH's shot out of stealth
    const shots = u.weapon.shots > 1 && !critOnFlank ? ` x${u.weapon.shots}` : '';
    const coverTxt = s.flanked ? 'FLANKED!' : ['NO COVER', 'HALF COVER', 'FULL COVER'][s.cover];
    return [`HIT  ${s.chance}%`, `CRIT ${crit}%`, `DMG  ${Math.max(1, lo + dmgBonus + amb)}-${Math.max(1, hi + dmgBonus + amb)}${shots}`, coverTxt];
  }

  specialInfo(u: Unit): { info: string[]; confirm: string | null } {
    const sp = u.special!;
    switch (sp.kind) {
      case 'grenade': case 'rocket': {
        const rocket = sp.kind === 'rocket';
        const t = this.pending?.tile;
        if (!t) return {
          info: rocket
            ? ['AIM: PICK A TILE', `RANGE ${ROCKET_RANGE}, CLEAR SHOT`, `3x3 BLAST, ${ROCKET_DMG} DMG`, 'DESTROYS COVER']
            : ['THROW: PICK A TILE', `RANGE ${GRENADE_RANGE}`, `3x3 BLAST, ${GRENADE_DMG} DMG`, 'DESTROYS COVER'],
          confirm: null,
        };
        const inArea = (p: Pos) => Math.abs(p.x - t.x) <= 1 && Math.abs(p.y - t.y) <= 1;
        const foes = this.enemies().filter(inArea).length;
        const allies = this.players().filter(inArea).length;
        let cover = 0;
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (this.grid.destructible(t.x + dx, t.y + dy)) cover++;
        const info = [`ENEMIES HIT: ${foes}`, `COVER BROKEN: ${cover}`];
        if (allies) info.push(`ALLIES HIT: ${allies}!`);
        return { info, confirm: rocket ? 'FIRE' : 'THROW' };
      }
      case 'fanfire': {
        const ts = this.targetsFor(u, FAN_RANGE);
        if (!ts.length) return { info: ['NO ENEMIES', `WITHIN ${FAN_RANGE} TILES.`], confirm: null };
        const avg = Math.round(ts.reduce((a, e) => a + hitChance(this.grid, u, u, e, { aimBonus: FAN_AIM }).chance, 0) / ts.length);
        return { info: [`${FAN_SHOTS} SHOTS`, `${ts.length} TARGET${ts.length > 1 ? 'S' : ''}`, `HIT ~${avg}% EACH`, `DMG ${u.weapon.dmg[0]}-${u.weapon.dmg[1]} EACH`], confirm: 'SIGN IT' };
      }
      case 'aimedShot': {
        const t = this.pending?.target;
        if (!t) return { info: ['NO TARGET', 'IN SIGHT.'], confirm: null };
        return { info: this.shotLines(u, t, { aimBonus: 30, ignoreHalf: true }, 1, true), confirm: 'TAKE SHOT' };
      }
      case 'stealth':
        return { info: ['VANISH: 1 ACTION,', 'THEN MOVE IN.', 'AMBUSH SHOT: CRIT', `+${AMBUSH_DMG} DMG.`], confirm: 'GO UNHEARD' };
      case 'charge': {
        const t = this.pending?.target;
        if (!t) return { info: ['NO ENEMY WITHIN', `${CHARGE_RANGE} MOVES.`], confirm: null };
        let cover = 0;
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (this.grid.destructible(t.x + dx, t.y + dy)) cover++;
        return { info: ['CHARGE!', `DMG ${CHARGE_DMG}, NO MISS`, `COVER SMASHED: ${cover}`], confirm: 'SMASH' };
      }
      case 'grapple': {
        const t = this.pending?.target;
        if (!t) return { info: ['NO ENEMY IN SIGHT', `WITHIN ${GRAPPLE_RANGE}.`], confirm: null };
        return { info: ['HOOK IN + HIT', `DMG ${GRAPPLE_DMG}, NO MISS`, 'FREE: KEEPS', 'BOTH ACTIONS.'], confirm: 'HOOK' };
      }
      case 'axe': {
        const t = this.pending?.target;
        if (!t) return { info: ['NO ENEMY WITHIN', `${AXE_RANGE} MOVES.`], confirm: null };
        return { info: ['AXE SWING!', `DMG ${AXE_DMG}, NO MISS`, t.hp <= AXE_DMG ? 'KO: +1 ACTION BACK' : `LEAVES ${t.hp - AXE_DMG} HP`], confirm: 'SHATTER' };
      }
      case 'mark': {
        const n = this.targetsFor(u, MARK_RANGE).length;
        if (!n) return { info: ['NO ENEMIES', 'IN SIGHT.'], confirm: null };
        return { info: [`MARKS ${n} ENEM${n > 1 ? 'IES' : 'Y'}`, '+20 AIM FOR SQUAD', 'UNTIL NEXT TURN.', 'USES 1 ACTION.'], confirm: 'MARK' };
      }
      case 'flame': {
        const t = this.pending?.tile;
        if (!t) return { info: ['PICK A DIRECTION', `CONE, RANGE ${FLAME_RANGE}`, `${FLAME_DMG} DMG + BURNING`, 'TORCHES COVER'], confirm: null };
        const cone = this.coneTiles(u, t);
        const has = (p: Pos) => cone.some((c) => c.x === p.x && c.y === p.y);
        const foes = this.enemies().filter(has).length;
        const allies = this.players().filter(has).length;
        const cover = cone.filter((c) => this.grid.destructible(c.x, c.y)).length;
        const info = [`ENEMIES HIT: ${foes}`, `COVER BURNED: ${cover}`];
        if (allies) info.push(`ALLIES HIT: ${allies}!`);
        return { info, confirm: 'TORCH IT' };
      }
      case 'chain': {
        const t = this.pending?.target;
        if (!t) return { info: ['NO TARGET', 'IN SIGHT.'], confirm: null };
        const n = this.chainTargets(t).length;
        return { info: [`HITS ${n} ENEM${n > 1 ? 'IES' : 'Y'}`, `DMG ${CHAIN_DMG}, JUMPS ${CHAIN_JUMP_DMG}`, 'NEVER MISSES', 'IGNORES COVER'], confirm: 'SURGE' };
      }
      case 'overwatch':
        return { info: ['SHOOTS THE FIRST', 'ENEMY THAT MOVES', 'IN HIS SIGHT.', 'ENDS TURN.'], confirm: 'WATCH' };
      case 'heal': {
        const n = this.healTargets(u).length;
        return { info: [`FULL HEAL: ${n} BAND`, `MEMBER${n > 1 ? 'S' : ''}, RANGE ${HEAL_RANGE}`, 'CURES FIRE + SPELLS', 'ENDS TURN.'], confirm: 'HEAL' };
      }
      case 'blink': {
        const t = this.pending?.tile;
        if (!t) return { info: ['PICK AN OPEN TILE', `WITHIN ${BLINK_RANGE}, THEN A`, 'FREE SHOT WITH', `+${BLINK_AIM} AIM.`], confirm: null };
        const shot = this.blinkShot(u, t);
        if (!shot) return { info: ['NO SHOT FROM', 'THERE. JUST', 'TELEPORTS.'], confirm: 'MIDNIGHT' };
        return { info: ['THEN SHOOTS', shot.target.name, `HIT ${shot.chance}%`], confirm: 'MIDNIGHT' };
      }
      case 'deploy':
        if (!this.pending?.tile) return { info: ['PICK AN OPEN TILE', `WITHIN ${DEPLOY_RANGE}. COSTS 1`, 'ACTION.'], confirm: null };
        return { info: [`FULL COVER +${BARRICADE_DEF} DEF.`, 'START A TURN', `BEHIND IT: +${BRACE_AIM}`, 'AIM. BLASTS BREAK.'], confirm: 'DEPLOY' };
      case 'serial':
        return { info: ['FREE. THIS TURN,', 'EVERY KNOCKOUT', 'GIVES ANOTHER', `SHOT. -${SERIAL_CUT} DMG EACH.`], confirm: 'BLEED' };
      case 'decoy': {
        const t = this.pending?.tile;
        if (!t) return { info: ['PICK AN OPEN TILE', `WITHIN ${DECOY_RANGE} FOR THE`, 'FAKE. COSTS 1', 'ACTION.'], confirm: null };
        const n = this.enemies().filter((e) => dist(e, t) <= TAUNT_RANGE).length;
        return { info: ['ENEMIES IN RANGE', `MUST SHOOT IT: ${n}`, 'GONE AFTER THE', 'ENEMY TURN.'], confirm: 'DECOY' };
      }
      case 'taunt': {
        const n = this.enemies().filter((e) => dist(e, u) <= TAUNT_RANGE).length;
        return { info: ['ENEMIES IN RANGE', `MUST SHOOT HIM: ${n}`, `-${TAUNT_ARMOR} DMG PER HIT,`, 'HE FIRES BACK.'], confirm: 'BRING IT' };
      }
      case 'rally': {
        const n = this.players().filter((p) => p !== u).length;
        if (!n) return { info: ['NO ONE LEFT', 'TO COMMAND.'], confirm: null };
        return { info: [`${n} BAND MEMBER${n > 1 ? 'S' : ''}`, 'GET +1 ACTION', 'THIS TURN.', 'ENDS HIS TURN.'], confirm: 'DECREE' };
      }
    }
  }

  // ================================================================ actions

  async moveSelected(t: Pos) {
    const u = this.selected;
    if (!u || !this.reach) return;
    const node = this.reach.get(key(t.x, t.y));
    if (!node) return;
    const path = this.grid.pathTo(this.reach, t);
    this.phase = 'busy';
    this.touchPreview = null;
    this.refresh();
    const dashed = node.cost > u.move;
    u.ap -= dashed ? 2 : 1;
    u.braced = false; // left the barrier
    await this.walk(u, path);
    const dashLine = dashed ? getCharacter(u.id)?.dashLines : undefined;
    if (dashLine?.length && u.alive) { this.lastBark = 0; this.bark(u, Phaser.Utils.Array.GetRandom(dashLine)); }
    this.tutorial('move');
    await this.afterPlayerAction();
  }

  async walk(u: Unit, path: Pos[], stepMs = 110) {
    if (!path.length) return;
    u.sprite.play(`${u.tex}-walk`);
    for (const step of path) {
      u.face(step.x);
      const p = tileToWorld(step.x, step.y);
      sfx.step();
      await this.tween({ targets: u.sprite, x: p.x, y: p.y, duration: stepMs });
      u.x = step.x;
      u.y = step.y;
      if (u.isPlayer) this.checkActivation(true);
      else if (await this.overwatchCheck(u)) break; // shot at mid-move
    }
    if (u.alive) u.sprite.play(`${u.tex}-idle`);
  }

  /** No Running's whistle: the first enemy to move in his sight gets shot. Returns true if it went down. */
  async overwatchCheck(e: Unit): Promise<boolean> {
    const w = this.players().find((p) => p.overwatch && canTarget(this.grid, p, p, e));
    if (!w) return false;
    w.overwatch = false;
    this.lastShooter = w;
    sfx.whistle();
    this.popup(w.chest(), 'NO RUNNING!', css(COLORS.gold));
    await this.wait(250);
    await this.attack(w, e, { aimBonus: OW_AIM });
    this.refresh();
    return !e.alive;
  }

  async executePending() {
    const u = this.selected;
    const p = this.pending;
    if (this.phase !== 'player' || !u || !p || u.ap <= 0) return;
    let apAfter = 0;
    this.lastShooter = u;
    if (p.kind === 'special') {
      const k = u.special?.kind;
      if (k && TILE_SPECIALS.has(k) && !p.tile) return;
      if (k && TARGET_SPECIALS.has(k) && !p.target) return;
      if (k === 'fanfire' && !this.targetsFor(u, FAN_RANGE).length) return;
      if (k === 'mark' && !this.targetsFor(u, MARK_RANGE).length) return;
      if (k === 'rally' && this.players().length < 2) return;
      if (u.special?.freeAction) apAfter = u.ap - 1;
    }
    this.phase = 'busy';
    this.mode = 'idle';
    this.pending = null;
    this.refresh();

    if (p.kind === 'shoot' && p.target) {
      const chainLine = u.serial ? getCharacter(u.id)?.chainLines : undefined;
      this.quietComebacks = !!chainLine?.length; // his own line wins over knockout chatter
      await this.attack(u, p.target, {});
      this.quietComebacks = false;
      this.tutorial('shoot');
      if (u.serial && u.alive && !p.target.alive) {
        if (chainLine?.length) { this.lastBark = 0; this.bark(u, Phaser.Utils.Array.GetRandom(chainLine)); }
        if (this.enemies().length) {
          apAfter = 1;
          this.popup({ x: u.sprite.x, y: u.sprite.y - 30 }, 'ANOTHER SHOT!', css(0xd8344a));
        }
      }
    } else if (p.kind === 'special' && u.special) {
      this.tutorial('special');
      u.cooldown = u.special.cooldown;
      const afterLine = getCharacter(u.id)?.specialLines;
      this.quietComebacks = !!afterLine?.length; // their own line wins over knockout chatter
      switch (u.special.kind) {
        case 'grenade': await this.fragOut(u, p.tile!); break;
        case 'rocket': await this.fireRocket(u, p.tile!); break;
        case 'fanfire': await this.signHere(u); break;
        case 'aimedShot': await this.attack(u, p.target!, { aimBonus: 30, ignoreHalf: true, dmgBonus: 1, critOnFlank: true, leaf: true }); break;
        case 'stealth': await this.goUnheard(u); break;
        case 'charge': await this.wreckingBall(u, p.target!); break;
        case 'mark': await this.secondSight(u); break;
        case 'flame': await this.everythingMustGo(u, p.tile!); break;
        case 'chain': await this.powerSurge(u, p.target!); break;
        case 'overwatch': await this.whistleBlower(u); break;
        case 'heal': await this.clearMind(u); break;
        case 'blink': await this.strokeOf12(u, p.tile!); break;
        case 'rally': await this.royalDecree(u); break;
        case 'taunt': await this.tradingPunches(u); break;
        case 'decoy': await this.smokeAndMirrors(u, p.tile!); break;
        case 'deploy': await this.deployCover(u, p.tile!); break;
        case 'grapple': await this.grappleStrike(u, p.target!); apAfter = u.ap; break;
        case 'serial': await this.bleedYouDry(u); apAfter = u.ap; break;
        case 'axe': if (await this.shatter(u, p.target!)) apAfter = 1; break;
      }
      this.quietComebacks = false;
      if (afterLine?.length && u.alive && Math.random() < (getCharacter(u.id)?.specialLineChance ?? 1)) { this.lastBark = 0; this.bark(u, Phaser.Utils.Array.GetRandom(afterLine)); }
    }
    u.ap = Math.max(0, apAfter);
    await this.afterPlayerAction();
  }

  async afterPlayerAction() {
    if (this.checkEnd()) return;
    this.checkActivation(true);
    this.phase = 'player';
    if (!this.selected?.alive || this.selected.ap <= 0) this.selectNext(false);
    this.refresh();
    if (!this.players().some((p) => p.ap > 0)) {
      await this.wait(500);
      this.endPlayerTurn();
    }
  }

  /** Aim bonus a cover song gets from a nearby Wonderwall singalong. */
  auraBonus(att: Unit) {
    if (att.isPlayer) return 0;
    let bonus = 0;
    for (const w of this.enemies()) {
      const aura = ENEMIES[w.id]?.aura;
      if (aura && w !== att && dist(w, att) <= aura.range) bonus = Math.max(bonus, aura.aim);
    }
    return bonus;
  }

  /** Free Bird vanishes in a burst of feathers and reappears somewhere worse for you. */
  async freeBirdBlink(e: Unit, to: Pos) {
    const def = ENEMIES[e.id];
    e.tpCd = def?.teleport?.cooldown ?? 2;
    const feathers = [0xffffff, 0xd8344a, 0xffe07a];
    sfx.teleport();
    this.burst(e.chest().x, e.chest().y, feathers, 16, 18, 600);
    await this.tween({ targets: e.sprite, alpha: 0, scaleY: 1.5, duration: 160 });
    const p = tileToWorld(to.x, to.y);
    e.sprite.setPosition(p.x, p.y);
    e.x = to.x;
    e.y = to.y;
    await this.tween({ targets: e.sprite, alpha: 1, scaleY: 1, duration: 160 });
    this.burst(e.chest().x, e.chest().y, feathers, 16, 18, 600);
    this.popup(e.chest(), 'SOLO!', css(COLORS.gold));
    await this.wait(250);
  }

  // ---------------------------------------------------------------- Hotel California

  /** Hotel California checks a band member in: they fight for the covers until he gets hit. */
  async checkIn(hc: Unit, p: Unit) {
    hc.face(p.x);
    hc.controlling = p;
    p.controlledBy = hc;
    p.ap = 0;
    p.overwatch = false;
    sfx.hypno();
    this.bark(hc, Phaser.Utils.Array.GetRandom(ENEMIES[hc.id].taunts));
    // wavy purple beam
    const g = this.add.graphics().setDepth(15000);
    this.world.add(g);
    const a = hc.chest(), b = p.chest();
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const wob = Math.sin(t * Math.PI * 6) * 3;
      g.fillStyle(i % 2 ? HYPNO_TINT : 0xffffff, 1).fillRect(a.x + (b.x - a.x) * t + wob, a.y + (b.y - a.y) * t - wob, 2, 2);
    }
    this.tweens.add({ targets: g, alpha: 0, delay: 500, duration: 400, onComplete: () => g.destroy() });
    await this.wait(400);
    p.sprite.setTint(HYPNO_TINT);
    this.burst(b.x, b.y, [HYPNO_TINT, 0xffffff], 14, 14, 600);
    this.popup(b, 'CHECKED IN!', css(HYPNO_TINT));
    this.refresh();
    await this.wait(600);
  }

  /** The guest breaks free (Hotel California got hit or went down). */
  checkOut(hc: Unit) {
    const p = hc.controlling;
    hc.controlling = null;
    hc.mcCd = ENEMIES[hc.id]?.mindControl?.cooldown ?? 2;
    if (!p) return;
    p.controlledBy = null;
    if (!p.alive) return;
    p.sprite.clearTint();
    sfx.freed();
    this.popup({ x: p.sprite.x, y: p.sprite.y - 30 }, 'CHECKED OUT!', css(COLORS.cyan));
    this.burst(p.chest().x, p.chest().y, [COLORS.cyan, 0xffffff], 12, 14, 500);
    this.time.delayedCall(500, () => { this.lastBark = 0; this.bark(p, Phaser.Utils.Array.GetRandom(FREED_LINES)); });
    if (this.phase !== 'enemy') p.ap = 2; // freed on your turn: they can act right away
    this.refresh();
  }

  /** A checked-in band member turns on the squad: shoot a bandmate, or walk out toward one. */
  async puppetAct(p: Unit) {
    if (!p.alive || !p.controlledBy) return;
    this.bark(p, Phaser.Utils.Array.GetRandom(HYPNO_LINES));
    await this.wait(500);
    const mates = this.players().filter((m) => m !== p && !m.stealth);
    let target: Unit | null = null;
    let best = -1;
    for (const m of mates) {
      if (dist(p, m) > p.weapon.range || !this.grid.los(p, m)) continue;
      const ch = hitChance(this.grid, p, p, m).chance;
      if (ch > best) { best = ch; target = m; }
    }
    if (target) {
      this.lastShooter = p;
      await this.attack(p, target, { aimBonus: -10, noCrit: true }); // half-hearted: no crits on friends
      return;
    }
    if (!mates.length) return;
    // nobody in sight: wander out of cover toward the nearest bandmate
    const reach = this.grid.reachable(p, p.move, this.occupied(p));
    let dest: ReachNode | null = null;
    let dBest = Infinity;
    for (const n of reach.values()) {
      const d = Math.min(...mates.map((m) => dist(n, m)));
      if (d < dBest && d >= 1.5) { dBest = d; dest = n; }
    }
    if (dest) await this.walk(p, this.grid.pathTo(reach, dest));
  }

  /** Mr. Brightside's brass knuckles: flat hit chance, cover doesn't help. */
  async meleeHit(e: Unit, target: Unit) {
    const m = ENEMIES[e.id]?.melee;
    if (!m || !target.alive) return;
    e.face(target.x);
    const dx = Math.sign(target.x - e.x) * 5, dy = Math.sign(target.y - e.y) * 3;
    await this.tween({ targets: e.sprite, x: e.sprite.x + dx, y: e.sprite.y + dy, duration: 70, yoyo: true });
    this.popup(e.chest(), m.name, css(COLORS.red));
    if (Math.random() * 100 < m.aim) {
      sfx.smash();
      this.cameras.main.shake(140, 0.008);
      this.damage(target, m.dmg[0] + Math.floor(Math.random() * (m.dmg[1] - m.dmg[0] + 1)));
    } else {
      sfx.miss();
      this.popup(target.chest(), 'DODGED', '#c8c0d8');
    }
    await this.wait(350);
    await this.returnFire(target, e);
  }

  /** Basic attack (or a modified one for specials). Attacking ends the turn. */
  async attack(att: Unit, target: Unit, opts: AttackOpts) {
    const aura = this.auraBonus(att);
    if (aura) {
      opts = { ...opts, aimBonus: (opts.aimBonus ?? 0) + aura };
      this.popup({ x: att.sprite.x, y: att.sprite.y - 30 }, `SINGALONG +${aura}`, css(0xd89a4a));
    }
    att.face(target.x);
    const info = hitChance(this.grid, att, att, target, opts);
    const forceCrit = att.stealth || (!!opts.critOnFlank && info.cover === 0);
    const shots = opts.critOnFlank ? 1 : att.weapon.shots;
    if (opts.leaf) this.leafFx(att);
    let landed = false;
    for (let i = 0; i < shots && target.alive; i++) {
      if (await this.shot(att, target, info.chance, opts.noCrit ? 0 : forceCrit ? 100 : info.crit, (opts.dmgBonus ?? 0) + (att.stealth && att.isPlayer ? AMBUSH_DMG : 0) - (att.serial ? SERIAL_CUT : 0))) landed = true;
      if (i < shots - 1) await this.wait(110);
    }
    const hitLine = att.isPlayer ? getCharacter(att.id)?.hitLines : undefined;
    if (landed && target.alive && hitLine?.length && Math.random() < (getCharacter(att.id)?.hitLineChance ?? 1)) {
      this.time.delayedCall(250, () => this.bark(att, Phaser.Utils.Array.GetRandom(hitLine)));
    }
    if (att.stealth) { att.setStealth(false); this.popup(att.chest(), 'HEARD!', css(COLORS.pink)); }
    att.ap = 0;
    await this.wait(250);
    await this.returnFire(target, att);
  }

  /** Toast's Trading Punches: whoever shoots him while he's taunting eats a shot back. */
  async returnFire(toast: Unit, shooter: Unit) {
    if (!toast.taunting || !toast.alive || !shooter.alive || shooter.isPlayer) return;
    if (!canTarget(this.grid, toast, toast, shooter)) return;
    this.popup({ x: toast.sprite.x, y: toast.sprite.y - 30 }, 'RETURN FIRE!', css(0xff4f4f));
    await this.wait(200);
    this.lastShooter = toast;
    await this.attack(toast, shooter, {});
  }

  async shot(att: Unit, target: Unit, chance: number, crit: number, dmgBonus = 0): Promise<boolean> {
    const hit = Math.random() * 100 < chance;
    const isCrit = hit && Math.random() * 100 < crit;
    const from = att.muzzle();
    const aim = target.chest();
    const to = hit ? aim : { x: aim.x + Phaser.Math.Between(-12, 12), y: aim.y + Phaser.Math.Between(-10, 6) };

    sfx[att.weapon.sfx]();
    this.flash(from);
    this.tweens.add({ targets: att.sprite, x: att.sprite.x - (att.sprite.flipX ? -1 : 1), duration: 40, yoyo: true });
    const w = att.weapon;
    if (w.sfx === 'note') await this.projectile(from, to, 'note', w.tint ?? (att.boss ? COLORS.gold : COLORS.pink), 260);
    else if (w.sniper) await this.projectile(from, to, 'bullet', COLORS.gold, 900);
    else if (w.sfx === 'shotgun') {
      await Promise.all([-5, 0, 5].map((o) => this.projectile(from, { x: to.x + o / 2, y: to.y + o }, 'bullet', 0xffc83a, 600)));
    } else await this.projectile(from, to, 'bullet', w.tint, w.sfx === 'zap' ? 800 : 520);

    if (!target.isPlayer && !target.active) this.activate(target, true);
    if (!hit) { sfx.miss(); this.popup(aim, 'MISS', '#c8c0d8'); return false; }
    let dmg = Math.max(1, rollDamage(att.weapon) + dmgBonus);
    if (isCrit) dmg = Math.ceil(dmg * 1.5);
    this.damage(target, dmg, isCrit);
    return true;
  }

  damage(u: Unit, n: number, crit = false) {
    if (!u.alive) return;
    if (u.decoy) { // it is only a hologram of a guy
      sfx.miss();
      this.burst(u.chest().x, u.chest().y, [0xd27aff, 0xffffff], 6, 12);
      this.popup(u.chest(), 'FAKE!', css(0xd27aff));
      return;
    }
    if (u.taunting) n = Math.max(1, n - TAUNT_ARMOR); // Toast braced behind Trading Punches
    u.hp = Math.max(0, u.hp - n);
    u.drawBar();
    u.sprite.setTintFill(0xffffff);
    this.time.delayedCall(90, () => {
      if (!u.alive) return;
      u.sprite.clearTint();
      if (u.controlledBy) u.sprite.setTint(HYPNO_TINT);
    });
    if (u.controlling) this.checkOut(u); // any hit on Hotel California breaks his hold
    this.burst(u.chest().x, u.chest().y, u.isPlayer ? [0xff4f4f, 0xffffff] : [0xff4fa3, 0xffd34f, 0xffffff], crit ? 14 : 7, 14);
    if (crit) { sfx.crit(); this.popup(u.chest(), `CRIT -${n}`, css(COLORS.gold)); this.cameras.main.shake(120, 0.004); }
    else { sfx.hit(); this.popup(u.chest(), `-${n}`, css(COLORS.red)); }
    if (u.hp <= 0) this.kill(u);
  }

  kill(u: Unit) {
    u.alive = false;
    if (u.controlledBy) { // the checked-in band member went down: the room is free again
      const hc = u.controlledBy;
      hc.controlling = null;
      hc.mcCd = ENEMIES[hc.id]?.mindControl?.cooldown ?? 2;
      u.controlledBy = null;
    }
    u.drawBar();
    u.sprite.stop();
    u.sprite.setFrame('f0');
    u.sprite.setTint(0x5a5068);
    u.setStealth(false);
    sfx.death();
    this.tweens.add({ targets: u.sprite, angle: u.sprite.flipX ? -90 : 90, alpha: 0.6, y: u.sprite.y + 2, duration: 320, ease: 'Quad.easeIn' });
    this.popup({ x: u.sprite.x, y: u.sprite.y - 22 }, u.isPlayer ? 'DOWN!' : 'K.O.!', u.isPlayer ? css(COLORS.red) : css(COLORS.gold));
    if (!u.isPlayer) this.kills++;
    if (!u.isPlayer && this.lastShooter?.isPlayer) this.killsBy[this.lastShooter.id] = (this.killsBy[this.lastShooter.id] ?? 0) + 1;
    if (this.selected === u) this.selected = null;
    const killer = this.lastShooter;
    if (!u.isPlayer && killer?.isPlayer && killer.alive && !this.quietComebacks) {
      const own = getCharacter(killer.id)?.killLines;
      if (own?.length) {
        // a signature line: said on every knockout
        this.time.delayedCall(450, () => { this.lastBark = 0; this.bark(killer, Phaser.Utils.Array.GetRandom(own)); });
      } else if (Math.random() < 0.5) {
        this.time.delayedCall(450, () => this.bark(killer, Phaser.Utils.Array.GetRandom(BAND_COMEBACKS)));
      }
    }
  }

  // ---------------------------------------------------------------- specials

  /** Ice's frag grenade: lobbed over cover, a beat on the ground, then a 3x3 blast that breaks cover. */
  async fragOut(u: Unit, t: Pos) {
    u.face(t.x);
    this.popup(u.chest(), 'FRAG OUT!', css(COLORS.gold));
    const from = { x: u.sprite.x + (u.sprite.flipX ? -4 : 4), y: u.sprite.y - 16 };
    const to = { x: t.x * TILE + 8, y: t.y * TILE + 10 };
    sfx.click();
    this.tweens.add({ targets: u.sprite, y: u.sprite.y - 2, duration: 80, yoyo: true }); // throwing motion
    const nade = this.add.image(from.x, from.y, 'grenade').setDepth(15000);
    this.world.add(nade);
    const peak = Math.min(from.y, to.y) - 34;
    await new Promise<void>((resolve) => this.tweens.addCounter({
      from: 0, to: 1, duration: 560,
      onUpdate: (tw) => {
        const k = tw.getValue() ?? 0;
        nade.setPosition(from.x + (to.x - from.x) * k, (1 - k) * (1 - k) * from.y + 2 * (1 - k) * k * peak + k * k * to.y);
        nade.setAngle(k * 720);
      },
      onComplete: () => resolve(),
    }));
    // a small bounce and a blink before it goes off
    await this.tween({ targets: nade, y: to.y - 4, duration: 90, yoyo: true });
    nade.setTintFill(0xff4f4f);
    await this.wait(160);
    nade.destroy();
    await this.explode(t, GRENADE_DMG);
  }

  /** Wreck's rocket launcher: a straight shot with a smoke trail, then a 3x3 blast that breaks cover. */
  async fireRocket(u: Unit, t: Pos) {
    u.face(t.x);
    this.popup(u.chest(), 'ROCKET!', css(COLORS.gold));
    const from = u.muzzle();
    const to = { x: t.x * TILE + 8, y: t.y * TILE + 9 };
    sfx.rocket();
    this.flash(from);
    this.tweens.add({ targets: u.sprite, x: u.sprite.x - (u.sprite.flipX ? -3 : 3), duration: 90, yoyo: true }); // recoil
    const rocket = this.add.image(from.x, from.y, 'rocket').setDepth(15000).setRotation(Math.atan2(to.y - from.y, to.x - from.x));
    this.world.add(rocket);
    const d = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
    await new Promise<void>((resolve) => this.tweens.add({
      targets: rocket, x: to.x, y: to.y, duration: Math.max(180, d * 3.2), ease: 'Quad.easeIn',
      onUpdate: () => { if (Math.random() < 0.8) this.burst(rocket.x, rocket.y, [0x8a8a92, 0xc8c8d0, 0xff9a2e], 1, 4, 500); },
      onComplete: () => resolve(),
    }));
    rocket.destroy();
    await this.explode(t, ROCKET_DMG);
  }

  /** A 3x3 explosion centred on `t`: breaks cover and hurts everyone in it, friend or foe. */
  async explode(t: Pos, dmg: number) {
    const at = { x: t.x * TILE + 8, y: t.y * TILE + 9 };
    sfx.boom();
    this.cameras.main.shake(280, 0.012);
    this.cameras.main.flash(120, 255, 220, 160);
    this.burst(at.x, at.y, [0xffffff, 0xffd34f, 0xff9a2e, 0xff4f1a], 36, 30, 600, 2);
    this.burst(at.x, at.y, [0x4a4a52, 0x6a6a72, 0x2a2a30], 18, 22, 1100, 2); // smoke
    const ring = this.add.circle(at.x, at.y, 4).setStrokeStyle(2, 0xffd34f).setDepth(15000);
    this.world.add(ring);
    this.tweens.add({ targets: ring, scale: 6, alpha: 0, duration: 400, onComplete: () => ring.destroy() });

    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) this.breakCover(t.x + dx, t.y + dy);
    for (const v of this.units.filter((v) => v.alive && Math.abs(v.x - t.x) <= 1 && Math.abs(v.y - t.y) <= 1)) {
      if (!v.isPlayer && !v.active) this.activate(v, true);
      this.damage(v, dmg);
    }
    await this.wait(500);
  }

  breakCover(x: number, y: number, colors = [0x8a5a34, 0x6a6a72, 0xffffff]) {
    if (!this.grid.destructible(x, y)) return;
    this.grid.set(x, y, 'rubble');
    this.tileImgs[y][x].setTexture(venueTile(this.theme.id, 'rubble', x, y));
    this.drawShadows();
    this.burst(x * TILE + 8, y * TILE + 8, colors, 10, 16, 500);
  }

  async wreckingBall(u: Unit, e: Unit) {
    const plan = this.chargePlan(u, e);
    if (!plan) return;
    this.popup(u.chest(), 'WRECKING BALL!', css(COLORS.gold));
    await this.walk(u, plan.path, 65);
    u.face(e.x);
    const lunge = { x: Math.sign(e.x - u.x) * 5, y: Math.sign(e.y - u.y) * 3 };
    await this.tween({ targets: u.sprite, x: u.sprite.x + lunge.x, y: u.sprite.y + lunge.y, duration: 70, yoyo: true });
    sfx.smash();
    this.cameras.main.shake(260, 0.014);
    this.burst(e.chest().x, e.chest().y, [0xffc83a, 0xff7a2a, 0xffffff], 24, 26, 550, 2);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) this.breakCover(e.x + dx, e.y + dy);
    if (!e.active) this.activate(e, true);
    this.damage(e, CHARGE_DMG);
    await this.wait(450);
  }

  /** Glass Slipper's axe: run in, swing, and get an action back on a knockout. */
  async shatter(u: Unit, e: Unit): Promise<boolean> {
    const plan = this.chargePlan(u, e);
    if (!plan) return false;
    this.popup(u.chest(), 'SHATTER!', css(0xbfefff));
    await this.walk(u, plan.path, 80);
    u.face(e.x);
    const dir = u.sprite.flipX ? -1 : 1;
    const axe = this.add.image(u.sprite.x + dir * 4, u.sprite.y - 22, 'axe').setDepth(15000).setFlipX(dir < 0).setAngle(-70 * dir);
    this.world.add(axe);
    await this.tween({ targets: axe, angle: 80 * dir, x: e.sprite.x - dir * 3, y: e.sprite.y - 10, duration: 140, ease: 'Quad.easeIn' });
    sfx.smash();
    this.cameras.main.shake(200, 0.012);
    this.burst(e.chest().x, e.chest().y, [0xbfefff, 0xffffff, 0x8fc8ff], 22, 22, 550, 2);
    if (!e.active) this.activate(e, true);
    this.damage(e, AXE_DMG);
    this.tweens.add({ targets: axe, alpha: 0, duration: 250, delay: 150, onComplete: () => axe.destroy() });
    await this.wait(450);
    if (!e.alive) { this.popup(u.chest(), '+1 ACTION', css(COLORS.gold)); return true; }
    return false;
  }

  async secondSight(u: Unit) {
    sfx.scan();
    const ring = this.add.circle(u.chest().x, u.chest().y, 6).setStrokeStyle(1, COLORS.cyan).setDepth(15000);
    this.world.add(ring);
    this.tweens.add({ targets: ring, scale: 14, alpha: 0, duration: 600, onComplete: () => ring.destroy() });
    this.popup(u.chest(), 'SECOND SIGHT', css(COLORS.cyan));
    await this.wait(300);
    for (const e of this.targetsFor(u, MARK_RANGE)) {
      e.marked = true;
      this.popup(e.chest(), 'MARKED', css(COLORS.cyan));
      await this.wait(120);
    }
    await this.wait(300);
  }

  async everythingMustGo(u: Unit, t: Pos) {
    u.face(t.x);
    const cone = this.coneTiles(u, t);
    this.popup(u.chest(), "WHAT'S NOT FREE!", css(0xff9a2e));
    sfx.fire();
    const from = u.muzzle();
    for (let i = 0; i < 26; i++) {
      const c = cone[i % cone.length];
      const p = this.add.image(from.x, from.y, 'px').setTint([0xff4f1a, 0xff9a2e, 0xffd34f][i % 3]).setScale(2).setDepth(15000);
      this.world.add(p);
      this.tweens.add({
        targets: p, x: c.x * TILE + 8 + Phaser.Math.Between(-5, 5), y: c.y * TILE + 8 + Phaser.Math.Between(-5, 5),
        alpha: 0.2, scale: 3, delay: i * 14, duration: 320, onComplete: () => p.destroy(),
      });
    }
    await this.wait(420);
    this.cameras.main.shake(180, 0.006);
    for (const c of cone) {
      this.breakCover(c.x, c.y, [0xff4f1a, 0xff9a2e, 0x3a2a2a]);
      this.burst(c.x * TILE + 8, c.y * TILE + 8, [0xff4f1a, 0xffd34f], 4, 8, 500);
    }
    const has = (p: Pos) => cone.some((c) => c.x === p.x && c.y === p.y);
    for (const v of this.units.filter((v) => v.alive && has(v))) {
      if (!v.isPlayer && !v.active) this.activate(v, true);
      this.damage(v, FLAME_DMG);
      if (v.alive) { v.burn = FLAME_BURN; this.popup({ x: v.sprite.x, y: v.sprite.y - 30 }, 'BURNING', css(0xff9a2e)); }
    }
    await this.wait(450);
  }

  lightning(from: { x: number; y: number }, to: { x: number; y: number }) {
    const g = this.add.graphics().setDepth(15000);
    this.world.add(g);
    const pts = [from];
    for (let i = 1; i < 6; i++) {
      const k = i / 6;
      pts.push({ x: from.x + (to.x - from.x) * k + Phaser.Math.Between(-3, 3), y: from.y + (to.y - from.y) * k + Phaser.Math.Between(-3, 3) });
    }
    pts.push(to);
    for (const [w, c] of [[3, COLORS.cyan], [1, 0xffffff]] as const) {
      g.lineStyle(w, c, 1);
      for (let i = 1; i < pts.length; i++) g.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
    }
    this.tweens.add({ targets: g, alpha: 0, delay: 120, duration: 260, onComplete: () => g.destroy() });
  }

  async powerSurge(u: Unit, first: Unit) {
    const chain = this.chainTargets(first);
    u.face(first.x);
    this.popup(u.chest(), 'LIGHTNING BOLT TO THE SOUL!', css(COLORS.cyan));
    this.cameras.main.flash(80, 120, 220, 255);
    let from = u.muzzle();
    for (let i = 0; i < chain.length; i++) {
      const e = chain[i];
      sfx.zap();
      this.lightning(from, e.chest());
      this.burst(e.chest().x, e.chest().y, [COLORS.cyan, 0xffffff, 0xfff04f], 12, 16, 400);
      if (!e.active) this.activate(e, true);
      from = e.chest();
      this.damage(e, i === 0 ? CHAIN_DMG : CHAIN_JUMP_DMG);
      await this.wait(200);
    }
    await this.wait(300);
  }

  async whistleBlower(u: Unit) {
    sfx.whistle();
    u.overwatch = true;
    this.popup(u.chest(), 'ON WATCH', css(COLORS.gold));
    await this.wait(400);
  }

  async clearMind(u: Unit) {
    sfx.heal();
    const ring = this.add.circle(u.chest().x, u.chest().y, 4).setStrokeStyle(2, COLORS.green).setDepth(15000);
    this.world.add(ring);
    this.tweens.add({ targets: ring, scale: (HEAL_RANGE * TILE + 8) / 4, alpha: 0, duration: 650, onComplete: () => ring.destroy() });
    this.popup(u.chest(), 'YOU CAN BREATHE', css(COLORS.green));
    await this.wait(350);
    for (const p of this.healTargets(u)) {
      const amt = FULL_HEAL ? p.maxHp - p.hp : 0;
      p.burn = 0;
      if (p.controlledBy) this.checkOut(p.controlledBy); // a clear mind breaks Hotel California's spell
      this.burst(p.chest().x, p.chest().y, [COLORS.green, 0xffffff], 10, 12, 600);
      if (amt > 0) {
        p.hp += amt;
        p.drawBar();
        this.popup({ x: p.sprite.x, y: p.sprite.y - 24 }, `+${amt}`, css(COLORS.green));
      }
    }
    await this.wait(450);
  }

  async strokeOf12(u: Unit, t: Pos) {
    sfx.teleport();
    const shards = [0xeaf6ff, 0xa9d8f5, 0xffffff];
    this.burst(u.chest().x, u.chest().y, shards, 16, 16, 500);
    await this.tween({ targets: u.sprite, alpha: 0, scaleY: 1.6, duration: 160 });
    const p = tileToWorld(t.x, t.y);
    u.sprite.setPosition(p.x, p.y);
    u.x = t.x;
    u.y = t.y;
    await this.tween({ targets: u.sprite, alpha: 1, scaleY: 1, duration: 160 });
    this.burst(u.chest().x, u.chest().y, shards, 16, 16, 500);
    this.popup(u.chest(), 'MIDNIGHT!', css(0xcfefff));
    this.checkActivation(true);
    const shot = this.blinkShot(u, t);
    if (shot) {
      await this.wait(250);
      await this.attack(u, shot.target, { aimBonus: BLINK_AIM });
    } else await this.wait(300);
  }

  async tradingPunches(u: Unit) {
    u.taunting = true;
    sfx.rally();
    this.cameras.main.shake(160, 0.006);
    this.popup(u.chest(), 'TRADING PUNCHES!', css(0xff4f4f));
    const ring = this.add.circle(u.chest().x, u.chest().y, 6).setStrokeStyle(2, 0xff4f4f).setDepth(15000);
    this.world.add(ring);
    this.tweens.add({ targets: ring, scale: (TAUNT_RANGE * TILE) / 6, alpha: 0, duration: 700, onComplete: () => ring.destroy() });
    await this.wait(300);
    for (const e of this.enemies()) if (dist(e, u) <= TAUNT_RANGE) this.popup({ x: e.sprite.x, y: e.sprite.y - 26 }, '!', css(0xff4f4f));
    await this.wait(400);
  }

  /** Been Here Before's grapple: hook an enemy, reel himself in, and hit them. Costs no actions. */
  async grappleStrike(u: Unit, e: Unit) {
    const plan = this.grapplePlan(u, e);
    if (!plan) return;
    u.face(e.x);
    this.popup(u.chest(), 'GRAPPLE!', css(0x9aa2ac));
    sfx.click();
    // the hook flies out on a line
    const rope = this.add.graphics().setDepth(14999);
    this.world.add(rope);
    const from = u.chest();
    const hook = { x: from.x, y: from.y };
    const to = e.chest();
    const drawRope = () => {
      rope.clear().lineStyle(1, 0x9aa2ac, 1).lineBetween(u.chest().x, u.chest().y, hook.x, hook.y);
      rope.fillStyle(0xd8d8e0, 1).fillRect(hook.x - 1, hook.y - 1, 3, 3);
    };
    await this.tween({ targets: hook, x: to.x, y: to.y, duration: 180, onUpdate: drawRope });
    // reel in
    const land = tileToWorld(plan.dest.x, plan.dest.y);
    sfx.step();
    await this.tween({ targets: u.sprite, x: land.x, y: land.y, duration: 200, ease: 'Quad.easeIn', onUpdate: () => { drawRope(); u.sync(); } });
    u.x = plan.dest.x; u.y = plan.dest.y;
    u.sync();
    rope.destroy();
    this.checkActivation(true);
    // and the hit
    u.face(e.x);
    const lunge = { x: Math.sign(e.x - u.x) * 4, y: Math.sign(e.y - u.y) * 2 };
    await this.tween({ targets: u.sprite, x: u.sprite.x + lunge.x, y: u.sprite.y + lunge.y, duration: 70, yoyo: true });
    sfx.smash();
    this.cameras.main.shake(180, 0.01);
    this.burst(e.chest().x, e.chest().y, [0xd8344a, 0xffffff, 0x9aa2ac], 18, 20, 500, 2);
    if (!e.active) this.activate(e, true);
    this.damage(e, GRAPPLE_DMG);
    await this.wait(400);
  }

  /** Indy Blvd's Deployable Cover: a folded steel barrier thrown out that slams open into full cover. */
  async deployCover(u: Unit, t: Pos) {
    u.face(t.x);
    this.popup(u.chest(), 'DEPLOYABLE COVER!', css(0xffd34f));
    sfx.click();
    this.tweens.add({ targets: u.sprite, y: u.sprite.y - 2, duration: 80, yoyo: true });
    const from = { x: u.sprite.x, y: u.sprite.y - 14 };
    const to = { x: t.x * TILE + 8, y: t.y * TILE + 8 };
    const box = this.add.rectangle(from.x, from.y, 6, 4, 0x5a6068).setStrokeStyle(1, 0xffd34f).setDepth(15000);
    this.world.add(box);
    await this.tween({ targets: box, x: to.x, duration: 320, ease: 'Linear' });
    box.destroy();
    this.grid.set(t.x, t.y, 'barricade');
    this.drawShadows();
    this.tileImgs[t.y][t.x].setTexture(venueTile(this.theme.id, 'barricade', t.x, t.y));
    const img = this.tileImgs[t.y][t.x];
    img.setScale(1, 0.2);
    this.tweens.add({ targets: img, scaleY: 1, duration: 160, ease: 'Back.easeOut' });
    sfx.smash();
    this.cameras.main.shake(120, 0.005);
    this.burst(to.x, to.y + 4, [0xffd34f, 0x9aa2ac, 0xffffff], 12, 12, 400);
    await this.wait(350);
  }

  /** Pen & Paper's Bleed You Dry: for the rest of the turn, every knockout earns another shot. */
  async bleedYouDry(u: Unit) {
    u.serial = true;
    sfx.rally();
    this.popup(u.chest(), 'BLEED YOU DRY!', css(0xd8344a));
    this.burst(u.chest().x, u.chest().y - 6, [0xd8344a, 0x6dff7a, 0xffffff], 10, 10, 400);
    for (const e of this.enemies()) if (canTarget(this.grid, u, u, e)) this.reticle(e, 0xd8344a);
    await this.wait(500);
  }

  /** Distraction's Smoke and Mirrors: a fake copy that every enemy nearby has to shoot. */
  async smokeAndMirrors(u: Unit, t: Pos) {
    u.face(t.x);
    sfx.click();
    this.popup(u.chest(), 'SMOKE AND MIRRORS!', css(0xd27aff));
    this.burst(u.chest().x, u.chest().y, [0xd27aff, 0xffffff, 0x8a8a9a], 10, 12, 400);
    const d = new Unit(this, this.world, {
      id: u.id, team: 'player', name: 'DECOY', archetype: 'FAKE',
      hp: 1, aim: 0, move: 0, weapon: u.weapon, tex: u.tex, x: t.x, y: t.y,
    });
    d.decoy = true;
    d.bar.clear().setVisible(false);
    d.sprite.setTint(0xe6c4ff).setAlpha(0).setFlipX(u.sprite.flipX);
    this.units.push(d);
    this.tweens.add({ targets: d.sprite, alpha: 0.75, duration: 250 });
    this.tweens.add({ targets: d.sprite, alpha: 0.5, duration: 600, yoyo: true, repeat: -1, delay: 250 });
    this.burst(d.chest().x, d.chest().y, [0xd27aff, 0xffffff, 0x8a8a9a], 14, 14, 500);
    await this.wait(300);
    this.lastBark = 0;
    this.bark(d, 'HEY! OVER HERE!');
    for (const e of this.enemies()) if (dist(e, d) <= TAUNT_RANGE) this.popup({ x: e.sprite.x, y: e.sprite.y - 26 }, '?', css(0xd27aff));
    await this.wait(400);
  }

  /** The fakes vanish once the covers have wasted their turn on them. */
  popDecoys() {
    for (const d of this.decoys()) {
      d.alive = false;
      this.burst(d.chest().x, d.chest().y, [0xd27aff, 0xffffff, 0x8a8a9a], 12, 14, 500);
      this.popup(d.chest(), 'POOF!', css(0xd27aff));
      this.tweens.killTweensOf(d.sprite);
      d.sprite.setVisible(false);
      d.bar.setVisible(false);
    }
    this.units = this.units.filter((v) => !v.decoy);
  }

  async royalDecree(u: Unit) {
    sfx.rally();
    this.popup(u.chest(), 'ROYALTY!', css(COLORS.gold));
    this.burst(u.chest().x, u.sprite.y - 22, [COLORS.gold, 0xffffff, 0x6a2a9a], 20, 18, 700);
    await this.wait(350);
    for (const p of this.players()) {
      if (p === u) continue;
      p.ap = Math.min(3, p.ap + 1);
      this.popup({ x: p.sprite.x, y: p.sprite.y - 24 }, '+1 ACTION', css(COLORS.gold));
      this.burst(p.chest().x, p.chest().y, [COLORS.gold, 0xffffff], 8, 12, 500);
    }
    await this.wait(450);
  }

  async signHere(u: Unit) {
    const targets = this.targetsFor(u, FAN_RANGE);
    this.popup(u.chest(), 'SIGN HERE!', css(COLORS.gold));
    await this.wait(250);
    for (let i = 0; i < FAN_SHOTS; i++) {
      const alive = targets.filter((t) => t.alive);
      if (!alive.length) break;
      const t = alive[i % alive.length];
      u.face(t.x);
      const info = hitChance(this.grid, u, u, t, { aimBonus: FAN_AIM });
      await this.shot(u, t, info.chance, info.crit);
      await this.wait(60);
    }
    await this.wait(250);
  }

  async goUnheard(u: Unit) {
    sfx.stealth();
    u.stealthTurn = this.turn;
    u.setStealth(true);
    this.popup(u.chest(), 'UNHEARD', css(COLORS.pink));
    this.burst(u.chest().x, u.chest().y, [0x3e3850, 0xff4fa3, 0x8a7fa0], 16, 14, 700);
    await this.wait(500);
  }

  async clapWave(boss: Unit, c: Pos) {
    boss.face(c.x);
    this.popup(boss.chest(), 'CLAP ALONG!', css(COLORS.gold));
    const cx = c.x * TILE + 8, cy = c.y * TILE + 8;
    for (let i = 0; i < 3; i++) {
      sfx.clap();
      const ring = this.add.circle(cx, cy, 6).setStrokeStyle(2, COLORS.gold).setDepth(15000);
      this.world.add(ring);
      this.tweens.add({ targets: ring, scale: 4, alpha: 0, duration: 380, onComplete: () => ring.destroy() });
      this.cameras.main.shake(90, 0.006);
      await this.wait(160);
    }
    for (const v of this.players().filter((v) => !v.stealth && Math.abs(v.x - c.x) <= 1 && Math.abs(v.y - c.y) <= 1)) {
      this.damage(v, CLAP_DMG);
    }
    await this.wait(400);
  }

  // ================================================================ turns

  startPlayerPhase(first = false) {
    if (!first) this.turn++;
    this.popDecoys();
    for (const p of this.players()) {
      p.ap = p.controlledBy ? 0 : 2; // checked-in members sit this turn out
      p.overwatch = false;
      p.taunting = false;
      p.serial = false;
      p.braced = !first && this.grid.besideBarricade(p);
      if (p.braced) this.popup({ x: p.sprite.x, y: p.sprite.y - 30 }, `BRACED +${BRACE_AIM} AIM`, css(0xffd34f));
      if (!first && p.cooldown > 0) p.cooldown--;
    }
    for (const e of this.enemies()) e.marked = false;
    this.phase = 'player';
    this.mode = 'idle';
    this.pending = null;
    this.hud.banner(`TURN ${this.turn}: YOUR MOVE`, css(COLORS.cyan));
    const keep = this.selected?.alive ? this.selected : null;
    this.selected = null;
    const first2 = [keep, ...this.players()].find((p) => p && p.alive && !p.controlledBy);
    if (first2) this.select(first2);
    else this.refresh();
    if (this.players().some((p) => p.controlledBy)) {
      this.time.delayedCall(1200, () => { if (this.phase === 'player') this.hud.toast('HIT HOTEL CALIFORNIA TO BREAK THE SPELL!'); });
    }
  }

  endPlayerTurn() {
    if (this.phase !== 'player') return;
    this.mode = 'idle';
    this.pending = null;
    this.phase = 'enemy';
    this.refresh();
    this.tutorial('end');
    void this.enemyPhase();
  }

  async enemyPhase() {
    this.hud.banner('ENEMY TURN', css(COLORS.red), 900);
    await this.wait(900);
    // stealth lasts through exactly one enemy phase after the player's next turn
    for (const p of this.players()) if (p.stealth && this.turn > p.stealthTurn) {
      p.setStealth(false);
      this.popup(p.chest(), 'HEARD AGAIN', css(COLORS.pink));
    }
    // Fire Sale's flames keep burning
    const burning = this.units.filter((v) => v.alive && v.burn > 0);
    for (const v of burning) {
      v.burn--;
      this.burst(v.chest().x, v.chest().y, [0xff4f1a, 0xff9a2e, 0xffd34f], 10, 12, 500);
      this.damage(v, 1);
    }
    if (burning.length) { sfx.fire(); await this.wait(500); }
    if (this.checkEnd()) return;
    this.checkActivation(false);
    for (const e of this.enemies()) {
      if (this.phase === 'over') return;
      if (!e.alive || !e.active) continue;
      await this.enemyAct(e);
      if (this.checkEnd()) return;
      await this.wait(200);
    }
    this.startPlayerPhase();
  }

  async enemyAct(e: Unit) {
    if (e.tpCd > 0) e.tpCd--;
    // Hotel California: hold the current guest, or check a new one in
    const mc = ENEMIES[e.id]?.mindControl;
    if (mc) {
      if (e.controlling?.alive) {
        if (Math.random() < 0.3) this.bark(e, Phaser.Utils.Array.GetRandom(ENEMIES[e.id].taunts));
        await this.puppetAct(e.controlling);
        return; // channeling: no moving, no shooting
      }
      if (e.mcCd > 0) e.mcCd--;
      else {
        const guest = this.players()
          .filter((p) => !p.stealth && !p.controlledBy && !getCharacter(p.id)?.mindControlImmune && dist(e, p) <= mc.range && this.grid.los(e, p))
          .sort((a, b) => (b.hp + b.weapon.dmg[1] * 2) - (a.hp + a.weapon.dmg[1] * 2))[0];
        if (guest) {
          await this.checkIn(e, guest);
          await this.puppetAct(guest);
          return;
        }
      }
    }
    const plan = planEnemy(this.grid, this.units, e);
    if (plan.teleport) {
      await this.freeBirdBlink(e, plan.teleport);
      if (await this.overwatchCheck(e)) return;
    }
    if (plan.path.length) await this.walk(e, plan.path);
    if (!e.alive) return;
    if (e.x !== (plan.path.at(-1)?.x ?? e.x) || e.y !== (plan.path.at(-1)?.y ?? e.y)) return; // stopped short by overwatch
    const a = plan.action;
    this.lastShooter = e;
    if (a && Math.random() < 0.35) {
      const taunts = ENEMIES[e.id]?.taunts ?? [];
      if (taunts.length) { this.bark(e, Phaser.Utils.Array.GetRandom(taunts)); await this.wait(700); }
    }
    if (a?.type === 'shoot') {
      await this.wait(150);
      await this.attack(e, a.target, {});
    } else if (a?.type === 'melee') {
      await this.meleeHit(e, a.target);
    } else if (a?.type === 'clap') {
      await this.clapWave(e, a.center);
      e.clapCd = 3;
      return;
    }
    if (e.boss) e.clapCd--;
  }

  /** Enemies notice the band when they can see someone within range, or get hit. */
  checkActivation(announce: boolean) {
    let spotted = false;
    for (const e of this.enemies()) {
      if (e.active) continue;
      const sees = this.players().some((p) => !p.stealth && dist(p, e) <= ACTIVATE_RANGE && this.grid.los(p, e));
      if (sees) { this.activate(e, true); spotted = true; }
    }
    if (spotted && announce) this.hud.toast('ENEMIES SPOTTED YOU!');
  }

  activate(e: Unit, alertPod: boolean) {
    if (e.active || !e.alive) return;
    e.active = true;
    sfx.alert();
    this.popup({ x: e.sprite.x, y: e.sprite.y - 22 }, '!', css(COLORS.gold));
    if (alertPod) for (const o of this.enemies()) if (!o.active && dist(o, e) <= 5) this.activate(o, false);
  }

  checkEnd(): boolean {
    if (this.phase === 'over') return true;
    const foes = this.enemies().length;
    const band = this.players().filter((p) => !p.controlledBy).length; // all checked in counts as a loss
    if (foes && band) return false;
    this.phase = 'over';
    const victory = !foes;
    this.refresh();
    this.hud.banner(victory ? 'SET COMPLETE!' : 'BOOED OFF STAGE', victory ? css(COLORS.gold) : css(COLORS.red), 0);
    if (victory) sfx.win(); else sfx.lose();
    this.tutorialHide();
    this.time.delayedCall(2300, () => this.scene.start('Results', {
      victory, kills: this.kills, survivors: band, turns: this.turn, squad: this.squad, mission: this.missionIndex,
      killsBy: { ...this.killsBy }, downed: this.squad.filter((id) => !this.units.some((u) => u.id === id && u.isPlayer && !u.decoy && u.alive)),
    }));
    return true;
  }

  // ================================================================ pre-show scene

  /** Text-box conversation with the guest before the fight. Click / SPACE / ENTER advances, ESC skips. */
  async playScene(sc: ShowScene) {
    const npc = NPCS[sc.guest];
    let guest: Phaser.GameObjects.Sprite | null = null;
    if (npc) {
      const p = tileToWorld(sc.at.x, sc.at.y);
      guest = this.add.sprite(p.x + 40, p.y, `npc-${npc.id}`, 'f0').setOrigin(0.5, 1).setFlipX(true);
      this.world.add(guest);
      guest.play(`npc-${npc.id}-walk`);
      await this.tween({ targets: guest, x: p.x, duration: 600 });
      guest.play(`npc-${npc.id}-idle`);
    } else {
      guest = this.unitAt(sc.at.x, sc.at.y)?.sprite ?? null;
    }
    guest?.setDepth(guest.y);

    const D = 120;
    const box = this.add.rectangle(8, 196, 624, 86, 0x0b0710, 0.94).setOrigin(0).setStrokeStyle(2, COLORS.gold).setDepth(D);
    const frame = this.add.rectangle(16, 204, 44, 70, COLORS.panel).setOrigin(0).setStrokeStyle(2, COLORS.border).setDepth(D);
    const portrait = this.add.sprite(38, 270, 'ice', 'f0').setOrigin(0.5, 1).setScale(3).setDepth(D + 1);
    const name = txt(this, 70, 206, '', 8, css(COLORS.gold)).setDepth(D + 1);
    const body = txt(this, 70, 222, '', 8).setDepth(D + 1).setWordWrapWidth(552).setLineSpacing(5);
    const more = txt(this, 620, 270, '>', 8, css(COLORS.cyan)).setOrigin(1, 1).setDepth(D + 1);
    this.tweens.add({ targets: more, alpha: 0.2, duration: 400, yoyo: true, repeat: -1 });
    const skip = txt(this, 620, 204, 'ESC: SKIP', 8, css(COLORS.gray)).setOrigin(1, 0).setDepth(D + 1).setScale(0.75);
    const parts = [box, frame, portrait, name, body, more, skip];

    const band = this.players()[0];
    let skipped = false;
    for (const line of sc.lines) {
      if (skipped) break;
      let tex: string, who: string, speaker: Phaser.GameObjects.Sprite | null;
      if (line.who === 'npc' && npc) { tex = `npc-${npc.id}`; who = npc.name; speaker = guest; }
      else if (line.who === 'band') { tex = band.tex; who = band.name; speaker = band.sprite; }
      else { const e = ENEMIES[line.who]; tex = `enemy-${e.id}`; who = e.name; speaker = guest; }
      portrait.play(`${tex}-idle`);
      name.setText(who);
      if (speaker) this.tweens.add({ targets: speaker, y: speaker.y - 3, duration: 90, yoyo: true });
      sfx.click();
      // typewriter, then wait for the next press
      let shown = 0;
      const timer = this.time.addEvent({ delay: 18, loop: true, callback: () => { shown++; body.setText(line.text.slice(0, shown)); } });
      let r = await this.waitPress();
      if (r === 'skip') skipped = true;
      if (!skipped && shown < line.text.length) { timer.remove(); body.setText(line.text); r = await this.waitPress(); if (r === 'skip') skipped = true; }
      timer.remove();
    }
    parts.forEach((p) => p.destroy());
    if (npc && guest && sc.leaves) {
      const g = guest;
      g.setFlipX(false).play(`npc-${npc.id}-walk`);
      this.tweens.add({ targets: g, x: g.x + 60, alpha: 0, duration: 900, onComplete: () => g.destroy() });
    }
  }

  waitPress(): Promise<'next' | 'skip'> {
    return new Promise((resolve) => {
      const kb = this.input.keyboard;
      let done = false;
      const finish = (r: 'next' | 'skip') => {
        if (done) return;
        done = true;
        this.input.off('pointerdown', onNext);
        kb?.off('keydown-SPACE', onNext); kb?.off('keydown-ENTER', onNext); kb?.off('keydown-ESC', onSkip);
        resolve(r);
      };
      const onNext = () => finish('next');
      const onSkip = () => finish('skip');
      // ignore the click that might still be in flight
      this.time.delayedCall(120, () => {
        this.input.on('pointerdown', onNext);
        kb?.on('keydown-SPACE', onNext); kb?.on('keydown-ENTER', onNext); kb?.on('keydown-ESC', onSkip);
      });
    });
  }

  // ================================================================ intro cards

  /** First time you meet a band member or cover song, pause on a card explaining what it does. */
  async showIntros() {
    const seen = loadSeen();
    const cards: { key: string; enemy: boolean; id: string }[] = [];
    for (const u of this.units) {
      const k = u.isPlayer ? `band:${u.id}` : `enemy:${u.id}`;
      if (!seen.has(k) && !cards.some((c) => c.key === k)) cards.push({ key: k, enemy: !u.isPlayer, id: u.id });
    }
    if (!cards.length) return;
    cards.sort((a, b) => Number(a.enemy) - Number(b.enemy)); // band first, then the covers
    for (let i = 0; i < cards.length; i++) {
      const r = await this.introCard(cards[i].id, cards[i].enemy, i + 1, cards.length);
      if (r === 'skip') break;
    }
    markSeen(cards.map((c) => c.key));
  }

  async introCard(id: string, enemy: boolean, n: number, total: number): Promise<'next' | 'skip'> {
    const D = 130;
    const accent = enemy ? COLORS.red : COLORS.cyan;
    const parts: Phaser.GameObjects.GameObject[] = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => { parts.push(o); return o; };
    add(this.add.rectangle(0, 0, 640, 360, 0x0b0710, 0.7).setOrigin(0).setDepth(D));
    add(this.add.rectangle(100, 64, 440, 214, COLORS.panel, 0.98).setOrigin(0).setStrokeStyle(2, accent).setDepth(D));
    add(txt(this, 320, 74, enemy ? 'NEW COVER SONG!' : 'NEW BAND MEMBER!', 8, css(accent)).setOrigin(0.5, 0).setDepth(D + 1));
    add(txt(this, 532, 74, `${n}/${total}`, 8, css(COLORS.gray)).setOrigin(1, 0).setDepth(D + 1).setScale(0.75));
    add(this.add.rectangle(116, 96, 88, 120, COLORS.bg).setOrigin(0).setStrokeStyle(2, COLORS.border).setDepth(D + 1));
    const tex = enemy ? `enemy-${id}` : id;
    const spr = add(this.add.sprite(160, 210, tex, 'f0').setOrigin(0.5, 1).setScale(5).setDepth(D + 2));
    spr.play(`${tex}-idle`);
    if (enemy) spr.setFlipX(true);

    const x = 218, w = 312;
    let y = 96;
    const line = (s: string, color = '#ffffff', gap = 4, scale = 1) => {
      const t = add(txt(this, x, y, s, 8, color).setDepth(D + 1).setWordWrapWidth(w / scale, true).setLineSpacing(4).setScale(scale));
      y += t.displayHeight + gap;
    };
    if (enemy) {
      const e = ENEMIES[id];
      line(e.name, '#ffffff', 2);
      line({ basic: 'BASIC COVER SONG', elite: 'ELITE COVER', tank: 'TANK', legend: 'LEGENDARY COVER', boss: 'BOSS' }[e.tier], css(accent), 8);
      line(`HP ${e.hp}   AIM ${e.aim}   MOVE ${e.move}`, '#c8c0d8');
      const wpn = e.weapon;
      line(`${wpn.name}: ${wpn.dmg[0]}-${wpn.dmg[1]} DMG${wpn.shots > 1 ? ' x' + wpn.shots : ''}, RANGE ${wpn.range}`, '#c8c0d8', 8);
      line(ENEMY_INTROS[id] ?? '', css(COLORS.gold), 8);
      line(`"${e.taunts[0]}"`, css(COLORS.gray), 0, 0.75);
    } else {
      const c = getCharacter(id);
      line(c.name.toUpperCase(), '#ffffff', 2);
      line(c.archetype, css(accent), 8);
      line(`HP ${c.hp}   AIM ${c.aim}   MOVE ${c.move}`, '#c8c0d8');
      const wpn = c.weapon;
      line(`${wpn.name}: ${gunBlurb(wpn)}`, '#c8c0d8', 8);
      line(`SPECIAL: ${c.special.name}`, css(COLORS.gold), 2);
      line(`${c.special.desc.toUpperCase()}${c.special.cooldown ? ` RECHARGES IN ${c.special.cooldown} TURNS.` : ""}`, '#ffffff', 0);
    }
    add(txt(this, 320, 262, 'CLICK TO CONTINUE   ESC: SKIP ALL', 8, css(COLORS.gray)).setOrigin(0.5, 1).setDepth(D + 1).setScale(0.75));
    sfx.select();
    const r = await this.waitPress();
    parts.forEach((p) => p.destroy());
    return r;
  }

  // ================================================================ speech bubbles

  lastBark = 0;
  lastShooter: Unit | null = null;
  quietComebacks = false; // a special's own line is about to play

  /** A little comic-style speech bubble over someone's head. */
  bark(u: Unit, text: string) {
    if (!u.alive || this.time.now - this.lastBark < 2200) return;
    this.lastBark = this.time.now;
    const t = txt(this, 0, 0, text, 8, '#0b0710').setBackgroundColor(u.isPlayer ? '#cff6ff' : '#fff0f6')
      .setPadding(4, 3, 4, 3).setWordWrapWidth(190).setScale(0.5).setOrigin(0.5, 1).setDepth(21000);
    const mapW = this.grid.cols * TILE;
    const half = t.displayWidth / 2;
    t.setPosition(Phaser.Math.Clamp(u.sprite.x, half + 2, mapW - half - 2), Math.max(u.sprite.y - 26, t.displayHeight + 2));
    this.world.add(t);
    t.setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, y: t.y - 2, duration: 120 });
    this.tweens.add({ targets: t, alpha: 0, delay: 2000, duration: 300, onComplete: () => t.destroy() });
  }

  // ================================================================ tutorial (Eagles Lodge)

  /** Shows the next tip when the player does what the current tip asks. */
  tutorial(event: 'start' | 'move' | 'shoot' | 'special' | 'end') {
    if (!this.mission.tutorial) return;
    let next = -1;
    if (event === 'start') next = 0;
    else {
      const i = TUTORIAL.findIndex((s, idx) => idx >= this.tutStep && s.on === event);
      if (i >= 0) next = i + 1;
    }
    if (next < 0 || next >= TUTORIAL.length || next <= this.tutStep) return;
    this.tutStep = next;
    if (!this.tutText) {
      this.tutBg = this.add.rectangle(0, 0, 640, 34, 0x0b0710, 0.92).setOrigin(0).setDepth(110).setStrokeStyle(2, COLORS.gold);
      this.tutText = txt(this, 10, 6, '', 8, css(COLORS.gold)).setDepth(111).setWordWrapWidth(620).setLineSpacing(4);
    }
    this.tutBg!.setVisible(true);
    this.tutText.setVisible(true).setText(`TIP: ${TUTORIAL[next].text}`);
    sfx.select();
    if (next === TUTORIAL.length - 1) this.time.delayedCall(8000, () => this.tutorialHide());
  }

  tutorialHide() {
    this.tutText?.setVisible(false);
    this.tutBg?.setVisible(false);
  }

  // ================================================================ fx

  popup(at: { x: number; y: number }, text: string, color: string) {
    const t = txt(this, at.x, at.y - 6, text, 8, color).setOrigin(0.5, 1).setScale(0.75).setDepth(20000);
    t.setShadow(1, 1, '#0b0710', 0, false, true);
    const half = t.displayWidth / 2 + 1; // keep it on the map near the edges
    t.x = Phaser.Math.Clamp(t.x, half, this.grid.cols * TILE - half);
    this.world.add(t);
    this.tweens.add({ targets: t, y: t.y - 12, duration: 500, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, delay: 800, duration: 400, onComplete: () => t.destroy() });
  }

  flash(at: { x: number; y: number }) {
    const f = this.add.image(at.x, at.y, 'flash').setDepth(15000);
    this.world.add(f);
    this.time.delayedCall(60, () => f.destroy());
  }

  projectile(from: { x: number; y: number }, to: { x: number; y: number }, tex: string, tint: number | undefined, speed: number) {
    const img = this.add.image(from.x, from.y, tex).setDepth(15000);
    if (tint !== undefined) img.setTint(tint);
    if (tex !== 'note') img.setRotation(Math.atan2(to.y - from.y, to.x - from.x));
    this.world.add(img);
    const d = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
    return this.tween({ targets: img, x: to.x, y: to.y, duration: Math.max(60, (d / speed) * 1000) }).then(() => img.destroy());
  }

  burst(x: number, y: number, colors: number[], n = 10, speed = 20, life = 450, size = 1) {
    for (let i = 0; i < n; i++) {
      const p = this.add.image(x, y, 'px').setTint(colors[i % colors.length]).setScale(size).setDepth(15000);
      this.world.add(p);
      const a = Math.random() * Math.PI * 2;
      const d = speed * (0.3 + Math.random() * 0.7);
      this.tweens.add({
        targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0,
        duration: life * (0.6 + Math.random() * 0.6), ease: 'Quad.easeOut', onComplete: () => p.destroy(),
      });
    }
  }

  leafFx(u: Unit) {
    for (let i = 0; i < 3; i++) {
      const leaf = this.add.image(u.sprite.x + Phaser.Math.Between(-6, 6), u.sprite.y - 22, 'leaf').setDepth(15000);
      this.world.add(leaf);
      this.tweens.add({
        targets: leaf, y: u.sprite.y, x: leaf.x + Phaser.Math.Between(-8, 8), angle: 180, alpha: 0,
        delay: i * 120, duration: 1100, onComplete: () => leaf.destroy(),
      });
    }
  }

  /** Little personality: ESYNH sighs, November drops leaves. */
  idleFx() {
    if (this.phase === 'over') return;
    for (const v of this.units) if (v.alive && v.burn > 0) {
      this.burst(v.sprite.x + Phaser.Math.Between(-4, 4), v.sprite.y - 6, [0xff4f1a, 0xff9a2e, 0xffd34f], 3, 8, 600);
    }
    const u = Phaser.Utils.Array.GetRandom(this.players().filter((p) => p.idleFx)) as Unit | null;
    if (!u || Math.random() < 0.4) return;
    const dir = u.sprite.flipX ? -1 : 1;
    if (u.idleFx === 'frost') {
      this.burst(u.sprite.x + dir * 5, u.sprite.y - 13, [0xeaf6ff, 0xa9d8f5], 3, 5, 700);
    } else if (u.idleFx === 'sigh') {
      const p = this.add.image(u.sprite.x + dir * 4, u.sprite.y - 14, 'px').setTint(0x8a7fa0).setScale(2).setDepth(15000);
      this.world.add(p);
      this.tweens.add({ targets: p, y: p.y + 6, x: p.x + dir * 4, alpha: 0, duration: 900, onComplete: () => p.destroy() });
    } else if (u.idleFx === 'leaf') {
      const l = this.add.image(u.sprite.x + Phaser.Math.Between(-8, 8), u.sprite.y - 24, 'leaf').setDepth(15000);
      this.world.add(l);
      this.tweens.add({ targets: l, y: u.sprite.y, angle: 160, alpha: 0, duration: 1600, onComplete: () => l.destroy() });
    } else if (u.idleFx === 'ember') {
      const p = this.add.image(u.sprite.x + Phaser.Math.Between(-4, 4), u.sprite.y - 20, 'px').setTint(0xff9a2e).setDepth(15000);
      this.world.add(p);
      this.tweens.add({ targets: p, y: p.y - 10, alpha: 0, duration: 900, onComplete: () => p.destroy() });
    } else if (u.idleFx === 'spark') {
      this.burst(u.sprite.x + Phaser.Math.Between(-3, 3), u.sprite.y - 19, [0xfff04f, 0x4fe3ff, 0xffffff], 3, 7, 250);
    } else if (u.idleFx === 'glint') {
      const p = this.add.image(u.sprite.x + Phaser.Math.Between(-6, 6), u.sprite.y - Phaser.Math.Between(6, 20), 'flash').setScale(0.6).setTint(0xffffff).setDepth(15000);
      this.world.add(p);
      this.tweens.add({ targets: p, scale: 0, duration: 400, onComplete: () => p.destroy() });
    } else if (u.idleFx === 'smoke') {
      // cigar smoke curling up from the tip
      const p = this.add.image(u.sprite.x + dir * 5, u.sprite.y - 13, 'px').setTint(0xb8b8c0).setScale(2).setAlpha(0.7).setDepth(15000);
      this.world.add(p);
      this.tweens.add({ targets: p, y: p.y - 10, x: p.x + dir * 3, alpha: 0, scale: 3, duration: 1300, ease: 'Sine.easeOut', onComplete: () => p.destroy() });
    }
  }
}
