import Phaser from 'phaser';
import { COLORS, css } from '../config';
import { sfx } from '../audio/Synth';
import { txt } from './text';

export interface ButtonOpts {
  size?: number;
  fill?: number;
  border?: number;
  textColor?: string;
}

export class Button extends Phaser.GameObjects.Container {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  enabled = true;
  active2 = false; // "pressed in" look for toggles / current mode
  private fill: number;
  private border: number;

  constructor(scene: Phaser.Scene, x: number, y: number, public w: number, public h: number, text: string, onClick: () => void, opts: ButtonOpts = {}) {
    super(scene, Math.round(x), Math.round(y));
    this.fill = opts.fill ?? COLORS.panelHi;
    this.border = opts.border ?? COLORS.border;
    this.bg = scene.add.rectangle(0, 0, w, h, this.fill).setOrigin(0).setStrokeStyle(2, this.border);
    this.label = txt(scene, Math.round(w / 2), Math.round(h / 2) + 1, text, opts.size ?? 8, opts.textColor ?? '#ffffff').setOrigin(0.5);
    this.add([this.bg, this.label]);
    this.setText(text);
    scene.add.existing(this);
    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on('pointerover', () => { if (this.enabled) this.bg.setStrokeStyle(2, COLORS.cyan); });
    this.bg.on('pointerout', () => this.paint());
    this.bg.on('pointerdown', () => {
      if (!this.enabled) return;
      sfx.click();
      onClick();
    });
  }

  /** Shrinks long labels (e.g. "EVERYTHING MUST GO (3)") to fit the button. */
  setText(s: string) {
    this.label.setText(s).setScale(1);
    const room = this.w - 8;
    if (this.label.width > room) this.label.setScale(room / this.label.width);
    return this;
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    this.paint();
    return this;
  }

  setActive2(on: boolean) {
    this.active2 = on;
    this.paint();
    return this;
  }

  private paint() {
    this.setAlpha(this.enabled ? 1 : 0.35);
    this.bg.setFillStyle(this.active2 ? COLORS.pink : this.fill);
    this.bg.setStrokeStyle(2, this.active2 ? COLORS.gold : this.border);
    this.label.setColor(this.active2 ? css(COLORS.bg) : '#ffffff');
  }
}
