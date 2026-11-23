import Phaser from 'phaser';
import { COLORS, GAME_W, css } from '../config';
import { CHARACTERS, getCharacter } from '../data/characters';
import { MISSIONS, winBonus } from '../data/missions';
import { MAX_LEVEL, addXp, xpFor, xpToNext } from '../data/progress';
import { loadSave, pendingLevelUps, progressFor, writeSave } from '../save';
import { Button } from '../ui/Button';
import { txt } from '../ui/text';
import { sfx } from '../audio/Synth';
import { backdrop } from './backdrop';

interface ResultData {
  victory: boolean; kills: number; survivors: number; turns: number; squad: string[]; mission?: number;
  killsBy?: Record<string, number>; downed?: string[];
}

export const REWARD = { perKill: 10, perSurvivor: 15 };

const COIN_X0 = 24;
const COIN_X1 = 300;
const XP_X = 336;
const XP_W = 280;

export class ResultsScene extends Phaser.Scene {
  constructor() { super('Results'); }

  create(d: ResultData) {
    backdrop(this);
    const mi = d.mission ?? 0;
    const lines: [string, number][] = [];
    if (d.victory) lines.push([`${MISSIONS[mi].venue} BONUS`, winBonus(mi)]);
    lines.push([`KNOCKOUTS ${d.kills} x ${REWARD.perKill}`, d.kills * REWARD.perKill]);
    if (d.victory) lines.push([`STANDING ${d.survivors} x ${REWARD.perSurvivor}`, d.survivors * REWARD.perSurvivor]);
    const earned = lines.reduce((a, [, n]) => a + n, 0);

    const save = loadSave();
    const before = save.coins;
    save.coins += earned;
    if (d.victory) save.wins++;
    const firstClear = d.victory && mi >= save.cleared;
    if (d.victory) save.cleared = Math.max(save.cleared, mi + 1);

    // XP for everyone who played this show
    const xpRows = d.squad.map((id) => {
      const p = progressFor(save, id);
      const startLevel = p.level;
      const startXp = p.xp;
      const kills = d.killsBy?.[id] ?? 0;
      const downed = !!d.downed?.includes(id);
      const gain = xpFor(d.victory, kills, downed);
      const levels = addXp(p, gain);
      return { id, gain, kills, downed, startLevel, startXp, levels, p };
    });
    writeSave(save);
    const hasNext = d.victory && mi + 1 < MISSIONS.length;
    const tourDone = d.victory && mi === MISSIONS.length - 1;

    txt(this, GAME_W / 2, 26, d.victory ? 'SET COMPLETE!' : 'BOOED OFF STAGE', 24, d.victory ? css(COLORS.gold) : css(COLORS.red)).setOrigin(0.5);
    const sub = tourDone ? 'TOUR COMPLETE! VALPARAISO IS SAVED.'
      : firstClear && hasNext ? `NEW SHOW BOOKED: ${MISSIONS[mi + 1].venue}!`
      : d.victory ? 'THE COVERS HAVE LEFT THE BUILDING.' : 'THE COVER BAND PLAYS ON... FOR NOW.';
    txt(this, GAME_W / 2, 54, sub, 8, firstClear || tourDone ? css(COLORS.cyan) : '#c8c0d8').setOrigin(0.5);
    txt(this, GAME_W / 2, 68, `TURNS: ${d.turns}`, 8, css(COLORS.gray)).setOrigin(0.5);

    // ---- coins (left)
    txt(this, COIN_X0, 88, 'COINS', 8, css(COLORS.gray));
    lines.forEach(([label, n], i) => {
      const y = 106 + i * 18;
      const a = txt(this, COIN_X0, y, label, 8).setAlpha(0);
      const b = txt(this, COIN_X1, y, `+${n}`, 8, css(COLORS.gold)).setOrigin(1, 0).setAlpha(0);
      if (a.width > COIN_X1 - COIN_X0 - 50) a.setScale((COIN_X1 - COIN_X0 - 50) / a.width);
      this.time.delayedCall(400 + i * 350, () => { a.setAlpha(1); b.setAlpha(1); sfx.coin(); });
    });
    const totalY = 106 + lines.length * 18 + 10;
    this.add.rectangle(COIN_X0, totalY - 6, COIN_X1 - COIN_X0, 2, COLORS.border).setOrigin(0);
    this.add.image(COIN_X0 + 8, totalY + 8, 'coin').setScale(2);
    txt(this, COIN_X0 + 22, totalY, 'TOTAL', 16, css(COLORS.gold));
    const count = txt(this, COIN_X1, totalY, `${before}`, 16, css(COLORS.gold)).setOrigin(1, 0);
    this.tweens.addCounter({
      from: before, to: save.coins, delay: 400 + lines.length * 350, duration: 700,
      onUpdate: (tw) => count.setText(`${Math.round(tw.getValue() ?? save.coins)}`),
    });

    const affordable = CHARACTERS.filter((c) => !save.unlocked.includes(c.id) && c.price <= save.coins);
    if (affordable.length) {
      const msg = txt(this, (COIN_X0 + COIN_X1) / 2, totalY + 34, `NEW SONG AFFORDABLE: ${affordable[0].short}!`, 8, css(COLORS.pink)).setOrigin(0.5).setAlpha(0);
      if (msg.width > COIN_X1 - COIN_X0) msg.setScale((COIN_X1 - COIN_X0) / msg.width);
      this.time.delayedCall(1600, () => {
        msg.setAlpha(1);
        this.tweens.add({ targets: msg, alpha: 0.4, duration: 500, yoyo: true, repeat: -1 });
      });
    }

    // ---- XP (right)
    txt(this, XP_X, 88, 'EXPERIENCE', 8, css(COLORS.gray));
    xpRows.forEach((r, i) => this.xpRow(r, 102 + i * 46, 600 + i * 300));

    // ---- buttons: level-up picks come first if anyone leveled
    const go = (key: string, data?: object) => {
      if (pendingLevelUps(loadSave()).length) this.scene.start('LevelUp', { next: { key, data } });
      else this.scene.start(key, data);
    };
    new Button(this, GAME_W / 2 - 250, 316, 150, 28, 'TOUR DATES', () => go('Tour'));
    new Button(this, GAME_W / 2 - 75, 316, 150, 28, 'SHOP', () => go('Shop'), affordable.length ? { fill: 0x5a1838, border: COLORS.gold } : {});
    new Button(this, GAME_W / 2 + 100, 316, 150, 28, hasNext ? 'NEXT SHOW' : 'PLAY AGAIN',
      () => go('Squad', { mission: hasNext ? mi + 1 : mi }), { fill: 0x5a1838, border: COLORS.pink });
  }

