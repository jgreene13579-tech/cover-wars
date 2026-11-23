import Phaser from 'phaser';
import { COLORS, GAME_W, css } from '../config';
import { getCharacter } from '../data/characters';
import { STAT_GAIN, STAT_LABEL, StatPick, boostedStats } from '../data/progress';
import { loadSave, pendingLevelUps, progressFor, writeSave } from '../save';
import { Button } from '../ui/Button';
import { txt } from '../ui/text';
import { sfx } from '../audio/Synth';
import { backdrop } from './backdrop';

interface LevelUpData { next?: { key: string; data?: object } }

/** Each level-up lets the player raise one stat: attack, aim or health. */
export class LevelUpScene extends Phaser.Scene {
  private next: LevelUpData['next'];
  private parts: Phaser.GameObjects.GameObject[] = [];

  constructor() { super('LevelUp'); }

  create(d: LevelUpData) {
    this.next = d?.next;
    this.parts = [];
    backdrop(this);
    txt(this, GAME_W / 2, 30, 'LEVEL UP!', 24, css(COLORS.pink)).setOrigin(0.5);
    this.showNext();
  }

  private showNext() {
    for (const p of this.parts) p.destroy();
    this.parts = [];
    const save = loadSave();
    const id = pendingLevelUps(save)[0];
    if (!id) {
      this.scene.start(this.next?.key ?? 'Tour', this.next?.data);
      return;
    }
    const c = getCharacter(id);
    const p = progressFor(save, id);
    const st = boostedStats(c, p);
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => { this.parts.push(o); return o; };

    const spr = add(this.add.sprite(GAME_W / 2, 140, c.id, 'f0').setOrigin(0.5, 1).setScale(4));
    spr.play(`${c.id}-idle`);
    add(txt(this, GAME_W / 2, 152, c.name.toUpperCase(), 16).setOrigin(0.5, 0));
    add(txt(this, GAME_W / 2, 176, `NOW LEVEL ${p.level}${p.picks > 1 ? `  (${p.picks} PICKS LEFT)` : ''}`, 8, css(COLORS.cyan)).setOrigin(0.5, 0));
    add(txt(this, GAME_W / 2, 194, 'PICK ONE STAT TO RAISE:', 8, '#c8c0d8').setOrigin(0.5, 0));

    const [lo, hi] = st.weapon.dmg;
    const options: { pick: StatPick; now: string; then: string }[] = [
      { pick: 'atk', now: `DMG ${lo}-${hi}`, then: `${lo + STAT_GAIN.atk}-${hi + STAT_GAIN.atk}` },
      { pick: 'aim', now: `AIM ${st.aim}`, then: `${st.aim + STAT_GAIN.aim}` },
      { pick: 'hp', now: `HP ${st.hp}`, then: `${st.hp + STAT_GAIN.hp}` },
    ];
    const bw = 180;
    const gap = 12;
    const x0 = GAME_W / 2 - (bw * 3 + gap * 2) / 2;
    options.forEach((o, i) => {
      const x = x0 + i * (bw + gap);
      const b = add(new Button(this, x, 220, bw, 34, STAT_LABEL[o.pick].name, () => this.choose(id, o.pick), { fill: 0x2a1a4a, border: COLORS.pink, size: 16 }));
      add(txt(this, x + bw / 2, 262, STAT_LABEL[o.pick].gain, 8, css(COLORS.gold)).setOrigin(0.5, 0));
      add(txt(this, x + bw / 2, 278, `${o.now} > ${o.then}`, 8, css(COLORS.green)).setOrigin(0.5, 0));
      void b;
    });
    const others = pendingLevelUps(save).length - 1;
    if (others > 0) add(txt(this, GAME_W / 2, 320, `${others} MORE SONG${others > 1 ? 'S' : ''} LEVELED UP`, 8, css(COLORS.gray)).setOrigin(0.5, 0));
  }

  private choose(id: string, pick: StatPick) {
    const save = loadSave();
    const p = progressFor(save, id);
    if (p.picks <= 0) return;
    p[pick]++;
    p.picks--;
    writeSave(save);
    sfx.coin();
    this.cameras.main.flash(150, 255, 79, 163);
    this.showNext();
  }
}
