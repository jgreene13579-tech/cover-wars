import Phaser from 'phaser';
import { COLORS, GAME_W, css } from '../config';
import { CHARACTERS } from '../data/characters';
import { isHardcore, loadSave, setMode, type Mode } from '../save';
import { Button } from '../ui/Button';
import { txt } from '../ui/text';
import { Music } from '../audio/Music';
import { unlockAudio } from '../audio/Synth';
import { backdrop } from './backdrop';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    backdrop(this);
    const save = loadSave();

    if (this.textures.exists('logo')) {
      const logo = this.add.image(GAME_W / 2, 70, 'logo');
      logo.setScale(Math.min(360 / logo.width, 110 / logo.height));
    } else {
      txt(this, GAME_W / 2 + 3, 53, 'MINDFULLY BLIND', 32, css(COLORS.cyan)).setOrigin(0.5);
      txt(this, GAME_W / 2, 50, 'MINDFULLY BLIND', 32, css(COLORS.pink)).setOrigin(0.5);
    }
    const sub = txt(this, GAME_W / 2, 120, 'COVER  WARS', 16, css(COLORS.gold)).setOrigin(0.5);
    this.tweens.add({ targets: sub, alpha: 0.6, duration: 700, yoyo: true, repeat: -1 });
    txt(this, GAME_W / 2, 146, 'THE COVER SONGS HAVE TAKEN THE STAGE.', 8, '#c8c0d8').setOrigin(0.5);

    // the band, lined up on the horizon
    const band = CHARACTERS.filter((c) => save.unlocked.includes(c.id)).slice(0, 7);
    band.forEach((c, i) => {
      const x = GAME_W / 2 + (i - (band.length - 1) / 2) * 72;
      const s = this.add.sprite(x, 236, c.id, 'f0').setOrigin(0.5, 1).setScale(3);
      s.play({ key: `${c.id}-idle`, startFrame: i % 2 });
    });

    const go = (mode: Mode, key: string) => { unlockAudio(); setMode(mode); this.scene.start(key); };
    new Button(this, GAME_W / 2 - 170, 246, 160, 28, 'PLAY', () => go('normal', 'Tour'), { size: 16, fill: 0x5a1838, border: COLORS.pink });
    new Button(this, GAME_W / 2 + 10, 246, 160, 28, 'HARDCORE', () => go('hardcore', 'Tour'), { size: 16, fill: 0x3a0a14, border: COLORS.red });
    txt(this, GAME_W / 2 - 90, 280, 'THE NORMAL TOUR', 8, css(COLORS.gray)).setOrigin(0.5, 0);
    txt(this, GAME_W / 2 + 90, 280, 'FALLEN SONGS STAY GONE', 8, css(COLORS.red)).setOrigin(0.5, 0);
    txt(this, GAME_W / 2 + 90, 291, '+30% COINS', 8, css(COLORS.red)).setOrigin(0.5, 0);
    new Button(this, GAME_W / 2 - 80, 308, 160, 20, `SHOP${isHardcore() ? ' (HARDCORE)' : ''}`, () => { unlockAudio(); this.scene.start('Shop'); });

    txt(this, 10, 10, `COINS ${save.coins}${isHardcore() ? '  (HARDCORE RUN)' : ''}`, 8, isHardcore() ? css(COLORS.red) : css(COLORS.gold));
    // tappable mute (phones have no M key); keyboard players get the battle shortcuts
    const touch = this.sys.game.device.input.touch;
    const muteLabel = () => (Music.muted ? 'SOUND: OFF' : 'SOUND: ON') + (touch ? '' : ' (M)');
    const mute = txt(this, GAME_W - 10, 10, muteLabel(), 8, css(COLORS.gray)).setOrigin(1, 0)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => { unlockAudio(); Music.toggleMute(this.game); mute.setText(muteLabel()); });
    this.input.keyboard?.on('keydown-M', () => this.time.delayedCall(0, () => mute.setText(muteLabel())));
    if (!touch) txt(this, GAME_W / 2, 346, 'BATTLE KEYS: 1 SHOOT  2 SPECIAL  TAB NEXT  ENTER END TURN', 8, css(COLORS.gray)).setOrigin(0.5);

    // browsers only allow sound after the first click
    this.input.once('pointerdown', () => { unlockAudio(); Music.menu(this); });
    if (!this.sound.locked) Music.menu(this);
  }
}
