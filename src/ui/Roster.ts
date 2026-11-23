import Phaser from 'phaser';
import { COLORS, css } from '../config';
import type { CharacterDef } from '../data/characters';
import { txt } from './text';
import { loadSave } from '../save';
import { MAX_LEVEL, boostedStats, xpToNext } from '../data/progress';
import { upgradedWeapon } from '../data/upgrades';

/** A song on the roster: a playable character, or an album track still to come. */
export type RosterItem = { c: CharacterDef; soon?: undefined } | { c?: undefined; soon: string };

export interface RosterCard {
  item: RosterItem;
  frame: Phaser.GameObjects.Rectangle;
  sprite: Phaser.GameObjects.Sprite;
  status: Phaser.GameObjects.Text;
}

export const GRID_X = 10;
export const GRID_Y = 48;
export const CARD_W = 60;
export const CARD_H = 82;
export const CARD_GAP = 4;
export const COLS = 6;
export const PANEL_X = 398;
export const PANEL_W = 234;
export const PANEL_H = 3 * CARD_H + 2 * CARD_GAP;

/** 6-wide grid of small song cards (fits 18). */
export function rosterGrid(scene: Phaser.Scene, items: RosterItem[], dim: (it: RosterItem) => boolean,
  onPick: (card: RosterCard) => void, onHover?: (card: RosterCard) => void): RosterCard[] {
  return items.map((item, i) => {
    const x = GRID_X + (i % COLS) * (CARD_W + CARD_GAP);
    const y = GRID_Y + Math.floor(i / COLS) * (CARD_H + CARD_GAP);
    const cx = x + CARD_W / 2;
    const frame = scene.add.rectangle(x, y, CARD_W, CARD_H, COLORS.panel, 0.95).setOrigin(0).setStrokeStyle(2, COLORS.border);
    const tex = item.c ? item.c.id : 'ice';
    const sprite = scene.add.sprite(cx, y + 46, tex, 'f0').setOrigin(0.5, 1).setScale(2);
    if (item.c) sprite.play({ key: `${item.c.id}-idle`, startFrame: i % 2 });
    if (!item.c) {
      sprite.setTintFill(0x241a36);
      txt(scene, cx, y + 26, '?', 8, css(COLORS.gray)).setOrigin(0.5);
    } else if (dim(item)) sprite.setTint(0x6a5f80);
    const label = item.c ? item.c.short : item.soon.toUpperCase();
    const name = txt(scene, cx, y + 50, label, 8, item.c && !dim(item) ? '#ffffff' : css(COLORS.gray))
      .setOrigin(0.5, 0).setAlign('center').setLineSpacing(2).setWordWrapWidth((CARD_W - 4) / 0.75, false);
    name.setScale(Math.min(0.75, (CARD_W - 4) / name.width)); // long single words shrink instead of splitting
    const status = txt(scene, cx, y + CARD_H - 4, '', 8, css(COLORS.gold)).setOrigin(0.5, 1).setScale(0.75);
    const card: RosterCard = { item, frame, sprite, status };
    frame.setInteractive({ useHandCursor: true })
      .on('pointerdown', () => onPick(card))
      .on('pointerover', () => onHover?.(card));
    return card;
  });
}

/** Right-hand panel with the full stats for one song. */
export class DetailPanel {
  private parts: Phaser.GameObjects.GameObject[] = [];

  constructor(private scene: Phaser.Scene, private y = GRID_Y) {
    scene.add.rectangle(PANEL_X, y, PANEL_W, PANEL_H, COLORS.panel, 0.95).setOrigin(0).setStrokeStyle(2, COLORS.border);
  }

  show(item: RosterItem, footer = '', footerColor = css(COLORS.gold)) {
    for (const p of this.parts) p.destroy();
    this.parts = [];
    const s = this.scene;
    const x = PANEL_X + 8;
    const y = this.y + 8;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => { this.parts.push(o); return o; };
    const wrapW = PANEL_W - 16;

    if (!item.c) {
      add(s.add.sprite(x + 24, y + 64, 'ice', 'f0').setOrigin(0.5, 1).setScale(3).setTintFill(0x241a36));
      add(txt(s, x + 58, y + 6, item.soon.toUpperCase(), 8).setWordWrapWidth(PANEL_W - 70, true).setLineSpacing(3));
      add(txt(s, x + 58, y + 34, 'COMING SOON', 8, css(COLORS.gray)));
      add(txt(s, x, y + 84, 'THIS SONG JOINS THE BAND IN A FUTURE UPDATE.', 8, css(COLORS.gray))
        .setWordWrapWidth(wrapW, true).setLineSpacing(4));
      return;
    }

    const c = item.c;
    const spr = add(s.add.sprite(x + 24, y + 64, c.id, 'f0').setOrigin(0.5, 1).setScale(3));
    spr.play(`${c.id}-idle`);
    add(txt(s, x + 58, y + 6, c.name.toUpperCase(), 8).setWordWrapWidth(PANEL_W - 70, true).setLineSpacing(3));
    add(txt(s, x + 58, y + 40, c.archetype, 8, css(COLORS.cyan)));
    const save = loadSave();
    const prog = save.progress[c.id];
    const st = boostedStats(c, prog);
    const lvl = prog?.level ?? 1;
    add(txt(s, x + 58, y + 52, `LV ${lvl}`, 8, css(COLORS.pink)));
    if (lvl < MAX_LEVEL) {
      const bx = x + 96, bw = PANEL_W - 112;
      add(s.add.rectangle(bx, y + 54, bw, 4, 0x0b0710).setOrigin(0));
      add(s.add.rectangle(bx, y + 54, Math.round(bw * (prog?.xp ?? 0) / xpToNext(lvl)), 4, COLORS.cyan).setOrigin(0));
    }
    let ty = y + 74;
    add(txt(s, x, ty, `HP ${st.hp}  AIM ${st.aim}  MOVE ${c.move}`, 8, prog && (prog.hp || prog.aim) ? css(COLORS.green) : '#c8c0d8')); ty += 16;
    add(txt(s, x, ty, c.weapon.name, 8)); ty += 12;
    const w = upgradedWeapon(st.weapon, save);
    add(txt(s, x, ty, `DMG ${w.dmg[0]}-${w.dmg[1]}${w.shots > 1 ? ' x' + w.shots : ''}  RANGE ${w.range}`, 8, '#c8c0d8')); ty += 12;
    if (w.close) {
      add(txt(s, x, ty, `${w.close.aim > 0 ? '+' : ''}${w.close.aim} AIM UP CLOSE`, 8, w.close.aim > 0 ? css(COLORS.green) : css(COLORS.red)).setScale(0.75));
      ty += 10;
    }
    ty += 6;
    const sp = add(txt(s, x, ty, `${c.special.name}`, 8, css(COLORS.gold)).setWordWrapWidth(wrapW, true));
    ty += sp.height + 4;
    add(txt(s, x, ty, `${c.special.desc.toUpperCase()}${c.special.cooldown ? ` COOLDOWN ${c.special.cooldown}.` : ""}`, 8, css(COLORS.gray))
      .setWordWrapWidth(wrapW, true).setLineSpacing(4));
    if (footer) add(txt(s, PANEL_X + PANEL_W / 2, this.y + PANEL_H - 50, footer, 8, footerColor).setOrigin(0.5, 0));
  }
}
