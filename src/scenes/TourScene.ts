import Phaser from 'phaser';
import { COLORS, GAME_W, css } from '../config';
import { MISSIONS, enemyCount, winBonus } from '../data/missions';
import { isHardcore, loadSave } from '../save';
import { Button } from '../ui/Button';
import { txt } from '../ui/text';
import { Music } from '../audio/Music';
import { sfx } from '../audio/Synth';
import { backdrop } from './backdrop';

/** Tour dates: the venues the band has played. Each win unlocks the next show. */
export class TourScene extends Phaser.Scene {
  private pick = 0;
  private detail: Phaser.GameObjects.GameObject[] = [];
  private rows: { frame: Phaser.GameObjects.Rectangle; i: number }[] = [];
  private playBtn!: Button;

  constructor() { super('Tour'); }

  create() {
    backdrop(this);
    const save = loadSave();
    const open = Math.min(save.cleared, MISSIONS.length - 1);
    this.pick = open;
    this.rows = [];

    txt(this, GAME_W / 2, 10, 'TOUR DATES', 16, css(COLORS.pink)).setOrigin(0.5, 0);
    if (isHardcore()) txt(this, GAME_W / 2, 31, 'HARDCORE RUN: FALLEN SONGS ARE GONE FOR GOOD', 8, css(COLORS.red)).setOrigin(0.5, 0);

    // two columns of five shows
    MISSIONS.forEach((m, i) => {
      const x = 10 + Math.floor(i / 5) * 196, y = 48 + (i % 5) * 52;
      const locked = i > save.cleared;
      const done = i < save.cleared;
      const frame = this.add.rectangle(x, y, 190, 48, COLORS.panel, 0.95).setOrigin(0).setStrokeStyle(2, COLORS.border);
      txt(this, x + 8, y + 7, `NIGHT ${i + 1}`, 8, css(locked ? COLORS.gray : COLORS.gold));
      txt(this, x + 8, y + 20, locked ? '? ? ?' : m.venue, 8, locked ? css(COLORS.gray) : '#ffffff')
        .setScale(Math.min(1, 174 / Math.max(1, m.venue.length * 8)));
      txt(this, x + 8, y + 33, locked ? 'LOCKED' : m.where, 8, css(COLORS.gray)).setScale(0.75);
      if (done) txt(this, x + 182, y + 7, 'PLAYED', 8, css(COLORS.green)).setOrigin(1, 0).setScale(0.75);
      if (!locked) {
        frame.setInteractive({ useHandCursor: true }).on('pointerdown', () => { sfx.click(); this.select(i); });
      }
      this.rows.push({ frame, i });
    });

    // detail panel
    this.add.rectangle(402, 48, 230, 256, COLORS.panel, 0.95).setOrigin(0).setStrokeStyle(2, COLORS.border);
    this.playBtn = new Button(this, 414, 270, 206, 26, 'BOOK IT', () => this.play(), { fill: 0x5a1838, border: COLORS.pink });

    new Button(this, 10, 318, 90, 28, 'BACK', () => this.scene.start('Title'));
    new Button(this, 108, 318, 90, 28, 'SHOP', () => this.scene.start('Shop'));
    txt(this, GAME_W - 10, 332, `SHOWS PLAYED ${Math.min(save.cleared, MISSIONS.length)}/${MISSIONS.length}`, 8, css(COLORS.gold)).setOrigin(1, 0.5);
    this.select(open);
    Music.menu(this);
  }

  private select(i: number) {
    this.pick = i;
    for (const r of this.rows) r.frame.setStrokeStyle(2, r.i === i ? COLORS.pink : COLORS.border);
    for (const d of this.detail) d.destroy();
    const m = MISSIONS[i];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => { this.detail.push(o); return o; };
    this.detail = [];
    add(txt(this, 412, 58, `NIGHT ${i + 1}`, 8, css(COLORS.gold)));
    add(txt(this, 412, 72, m.venue, 8).setWordWrapWidth(210, true).setLineSpacing(3));
    add(txt(this, 412, 98, m.where, 8, css(COLORS.cyan)));
    add(txt(this, 412, 118, m.blurb, 8, css(COLORS.gray)).setWordWrapWidth(210, true).setLineSpacing(4));
    const foes = enemyCount(m);
    add(txt(this, 412, 214, `COVER SONGS: ${foes}`, 8, '#c8c0d8'));
    if (/[XZ]/.test(m.map.join(''))) add(txt(this, 412, 228, 'BOSS ON STAGE!', 8, css(COLORS.red)));
    if (m.tutorial) add(txt(this, 412, 228, 'TUTORIAL SHOW', 8, css(COLORS.green)));
    add(txt(this, 412, 244, `WIN BONUS: ${winBonus(i)} COINS`, 8, css(COLORS.gold)));
  }

  private play() {
    this.scene.start('Squad', { mission: this.pick });
  }
}
