import Phaser from 'phaser';
import { FONT, RES } from '../config';

export function txt(scene: Phaser.Scene, x: number, y: number, s: string, size = 8, color = '#ffffff') {
  return scene.add.text(Math.round(x), Math.round(y), s, {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
    resolution: RES, // drawn at canvas resolution, so scaled-down text stays readable
  });
}