  /** One band member's XP gain: sprite, name, +XP, and a bar that fills (and rolls over on a level-up). */
  private xpRow(r: { id: string; gain: number; kills: number; downed: boolean; startLevel: number; startXp: number; levels: number; p: { level: number; xp: number } }, y: number, delay: number) {
    const c = getCharacter(r.id);
    this.add.rectangle(XP_X, y, XP_W, 40, COLORS.panel, 0.85).setOrigin(0).setStrokeStyle(1, COLORS.border);
    const spr = this.add.sprite(XP_X + 16, y + 36, c.id, 'f0').setOrigin(0.5, 1).setScale(1.5);
    spr.play(`${c.id}-idle`);
    if (r.downed) spr.setTint(0x8a8098);
    const name = txt(this, XP_X + 34, y + 5, c.short, 8);
    if (name.width > 120) name.setScale(120 / name.width);
    const lvl = txt(this, XP_X + XP_W - 6, y + 5, `LV ${r.startLevel}`, 8, css(COLORS.cyan)).setOrigin(1, 0);
    const why = `+${r.gain} XP${r.kills ? `  ${r.kills} KO` : ''}${r.downed ? '  (DOWNED)' : ''}`;
    txt(this, XP_X + 34, y + 17, why, 8, css(COLORS.gold)).setScale(0.75);

    const barX = XP_X + 34;
    const barW = XP_W - 42;
    const barY = y + 29;
    this.add.rectangle(barX, barY, barW, 5, 0x0b0710).setOrigin(0);
    const fill = this.add.rectangle(barX, barY, 0, 5, COLORS.cyan).setOrigin(0);
    const frac = (level: number, xp: number) => (level >= MAX_LEVEL ? 1 : xp / xpToNext(level));
    fill.width = barW * frac(r.startLevel, r.startXp);

    // animate: fill to full for each level gained, then to the final amount
    const steps: { to: number; level?: number }[] = [];
    for (let i = 0; i < r.levels; i++) steps.push({ to: 1, level: r.startLevel + i + 1 });
    steps.push({ to: frac(r.p.level, r.p.xp) });
    let t = delay;
    steps.forEach((s, i) => {
      this.time.delayedCall(t, () => {
        if (i > 0 && steps[i - 1].level) fill.width = 0;
        this.tweens.add({ targets: fill, width: barW * s.to, duration: 450, ease: 'Quad.easeOut' });
        if (s.level) this.time.delayedCall(450, () => {
          lvl.setText(`LV ${s.level}`);
          sfx.coin();
          const up = txt(this, XP_X + XP_W - 6, y + 17, 'LEVEL UP!', 8, css(COLORS.pink)).setOrigin(1, 0).setScale(0.75);
          this.tweens.add({ targets: up, alpha: 0.4, duration: 400, yoyo: true, repeat: -1 });
        });
      });
      t += 500;
    });
  }
}
