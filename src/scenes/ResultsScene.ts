import Phaser from 'phaser';
import { COLORS, GAME_W, css } from '../config';
import { CHARACTERS } from '../data/characters';
import { MISSIONS, winBonus } from '../data/missions';
import { loadSave, writeSave } from '../save';
import { Button } from '../ui/Button';
import { txt } from '../ui/text';
import { sfx } from '../audio/Synth';
import { backdrop } from './backdrop';

interface ResultData { victory: boolean; kills: number; survivors: number; turns: number; squad: string[]; mission?: number }

export const REWARD = { perKill: 10, perSurvivor: 15 };

export class ResultsScene extends Phaser.Scene {
  constructor() { super('Results'); }

  create(d: ResultData) {
    backdrop(this);
    const mi = d.mission ?? 0;
    const lines: [string, number][] = [];
    if (d.victory) lines.push([`${MISSIONS[mi].venue} BONUS`, winBonus(mi)]);
    lines.push([`KNOCKOUTS  ${d.kills} x ${REWARD.perKill}`, d.kills * REWARD.perKill]);
    if (d.victory) lines.push([`STILL STANDING  ${d.survivors} x ${REWARD.perSurvivor}`, d.survivors * REWARD.perSurvivor]);
    const earned = lines.reduce((a, [, n]) => a + n, 0);

    const save = loadSave();
    const before = save.coins;
    save.coins += earned;
    if (d.victory) save.wins++;
    const firstClear = d.victory && mi >= save.cleared;
    if (d.victory) save.cleared = Math.max(save.cleared, mi + 1);
    writeSave(save);
    const hasNext = d.victory && mi + 1 < MISSIONS.length;
    const tourDone = d.victory && mi === MISSIONS.length - 1;

    txt(this, GAME_W / 2, 40, d.victory ? 'SET COMPLETE!' : 'BOOED OFF STAGE', 24, d.victory ? css(COLORS.gold) : css(COLORS.red)).setOrigin(0.5);
    const sub = tourDone ? 'TOUR COMPLETE! VALPARAISO IS SAVED.'
      : firstClear && hasNext ? `NEW SHOW BOOKED: ${MISSIONS[mi + 1].venue}!`
      : d.victory ? 'THE COVERS HAVE LEFT THE BUILDING.' : 'THE COVER BAND PLAYS ON... FOR NOW.';
    txt(this, GAME_W / 2, 72, sub, 8, firstClear || tourDone ? css(COLORS.cyan) : '#c8c0d8').setOrigin(0.5);
    txt(this, GAME_W / 2, 88, `TURNS: ${d.turns}`, 8, css(COLORS.gray)).setOrigin(0.5);

    lines.forEach(([label, n], i) => {
      const y = 120 + i * 20;
      const a = txt(this, 150, y, label, 8).setAlpha(0);
      const b = txt(this, 490, y, `+${n}`, 8, css(COLORS.gold)).setOrigin(1, 0).setAlpha(0);
      this.time.delayedCall(400 + i * 350, () => { a.setAlpha(1); b.setAlpha(1); sfx.coin(); });
    });
    const totalY = 120 + lines.length * 20 + 12;
    this.add.rectangle(150, totalY - 6, 340, 2, COLORS.border).setOrigin(0);
    const total = txt(this, 150, totalY, 'COINS', 16, css(COLORS.gold));
    const count = txt(this, 490, totalY, `${before}`, 16, css(COLORS.gold)).setOrigin(1, 0);
    this.add.image(132, totalY + 8, 'coin').setScale(2);
    this.tweens.addCounter({
      from: before, to: save.coins, delay: 400 + lines.length * 350, duration: 700,
      onUpdate: (tw) => count.setText(`${Math.round(tw.getValue() ?? save.coins)}`),
    });
    total.setAlpha(1);

    const affordable = CHARACTERS.filter((c) => !save.unlocked.includes(c.id) && c.price <= save.coins);
    if (affordable.length) {
      const msg = txt(this, GAME_W / 2, totalY + 40, `NEW SONG AFFORDABLE: ${affordable[0].short}!`, 8, css(COLORS.pink)).setOrigin(0.5).setAlpha(0);
      this.time.delayedCall(1600, () => {
        msg.setAlpha(1);
        this.tweens.add({ targets: msg, alpha: 0.4, duration: 500, yoyo: true, repeat: -1 });
      });
    }

    new Button(this, GAME_W / 2 - 250, 310, 150, 28, 'TOUR DATES', () => this.scene.start('Tour'));
    new Button(this, GAME_W / 2 - 75, 310, 150, 28, 'SHOP', () => this.scene.start('Shop'), affordable.length ? { fill: 0x5a1838, border: COLORS.gold } : {});
    new Button(this, GAME_W / 2 + 100, 310, 150, 28, hasNext ? 'NEXT SHOW' : 'PLAY AGAIN',
      () => this.scene.start('Squad', { mission: hasNext ? mi + 1 : mi }), { fill: 0x5a1838, border: COLORS.pink });
  }
}
