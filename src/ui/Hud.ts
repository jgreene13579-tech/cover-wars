import Phaser from 'phaser';
import { COLORS, GAME_W, HUD_Y, css } from '../config';
import type { Unit } from '../tactics/Unit';
import { Button } from './Button';
import { txt } from './text';

export interface HudState {
  unit: Unit | null;
  turn: number;
  playerTurn: boolean;
  canShoot: boolean;
  canSpecial: boolean;
  specialLabel: string;
  shootActive: boolean;
  specialActive: boolean;
  canNext: boolean;
  info: string[];
  infoColor: string;
  confirm: string | null;
  showCancel: boolean;
}

export interface HudCallbacks {
  onShoot: () => void;
  onSpecial: () => void;
  onNext: () => void;
  onEnd: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const D = 100; // HUD depth

export class Hud {
  private portrait: Phaser.GameObjects.Sprite;
  private nameText: Phaser.GameObjects.Text;
  private archText: Phaser.GameObjects.Text;
  private pips: Phaser.GameObjects.Graphics;
  private hpLabel: Phaser.GameObjects.Text;
  private apLabel: Phaser.GameObjects.Text;
  private shootBtn: Button;
  private specialBtn: Button;
  private nextBtn: Button;
  private endBtn: Button;
  private info: Phaser.GameObjects.Text;
  private confirmBtn: Button;
  private cancelBtn: Button;
  private turnText: Phaser.GameObjects.Text;
  private bannerBg: Phaser.GameObjects.Rectangle;
  private bannerText: Phaser.GameObjects.Text;
  private toastText: Phaser.GameObjects.Text;
  private bannerTimer?: Phaser.Time.TimerEvent;

  constructor(private scene: Phaser.Scene, cb: HudCallbacks) {
    const y = HUD_Y;
    scene.add.rectangle(0, y, GAME_W, 72, COLORS.panel).setOrigin(0).setDepth(D);
    scene.add.rectangle(0, y, GAME_W, 2, COLORS.pink).setOrigin(0).setDepth(D);
    scene.add.rectangle(196, y + 8, 2, 58, COLORS.border).setOrigin(0).setDepth(D);
    scene.add.rectangle(464, y + 8, 2, 58, COLORS.border).setOrigin(0).setDepth(D);

    // portrait + unit stats
    scene.add.rectangle(6, y + 6, 40, 60, COLORS.bg).setOrigin(0).setStrokeStyle(2, COLORS.border).setDepth(D);
    this.portrait = scene.add.sprite(26, y + 64, 'ice', 'f0').setOrigin(0.5, 1).setScale(2).setDepth(D + 1);
    this.nameText = txt(scene, 54, y + 8, '').setDepth(D + 1);
    this.archText = txt(scene, 54, y + 20, '', 8, css(COLORS.gray)).setDepth(D + 1);
    this.hpLabel = txt(scene, 54, y + 35, 'HP').setDepth(D + 1);
    this.apLabel = txt(scene, 54, y + 51, 'AP').setDepth(D + 1);
    this.pips = scene.add.graphics().setDepth(D + 1);

    // actions
    this.shootBtn = new Button(scene, 206, y + 8, 82, 26, 'SHOOT', cb.onShoot);
    this.specialBtn = new Button(scene, 294, y + 8, 164, 26, 'SPECIAL', cb.onSpecial);
    this.nextBtn = new Button(scene, 206, y + 40, 82, 26, 'NEXT', cb.onNext);
    this.endBtn = new Button(scene, 294, y + 40, 164, 26, 'END TURN', cb.onEnd);
    for (const b of [this.shootBtn, this.specialBtn, this.nextBtn, this.endBtn]) b.setDepth(D + 1);

    // info / confirm
    this.info = txt(scene, 472, y + 8, '').setLineSpacing(4).setDepth(D + 1);
    this.confirmBtn = new Button(scene, 472, y + 52, 86, 16, 'FIRE', cb.onConfirm, { fill: 0x5a1838, border: COLORS.pink }).setDepth(D + 1);
    this.cancelBtn = new Button(scene, 564, y + 52, 70, 16, 'CANCEL', cb.onCancel).setDepth(D + 1);

    // top overlays
    this.turnText = txt(scene, 8, 8, '', 8, css(COLORS.gold)).setDepth(D + 5);
    this.bannerBg = scene.add.rectangle(0, 120, GAME_W, 40, COLORS.bg, 0.85).setOrigin(0).setDepth(D + 10).setVisible(false);
    this.bannerText = txt(scene, GAME_W / 2, 140, '', 16).setOrigin(0.5).setDepth(D + 11).setVisible(false);
    this.toastText = txt(scene, GAME_W / 2, 40, '', 8, css(COLORS.gold)).setOrigin(0.5).setDepth(D + 11)
      .setBackgroundColor('#0b0710').setPadding(6, 4, 6, 4).setVisible(false);
  }

