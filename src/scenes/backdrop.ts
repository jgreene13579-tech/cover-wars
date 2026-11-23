import Phaser from 'phaser';
import { COLORS, GAME_H, GAME_W } from '../config';

/** Shared menu background: dark club, neon horizon grid, scanlines. */
export function backdrop(scene: Phaser.Scene) {
  scene.cameras.main.setBackgroundColor(COLORS.bg);
  const g = scene.add.graphics().setDepth(-10);
  for (let i = 0; i < 12; i++) {
    g.fillStyle(Phaser.Display.Color.GetColor(20 + i * 2, 10 + i, 34 + i * 3), 1);
    g.fillRect(0, i * 18, GAME_W, 18);
  }
  const horizon = 230;
  g.fillStyle(0x120a1c, 1).fillRect(0, horizon, GAME_W, GAME_H - horizon);
  g.lineStyle(1, COLORS.pink, 0.35);
  g.lineBetween(0, horizon, GAME_W, horizon);
  for (let i = 1; i < 8; i++) {
    const y = horizon + i * i * 2.2;
    g.lineStyle(1, COLORS.pink, 0.25 - i * 0.02).lineBetween(0, y, GAME_W, y);
  }
  for (let i = -10; i <= 10; i++) {
    g.lineStyle(1, COLORS.cyan, 0.15).lineBetween(GAME_W / 2 + i * 16, horizon, GAME_W / 2 + i * 70, GAME_H);
  }
  const s = scene.add.graphics().setDepth(1000);
  s.fillStyle(0x000000, 0.12);
  for (let y = 0; y < GAME_H; y += 3) s.fillRect(0, y, GAME_W, 1);
}
