import Phaser from 'phaser';
import { CHARACTERS } from '../data/characters';
import { ENEMIES } from '../data/enemies';
import { NPCS } from '../data/npcs';
import { makeCharacter, makeImage } from './pixel';

// Venue tiles live in venues.ts; this file builds characters and small icons.

// ---------------------------------------------------------------- icons

const ICONS: Record<string, { rows: string[]; pal: Record<string, number> }> = {
  'shield-half': {
    rows: ['.ccccc.', 'c.....c', 'c.....c', 'c.....c', '.c...c.', '.c...c.', '..c.c..', '...c...'],
    pal: { c: 0x4fe3ff },
  },
  'shield-full': {
    rows: ['.ccccc.', 'cfffffc', 'cfffffc', 'cfffffc', '.cfffc.', '.cfffc.', '..cfc..', '...c...'],
    pal: { c: 0xffffff, f: 0x4fe3ff },
  },
  warn: {
    rows: ['.rrr.', '.rrr.', '.rrr.', '.rrr.', '.....', '.rrr.'],
    pal: { r: 0xff4f4f },
  },
  note: {
    rows: ['..ww.', '..w.w', '..w..', '..w..', 'www..', 'www..', '.w...'],
    pal: { w: 0xffffff },
  },
  bullet: { rows: ['yyyw'], pal: { y: 0xffd34f, w: 0xffffff } },
  rocket: {
    rows: ['.gg...', 'gwwwwr', 'gwwwwy', '.gg...'],
    pal: { g: 0x5a6a3a, w: 0xc8ccd8, r: 0xff4f1a, y: 0xffd34f },
  },
  grenade: {
    rows: ['.cc.', '.gG.', 'gGGg', 'gGgg', '.gg.'],
    pal: { c: 0xc8ccd8, g: 0x5a6a3a, G: 0x3a4a22 },
  },
  leaf: { rows: ['.oo', 'ooo', 'o..'], pal: { o: 0xff9a2e } },
  axe: {
    rows: ['..ggg', '.gggg', 'gggwg', '..wgg', '..w..', '..w..', '..w..', '..w..'],
    pal: { g: 0xbfefff, w: 0x8a5a34 },
  },
  flash: {
    rows: ['..y..', '.yWy.', 'yWWWy', '.yWy.', '..y..'],
    pal: { y: 0xffd34f, W: 0xffffff },
  },
  px: { rows: ['w'], pal: { w: 0xffffff } },
  coin: {
    rows: ['.yyy.', 'yYyyy', 'yYyyy', 'yyyyo', '.ooo.'],
    pal: { y: 0xffd34f, Y: 0xffffff, o: 0xc9a44a },
  },
};

export function buildTextures(scene: Phaser.Scene) {
  for (const c of CHARACTERS) makeCharacter(scene, c.id, c.art, c.palette);
  for (const e of Object.values(ENEMIES)) makeCharacter(scene, `enemy-${e.id}`, e.art, e.palette);
  for (const n of Object.values(NPCS)) makeCharacter(scene, `npc-${n.id}`, n.art, n.palette);

  for (const [k, v] of Object.entries(ICONS)) makeImage(scene, k, v.rows, v.pal, k.startsWith('shield') || k === 'note' || k === 'warn' || k === 'axe' || k === 'grenade' || k === 'rocket');
}
