import Phaser from 'phaser';
import type { IdleFx, Special, Weapon } from '../data/characters';

export type Team = 'player' | 'enemy';

export interface UnitOpts {
  id: string; // character / enemy id
  team: Team;
  name: string;
  archetype: string;
  hp: number;
  aim: number;
  move: number;
  weapon: Weapon;
  special?: Special;
  tex: string;
  x: number;
  y: number;
  boss?: boolean;
  idleFx?: IdleFx;
}

/** Feet of a unit standing on tile (x, y), in world pixels. */
export const tileToWorld = (x: number, y: number) => ({ x: x * 16 + 8, y: y * 16 + 14 });

export class Unit {
  id: string; team: Team; name: string; archetype: string;
  hp: number; maxHp: number; aim: number; move: number;
  weapon: Weapon; special?: Special; tex: string; boss: boolean; idleFx: IdleFx;
  x: number; y: number;
  ap = 0;
  cooldown = 0;
  stealth = false;
  stealthTurn = 0;
  marked = false; // Vision's Second Sight: squad gets +20 aim on this unit
  burn = 0; // Fire Sale: turns of burning left
  overwatch = false; // No Running: reaction shot during the enemy turn
  taunting = false; // Toast: enemies in range must target him; he fires back
  braced = false; // started the turn behind Indy Blvd's barrier: +aim until they move
  serial = false; // Pen & Paper's Bleed You Dry: knockouts give another shot
  decoy = false; // Distraction's fake copy: soaks shots, not a real band member
  active: boolean; // enemies start unaware
  alive = true;
  clapCd = 1; // boss special
  tpCd = 0; // Free Bird: turns until he can teleport again
  controlling: Unit | null = null; // Hotel California: who he has checked in
  controlledBy: Unit | null = null; // band member: who has them checked in
  mcCd = 0; // Hotel California: turns until he can check someone in again
  sprite: Phaser.GameObjects.Sprite;
  bar: Phaser.GameObjects.Graphics;
  private stealthTween?: Phaser.Tweens.Tween;

  constructor(private scene: Phaser.Scene, parent: Phaser.GameObjects.Container, o: UnitOpts) {
    this.id = o.id; this.team = o.team; this.name = o.name; this.archetype = o.archetype;
    this.hp = o.hp; this.maxHp = o.hp; this.aim = o.aim; this.move = o.move;
    this.weapon = o.weapon; this.special = o.special; this.tex = o.tex;
    this.boss = !!o.boss; this.idleFx = o.idleFx ?? null;
    this.x = o.x; this.y = o.y;
    this.active = o.team === 'player';
    const p = tileToWorld(o.x, o.y);
    this.sprite = scene.add.sprite(p.x, p.y, o.tex, 'f0').setOrigin(0.5, 1);
    this.sprite.play({ key: `${o.tex}-idle`, startFrame: Phaser.Math.Between(0, 1) });
    if (o.team === 'enemy') this.sprite.setFlipX(true);
    this.bar = scene.add.graphics();
    parent.add([this.sprite, this.bar]);
    this.drawBar();
    this.sync();
  }

  get isPlayer() { return this.team === 'player'; }

  face(tx: number) {
    if (tx < this.x) this.sprite.setFlipX(true);
    else if (tx > this.x) this.sprite.setFlipX(false);
  }

  /** Where shots leave the gun, in world pixels. */
  muzzle() {
    const dir = this.sprite.flipX ? -1 : 1;
    return { x: this.sprite.x + dir * 8, y: this.sprite.y - 10 };
  }

  chest() { return { x: this.sprite.x, y: this.sprite.y - 10 }; }

  sync() {
    this.sprite.setDepth(this.alive ? this.sprite.y : this.sprite.y - 300);
    this.bar.setPosition(Math.round(this.sprite.x), Math.round(this.sprite.y) - 25);
    this.bar.setDepth(10000);
  }

  drawBar() {
    const g = this.bar;
    g.clear();
    if (!this.alive) return;
    const w = 14;
    g.fillStyle(0x0b0710, 1).fillRect(-8, 0, 16, 4);
    const col = this.team === 'player' ? 0x6dff7a : this.boss ? 0xffd34f : 0xff4f4f;
    g.fillStyle(col, 1);
    if (this.maxHp <= 7) {
      for (let i = 0; i < this.hp; i++) {
        const x0 = Math.floor((i * w) / this.maxHp);
        const x1 = Math.floor(((i + 1) * w) / this.maxHp);
        g.fillRect(-7 + x0, 1, Math.max(1, x1 - x0 - 1), 2);
      }
    } else {
      g.fillRect(-7, 1, Math.max(1, Math.round((w * this.hp) / this.maxHp)), 2);
    }
  }

  setStealth(on: boolean) {
    this.stealth = on;
    this.stealthTween?.stop();
    if (on) {
      this.sprite.setAlpha(0.45);
      this.stealthTween = this.scene.tweens.add({
        targets: this.sprite, alpha: 0.2, duration: 700, yoyo: true, repeat: -1,
      });
    } else {
      this.sprite.setAlpha(1);
    }
  }
}