  render(s: HudState) {
    const u = s.unit;
    this.turnText.setText(`TURN ${s.turn}`);
    this.portrait.setVisible(!!u);
    this.pips.clear();
    this.hpLabel.setVisible(!!u);
    this.apLabel.setVisible(!!u);
    if (u) {
      if (this.portrait.texture.key !== u.tex) this.portrait.play(`${u.tex}-idle`);
      else if (!this.portrait.anims.isPlaying) this.portrait.play(`${u.tex}-idle`);
      this.portrait.setAlpha(u.stealth ? 0.5 : 1);
      this.nameText.setText(u.name.toUpperCase());
      this.archText.setText(u.stealth ? 'UNHEARD' : u.controlledBy ? 'CHECKED IN' : u.controlling ? 'HOLDING A GUEST' : u.archetype);
      const g = this.pips;
      for (let i = 0; i < u.maxHp; i++) {
        g.fillStyle(0x0b0710, 1).fillRect(76 + i * 8, HUD_Y + 34, 7, 9);
        g.fillStyle(i < u.hp ? (u.isPlayer ? COLORS.green : COLORS.red) : 0x3a2f4a, 1).fillRect(77 + i * 8, HUD_Y + 35, 5, 7);
      }
      for (let i = 0; i < Math.max(2, u.ap); i++) {
        g.fillStyle(0x0b0710, 1).fillRect(76 + i * 12, HUD_Y + 50, 10, 9);
        g.fillStyle(i < u.ap ? COLORS.gold : 0x3a2f4a, 1).fillRect(77 + i * 12, HUD_Y + 51, 8, 7);
      }
    } else {
      this.nameText.setText('');
      this.archText.setText('');
    }

    this.shootBtn.setEnabled(s.canShoot).setActive2(s.shootActive);
    this.specialBtn.setText(s.specialLabel).setEnabled(s.canSpecial).setActive2(s.specialActive);
    this.nextBtn.setEnabled(s.canNext);
    this.endBtn.setEnabled(s.playerTurn);

    this.info.setText(s.info.slice(0, 4).join('\n')).setColor(s.infoColor);
    this.confirmBtn.setVisible(!!s.confirm);
    if (s.confirm) this.confirmBtn.setText(s.confirm);
    this.cancelBtn.setVisible(s.showCancel);
  }

  banner(text: string, color = '#ffffff', ms = 1100) {
    this.bannerTimer?.remove();
    this.bannerBg.setVisible(true).setAlpha(0);
    this.bannerText.setText(text).setColor(color).setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: [this.bannerBg, this.bannerText], alpha: 1, duration: 150 });
    if (ms > 0) {
      this.bannerTimer = this.scene.time.delayedCall(ms, () => {
        this.scene.tweens.add({
          targets: [this.bannerBg, this.bannerText], alpha: 0, duration: 250,
          onComplete: () => { this.bannerBg.setVisible(false); this.bannerText.setVisible(false); },
        });
      });
    }
  }

  toast(text: string) {
    this.toastText.setText(text).setVisible(true).setAlpha(1);
    this.scene.tweens.killTweensOf(this.toastText);
    this.scene.tweens.add({ targets: this.toastText, alpha: 0, delay: 1400, duration: 400 });
  }
}
