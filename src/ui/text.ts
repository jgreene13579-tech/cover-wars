import Phaser from 'phaser';
import { FONT } from '../config';

export function txt(scene: Phaser.Scene, x: number, y: number, s: string, size = 8, color = '#ffffff') {
  return scene.add.text(Math.round(x), Math.round(y), s, {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
  });
}
