import type { Palette } from '../art/pixel';
import { gun, type GunKind } from './weapons';

export type SpecialKind =
  | 'grenade' | 'rocket' | 'taunt' | 'fanfire' | 'aimedShot' | 'stealth'
  | 'charge' | 'mark' | 'flame' | 'chain' | 'overwatch' | 'heal' | 'blink' | 'rally' | 'axe' | 'decoy' | 'serial' | 'deploy' | 'grapple';
export type IdleFx = 'frost' | 'sigh' | 'leaf' | 'ember' | 'spark' | 'glint' | 'smoke' | null;

export interface Weapon {
  name: string;
  dmg: [number, number];
  range: number;
  shots: number; // shots per attack (dual pistols fire 2)
  crit: number;
  sniper?: boolean; // gold tracer; long range
  kind?: GunKind; // which standard gun this is (band only)
  close?: { within: number; aim: number }; // aim change at close range
  falloff?: { from: number; per: number }; // aim lost per tile past `from`
  sfx: 'rifle' | 'pistol' | 'sniper' | 'note' | 'shotgun' | 'zap';
  tint?: number; // projectile colour
}

export interface Special {
  kind: SpecialKind;
  name: string;
  desc: string;
  cooldown: number; // player turns
  freeAction?: boolean; // costs 1 AP instead of ending the turn
}

export interface CharacterDef {
  id: string;
  name: string; // full song title
  short: string; // fits in the HUD
  archetype: string;
  hp: number;
  aim: number;
  move: number;
  weapon: Weapon;
  special: Special;
  price: number;
  startsUnlocked: boolean;
  music: string; // file name in public/assets/music/
  /** Where to hear the real song (Spotify track, or its album when the track link isn't known). */
  listen?: string;
  idleFx: IdleFx;
  /** Said every time this song knocks out a cover (instead of the band's random comebacks). */
  killLines?: string[];
  /** Said right after this song uses its special. */
  specialLines?: string[];
  /** How often the special line plays (0-1, default always). */
  specialLineChance?: number;
  /** Sometimes said after one of this song's shots lands (not on knockouts). */
  hitLines?: string[];
  /** How often the hit line plays (0-1). */
  hitLineChance?: number;
  /** Said after each knockout while a chain ability (Bleed You Dry) is on. */
  chainLines?: string[];
  /** Said after this song dashes (a double move that uses both actions). */
  dashLines?: string[];
  /** Can't be checked in by Hotel California. */
  mindControlImmune?: boolean;
  palette: Palette;
  art: string[]; // 16 wide x 14 tall head+torso; legs are added automatically
}

// Shared palette keys: s skin, e eyes, o shadow, m mouth, p pants, k boots,
// g gun, G gun dark.

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'ice',
    name: 'Ice',
    short: 'ICE',
    archetype: 'ASSAULT',
    hp: 7, aim: 70, move: 5,
    weapon: gun('assault'),
    special: {
      kind: 'grenade',
      name: 'FRAG OUT',
      desc: 'Lobs a grenade up to 6 tiles, over cover: 3x3 blast, 3 damage, blows up cover.',
      cooldown: 3,
    },
    price: 0, startsUnlocked: true, music: 'ice.mp3', idleFx: null,
    listen: 'https://open.spotify.com/track/54HW8tCuL5iq0MSd9NcaSX',
    // Army infantry soldier: desert-camo combat helmet with goggles strapped on, chin strap,
    // dog tags, khaki vest with pouches over tan camo fatigues, brown combat boots.
    palette: {
      H: 0xb89a68, c: 0x7a5a36, B: 0x3a2a18, Q: 0x6ab0c8, s: 0xc48a62, e: 0x1a1020, m: 0x6a2a2a,
      J: 0x3a2a18, C: 0xc8b088, T: 0xd8dce4, V: 0x8a7a52, P: 0x6a5a3a,
      g: 0x4a4e58, G: 0x23252b, p: 0xb8a078, k: 0x5a4028,
    },
    art: [
      '................',
      '.....HHHHHH.....',
      '....HHcHHHcH....',
      '...HBBQBBBQBBH..',
      '....sssssssss...',
      '....ssessesss...',
      '....sssssssss...',
      '....JssmmsssJ...',
      '....CCCTCCCCC...',
      '...CVVVVVVVVVC..',
      '...cVPVVVVVPVggg',
      '...sVPVVVVVPsGGG',
      '...CVVVVVVVVCG..',
      '....CcCCcCCcC...',
    ],
  },
  {
    id: 'dotted-line',
    name: 'Dotted Line',
    short: 'DOTTED LINE',
    archetype: 'GUNSLINGER',
    hp: 6, aim: 65, move: 6,
    weapon: gun('dualpistols'),
    special: {
      kind: 'fanfire',
      name: 'SIGN HERE',
      desc: '6 rapid-fire shots split across every enemy in range.',
      cooldown: 3,
    },
    price: 0, startsUnlocked: true, music: 'dotted-line.mp3', idleFx: null,
    listen: 'https://open.spotify.com/album/037NQyJRcHNCdKs6jjImnf',
    killLines: ['CAME HERE TO DO WHAT I DO THE BEST.'],
    palette: {
      H: 0x1b1622, h: 0x4a3e5c, s: 0xd9a27a, e: 0x1a1020, m: 0x8a3b3b,
      S: 0x2e2b3a, d: 0xd8d8e8, w: 0xf2f2f2, r: 0xd8344a,
      g: 0xb8bcc8, G: 0x5a5f70, p: 0x2e2b3a, k: 0x0f0d14,
    },
    art: [
      '................',
      '.....HHHHHHH....',
      '....HHHhhHHHH...',
      '....HHssssssH...',
      '....Hssssesse...',
      '....ssssssss....',
      '.....sssmmss....',
      '....SSSwrwSSS...',
      '...SdSSwrwSSdS..',
      '...SSdSwrwSdSS..',
      '..gsSSdSwSSdSsgg',
      '..GGSdSSSSSdSGG.',
      '....SSdSSSdSS...',
      '....SSSSSSSSS...',
    ],
  },
  {
    id: 'sweet-november',
    name: 'Sweet, Sweet November',
    short: 'SWEET NOVEMBER',
    archetype: 'SNIPER',
    hp: 5, aim: 80, move: 4,
    weapon: gun('precision'),
    special: {
      kind: 'aimedShot',
      name: 'LAST LEAF FALLS',
      desc: '+30 aim, ignores half cover. Always crits on a flank.',
      cooldown: 3,
    },
    price: 0, startsUnlocked: true, music: 'sweet-november.mp3', idleFx: 'leaf',
    listen: 'https://open.spotify.com/album/037NQyJRcHNCdKs6jjImnf',
    palette: {
      R: 0xc8202e, r: 0x8a1420, h: 0x8a3a1f, s: 0xf3c9a6, e: 0x1a1020, m: 0xa04a4a,
      O: 0xff9a2e, C: 0x6b4a32, c: 0x4a3222, g: 0x7a7f8f, G: 0x3d404c, p: 0x4a3222, k: 0x1e1612,
    },
    art: [
      '.......r........',
      '....RRRRRRRR....',
      '...RRRrRRRRRRR..',
      '....hsssssssh...',
      '....hssssesse...',
      '....hhsssssss...',
      '.....hssmsss....',
      '....OOOOOOOOO...',
      '...CCOOOCCCCC...',
      '...CCCOOCCCsgggg',
      '...CCCCOCCCCG.G.',
      '...CCCCCCCCC....',
      '...CcCCCCCcC....',
      '...CCCCCCCCC....',
    ],
  },
  {
    id: 'never-heard',
    name: 'ESYNH',
    short: 'ESYNH',
    archetype: 'EMO INFILTRATOR',
    hp: 6, aim: 70, move: 6,
    weapon: gun('shotgun'),
    special: {
      kind: 'stealth',
      name: "NOBODY'S LISTENING",
      desc: 'Costs 1 action: vanish, then move in. Untargetable until after his next turn. Ambush shot always crits, +2 dmg.',
      cooldown: 3,
      freeAction: true,
    },
    price: 150, startsUnlocked: false, music: 'every-song-youve-never-heard.mp3', idleFx: 'sigh',
    listen: 'https://open.spotify.com/album/037NQyJRcHNCdKs6jjImnf',
    killLines: ['YOUR LIFE GOES DOWN THE DRAIN.'],
    palette: {
      K: 0x141018, s: 0xf4e6ee, e: 0x5a1050, D: 0x24202c, d: 0x3e3850,
      P: 0xd8344a, Y: 0xe8d34f, g: 0x8a8f9f, G: 0x3d404c, p: 0x1a1820, k: 0x0c0a10,
    },
    art: [
      '................',
      '.....KKKKKK.....',
      '....KKKKKKKK....',
      '...KKKKKKKKKK...',
      '...KKKKKKKKse...',
      '....KKKKKsssK...',
      '....KK.Kssss....',
      '....DDDDDDDDD...',
      '...DDdDDDDDdDD..',
      '...DDdDDDDDdDggg',
      '...DPDDDDDDdsGGG',
      '...DDDDDYDDdDG..',
      '....DDDDDDDDD...',
      '....DdDDDDDdD...',
    ],
  },

  // ------------------------------------------------ 1st album: Mindfully Blind
  {
    id: 'wreck',
    name: 'Wreck',
    short: 'WRECK',
    archetype: 'HEAVY',
    hp: 9, aim: 60, move: 4,
    weapon: gun('lmg'),
    special: {
      kind: 'rocket',
      name: 'ROCKET LAUNCHER',
      desc: 'Needs a clear shot, range 9: 3x3 blast, 4 damage, blows up cover.',
      cooldown: 3,
    },
    price: 250, startsUnlocked: false, music: 'wreck.mp3', idleFx: null,
    listen: 'https://open.spotify.com/track/19lgpNuwAltmWAqdF76fh3',
    specialLines: ['THAT IS BEAUTIFUL TO ME.'],
    palette: {
      Y: 0xffc83a, y: 0xc98a1a, s: 0xc98a64, e: 0x1a1020, m: 0x7a3a2a, b: 0x4a2e1c,
      V: 0xff7a2a, v: 0xe8e8e8, T: 0x3a3f4a, g: 0x8a6a4a, G: 0x3d404c, p: 0x3a4a6a, k: 0x3a2416,
    },
    art: [
      '................',
      '.....YYYYYY.....',
      '....YYyYYYYY....',
      '...YYYYYYYYYYY..',
      '....sssssssss...',
      '....ssessssse...',
      '....bsssssssb...',
      '....bbbmmmbb....',
      '..VVVVVVVVVVVV..',
      '..VvVVTTTTVVvV..',
      '..VvVVTTTTVVvGGG',
      '..sVVVTTTTVVsggg',
      '..VvVVTTTTVVvV..',
      '...VVVVVVVVVV...',
    ],
  },
  {
    id: 'vision',
    name: 'Vision',
    short: 'VISION',
    archetype: 'SPOTTER',
    hp: 6, aim: 75, move: 6,
    weapon: gun('carbine'),
    special: {
      kind: 'mark',
      name: 'SECOND SIGHT',
      desc: 'Marks every enemy he can see: squad gets +20 aim on them. Uses 1 action.',
      cooldown: 3,
      freeAction: true,
    },
    price: 150, startsUnlocked: false, music: 'vision.mp3', idleFx: null,
    listen: 'https://open.spotify.com/track/1fM9E1tqlZeoG0FJsQt4of',
    palette: {
      H: 0x6a3a1a, s: 0xe8b890, V: 0x2a2a3a, c: 0x4fe3ff, m: 0x9a4a4a,
      J: 0x3f6b3a, j: 0x2a4a28, g: 0x9aa3b5, G: 0x4a5060, p: 0x3a3a2a, k: 0x1a1612,
    },
    art: [
      '................',
      '.....HHHHHH.....',
      '....HHHHHHHHH...',
      '....HHssssssH...',
      '....VVVVVVVVV...',
      '....VcVVVVcVV...',
      '....ssssssss....',
      '.....sssmss.....',
      '....JJJJJJJJJ...',
      '...JJjJJJJJjJ...',
      '...JJjJJJJJjgggg',
      '...sJjJJJJJjsG..',
      '...JJjJJJJJjJ...',
      '....JJJJJJJJJ...',
    ],
  },
  {
    id: 'fire-sale',
    name: 'Fire Sale',
    short: 'FIRE SALE',
    archetype: 'FIRESTARTER',
    hp: 7, aim: 65, move: 5,
    weapon: gun('smg', { tint: 0xff9a2e }),
    special: {
      kind: 'flame',
      name: "WHAT'S NOT FREE",
      desc: 'Flame cone: 2 damage, sets targets burning and torches cover. Watch your friends.',
      cooldown: 3,
    },
    price: 200, startsUnlocked: false, music: 'fire-sale.mp3', idleFx: 'ember',
    listen: 'https://open.spotify.com/track/03XSfqsjmuHxxN6jgXdtqE',
    palette: {
      F: 0xa8381e, f: 0xd8602a, s: 0xe8b08a, e: 0x1a1020, m: 0xa04a4a,
      R: 0xd8344a, r: 0x8a1a2a, w: 0xf2f2f2, t: 0x1a1020, Y: 0xffd34f,
      g: 0xc8ccd8, G: 0xff9a2e, p: 0x2e2b3a, k: 0x0f0d14,
    },
    art: [
      '................',
      '.....FFFFfF.....',
      '....FFFFFFFFF...',
      '....FFssssssF...',
      '....Fssssesse...',
      '.....ssssssss...',
      '.....sssmmss....',
      '....RRRwtwRRR...',
      '...RRrRwtwRrRR..',
      '...RRrRRtRRrRR..',
      '...RRrRRRRRrRggg',
      '...sRYRRRRRrsGG.',
      '...RRrRRRRRrR...',
      '....RRRRRRRRR...',
    ],
  },
  {
    id: 'electric-ones',
    name: 'Electric Ones',
    short: 'ELECTRIC ONES',
    archetype: 'STORMCALLER',
    hp: 6, aim: 70, move: 5,
    weapon: { ...gun('pistol', { tint: 0x4fe3ff }), sfx: 'zap' },
    special: {
      kind: 'chain',
      name: 'LIGHTNING BOLT TO THE SOUL',
      desc: 'Lightning never misses: 3 damage, then jumps to 2 more enemies nearby for 2.',
      cooldown: 3,
    },
    price: 250, startsUnlocked: false, music: 'electric-ones.mp3', idleFx: 'spark',
    listen: 'https://open.spotify.com/album/28gjbH2mmcgsTyNLAm7ar2',
    palette: {
      Z: 0xe8d27a, z: 0xfff4c0, s: 0xd9a27a, C: 0x4fe3ff, m: 0x7a2a4a,
      U: 0x5a2a9a, c: 0xb8bcc8, p: 0x2a1a4a, k: 0x0f0d14,
    },
    art: [
      '................',
      '.....ZZZZz......',
      '....ZZZZZZZZz...',
      '....ZZZZZZZZ....',
      '....ssssssss....',
      '....sCsssCss....',
      '....ssssssss....',
      '.....ssmmss.....',
      '....UUUUUUUUU...',
      '...UUZUUUUUUU...',
      '...UUUZZUUUUcccc',
      '...sUUUZUUUUsCC.',
      '...UUUZUUUUUU...',
      '....UUUUUUUUU...',
    ],
  },
  {
    id: 'no-running',
    name: 'No Running',
    short: 'NO RUNNING',
    archetype: 'SENTRY',
    hp: 8, aim: 70, move: 5,
    weapon: gun('assault'),
    special: {
      kind: 'overwatch',
      name: 'THEY WAIT FOR ME',
      desc: 'Overwatch: shoots the first enemy that moves where he can see it. No cooldown.',
      cooldown: 0,
    },
    price: 200, startsUnlocked: false, music: 'no-running.mp3', idleFx: null,
    listen: 'https://open.spotify.com/track/3kFkTad9WUvw3ZRLSB0t9E',
    specialLines: ['WE NEED EACH OTHER NOW.'],
    specialLineChance: 0.5,
    // Night watchman: charcoal beanie, stubble, dark green jacket with the hood bunched at the
    // collar, binoculars on a strap across the chest, dark pants, brown boots.
    palette: {
      B: 0x3a3a42, b: 0x24242a, h: 0x5a3a24, s: 0xd9a27a, e: 0x1a1020, t: 0x8a6448, m: 0x7a3a3a,
      J: 0x2f4a2a, j: 0x456a3c, K: 0x15151a, O: 0x1e1e24, o: 0x7aa8c8,
      g: 0x4a4e58, G: 0x23252b, p: 0x2a2a30, k: 0x4a3220,
    },
    art: [
      '................',
      '.....BBBBBBB....',
      '....BBbBbBbBB...',
      '....BBBBBBBBB...',
      '....hsssssssh...',
      '....hssssesse...',
      '....htsssssst...',
      '.....ttsmstt....',
      '...JjjjjjjjjJ...',
      '...JJJKJJJKJJ...',
      '...JJJOOOOJJJggg',
      '...sJJOoOoJJsGGG',
      '...JJJJJJJJJJG..',
      '....JJJJJJJJJ...',
    ],
  },
  {
    id: 'mindfully-blind',
    name: 'Mindfully Blind',
    short: 'MINDFULLY BLIND',
    archetype: 'MEDIC',
    hp: 6, aim: 75, move: 5,
    weapon: { ...gun('smg', { tint: 0x4fe3ff }), sfx: 'note' }, // sound-wave shots
    special: {
      kind: 'heal',
      name: 'YOU CAN BREATHE',
      desc: 'Fully heals himself and every bandmate within 4 tiles, puts out fire, and frees anyone checked in by Hotel California.',
      cooldown: 3,
    },
    price: 400, startsUnlocked: false, music: 'mindfully-blind.mp3', idleFx: null,
    listen: 'https://open.spotify.com/track/1VqZrhzltXZaAfllYR1OiK',
    mindControlImmune: true, // blindfolded: Hotel California can't check him in
    palette: {
      L: 0xd8d8e8, s: 0xe8c0a0, B: 0x1a1020, P: 0xff4fa3, m: 0x9a4a5a,
      T: 0x1f8a8a, t: 0x0f5a5a, g: 0xffd34f, G: 0xc9a44a, p: 0x0f4a4a, k: 0x1a1020,
    },
    art: [
      '................',
      '.....LLLLLL.....',
      '....LLLLLLLL....',
      '...LLLssssssL...',
      '...LBBBBBBBBBP..',
      '...LssssssssPP..',
      '...LLssssss.....',
      '....L.ssmss.....',
      '....TTTTTTTTT...',
      '...TTtTTTTTtT...',
      '...TTtTTTTTtTggg',
      '...sTtTTTTTtsGG.',
      '...TTtTTTTTtT...',
      '....TTTTTTTTT...',
    ],
  },
  {
    id: 'glass-slipper',
    name: 'Glass Slipper',
    short: 'GLASS SLIPPER',
    archetype: 'BRAWLER',
    hp: 8, aim: 65, move: 4,
    weapon: gun('sawedoff'),
    special: {
      kind: 'axe',
      name: 'SHATTER',
      desc: 'Runs up to an enemy within 4 tiles and swings his axe: 6 damage, never misses. A knockout gives him an action back.',
      cooldown: 3,
    },
    price: 300, startsUnlocked: false, music: 'glass-slipper.mp3', idleFx: 'glint',
    listen: 'https://open.spotify.com/album/28gjbH2mmcgsTyNLAm7ar2',
    dashLines: ['BETTER WATCH MY SPEED.'],
    palette: {
      s: 0xe0a47a, S: 0xfff0e0, e: 0x1a1020, m: 0x8a3a3a, b: 0x5a3418,
      F: 0x3a6ab0, f: 0x1e3a6a, g: 0x6a4a2a, G: 0x3d404c, p: 0x2c3e6b, k: 0xbfefff,
    },
    art: [
      '................',
      '................',
      '................',
      '.....ssssss.....',
      '....sSSsssss....',
      '....ssessess....',
      '...ssssssssss...',
      '....bbbmmbbb....',
      '..FFbbbbbbbbFF..',
      '.FFfFFbbbbFFfFF.',
      '.FFfFFFFFFFfFGGG',
      '.sFfFFFFFFFfsggg',
      '.FFfFFFFFFFfFF..',
      '..FFFFFFFFFFFF..',
    ],
  },
  {
    id: 'crown',
    name: 'Crown',
    short: 'CROWN',
    archetype: 'COMMANDER',
    hp: 7, aim: 70, move: 5,
    weapon: gun('pistol', { tint: 0xffd34f }),
    special: {
      kind: 'rally',
      name: 'ROYALTY',
      desc: 'Every other band member gets 1 extra action this turn.',
      cooldown: 4,
    },
    price: 350, startsUnlocked: false, music: 'crown.mp3', idleFx: 'smoke',
    listen: 'https://open.spotify.com/album/28gjbH2mmcgsTyNLAm7ar2',
    // Officer: peaked cap with a gold badge, black visor, mustache, cigar, navy dress uniform
    // with gold epaulettes, red medals and gold buttons, gold sidearm.
    palette: {
      C: 0x1e2a4a, Y: 0xffd34f, c: 0x111118, h: 0x2a1a10, s: 0xd9a27a, e: 0x1a1020,
      M: 0x3a2416, x: 0x8a5a34, o: 0xff7a2a, U: 0x2a3a5a, R: 0xd8344a,
      g: 0xc9a44a, G: 0x8a6a2a, p: 0x1e2a4a, k: 0x111118,
    },
    art: [
      '................',
      '.....CCCCCCC....',
      '....CCCYYCCCC...',
      '...ccccccccccc..',
      '....hsssssssh...',
      '....hssssesse...',
      '....hssssssss...',
      '.....sMMMMxxxo..',
      '..YUUUUUUUUUY...',
      '...UURRUYUUUU...',
      '...UUUUUYUUUUggg',
      '...sUUUUYUUUsGGG',
      '...UUUUUYUUUUG..',
      '....UUUUUUUUU...',
    ],
  },
  {
    id: 'toast',
    name: 'Toast',
    short: 'TOAST',
    archetype: 'TANK',
    hp: 10, aim: 62, move: 4,
    weapon: gun('lmg'),
    special: {
      kind: 'taunt',
      name: 'TRADING PUNCHES',
      desc: 'Every enemy within 10 tiles has to target him until your next turn. He takes 1 less damage per hit and fires back at anyone who shoots him.',
      cooldown: 3,
    },
    price: 250, startsUnlocked: false, music: 'toast.mp3', idleFx: null,
    listen: 'https://open.spotify.com/track/3HgvgQgolSjOKbZrlSoUep',
    killLines: ['PENNILESS FOOL.', "I WON'T SAY I'M SORRY."],
    // Beefy tactical operator who kept the mullet: headset, beard, heavy gray shoulder armor,
    // coyote-tan plate carrier with pouches and an orange patch, black gloves, dark tac pants.
    palette: {
      M: 0x6a3a1a, s: 0xe0a47a, e: 0x1a1020, H: 0x111118, b: 0x5a3418, m: 0x8a3a3a,
      A: 0x3a3d45, T: 0xb09a6a, P: 0x8a7650, a: 0x2a2d34, L: 0x111114, R: 0xff7a2a,
      g: 0x5a5f6a, G: 0x2a2d34, p: 0x45453d, k: 0x1a1a1a,
    },
    art: [
      '................',
      '....MMMMMMM.....',
      '...MMMMMMMMMH...',
      '...MMsssssssH...',
      '...MMssssesse...',
      '..MMMHssssss....',
      '..MM..bbmbbb....',
      '..AAATTTTTTAAA..',
      '..AATTPTTPTTAA..',
      '..AATTPTTPTTAA..',
      '..aTTTTTTTTTTggg',
      '..LTTRTTTTTTLGGG',
      '...TTTTTTTTTTG..',
      '...aaaaaaaaaa...',
    ],
  },
  {
    id: 'distraction',
    name: 'Distraction',
    short: 'DISTRACTION',
    archetype: 'TRICKSTER',
    hp: 6, aim: 66, move: 6,
    weapon: gun('smg'),
    special: {
      kind: 'decoy',
      name: 'SMOKE AND MIRRORS',
      desc: 'Throws a fake copy of himself onto a tile within 6. Every enemy within 10 tiles of it has to shoot the fake until your next turn, then it vanishes. Costs 1 action.',
      cooldown: 3,
      freeAction: true,
    },
    price: 300, startsUnlocked: false, music: 'distraction.mp3', idleFx: null,
    listen: 'https://open.spotify.com/track/4h3dx8UDbLfxr1HAEaVPH5',
    dashLines: ['LOOK, A BIRD!', 'WHAT WERE WE TALKING ABOUT?'],
    // Hype guy: big blue foam finger held high, spiky hair, black shades, huge grin,
    // neon green tracksuit with white stripes, white sneakers.
    palette: {
      F: 0x2a5ab0, f: 0x1a3a78, H: 0x3a2416, s: 0xe0a47a, O: 0x111118, w: 0xe8e8e0,
      m: 0xf0f0f0, N: 0x2f7d52, n: 0x1f5038,
      g: 0x5a5f6a, G: 0x2a2d34, p: 0x2f7d52, k: 0xe0e0d8,
    },
    art: [
      '.F..............',
      '.F....H.H.H.....',
      '.F...HHHHHHH....',
      'FFFF.HssssssH...',
      'FFFF.sOOOOOOs...',
      'FffF.ssssssss...',
      '.ss..ssmmmmss...',
      '.NN...ssssss....',
      '.NN.NNwNNwNNN...',
      '.NNNNNwNNwNNNN..',
      '...NNNwNNwNNNggg',
      '...NNNwNNwNNsGGG',
      '...NNNwNNwNNNG..',
      '...nnnnnnnnnn...',
    ],
  },
  {
    id: 'pen-and-paper',
    name: 'Pen & Paper',
    short: 'PEN & PAPER',
    archetype: 'MARKSMAN',
    hp: 6, aim: 74, move: 5,
    weapon: gun('precision'),
    special: {
      kind: 'serial',
      name: 'BLEED YOU DRY',
      desc: 'Free to switch on. For the rest of the turn, every knockout he lands gives him another shot, but each shot does 1 less damage.',
      cooldown: 4,
    },
    price: 350, startsUnlocked: false, music: 'pen-and-paper.mp3', idleFx: null,
    listen: 'https://open.spotify.com/track/410cDWK0EqXv2aYjjBVJA7',
    chainLines: ["LISTEN CLOSE AND I'LL TELL ANOTHER SECRET."],
    // Spec ops: ranger-green helmet with flipped-down quad night-vision goggles (green glow),
    // dark face gaiter, plate carrier with pouches and a blue pen in the chest pocket.
    palette: {
      H: 0x3a4030, V: 0x1a1a1a, L: 0x6dff7a, s: 0xe0a47a, B: 0x2a2a2a,
      U: 0x4a5a3a, C: 0x5a6a45, P: 0x3a4a2a, n: 0x2a6aff, u: 0x34402a,
      g: 0x3a3d45, G: 0x1a1a1a, p: 0x4a5a3a, k: 0x1a1a1a,
    },
    art: [
      '................',
      '.....HHHHHH.....',
      '....HHHHHHHH....',
      '...HHVVVVVVHH...',
      '....VLLVVLLV....',
      '....VLLVVLLV....',
      '....ssssssss....',
      '....BBBBBBBB....',
      '..UUCCCCCCCCUU..',
      '..UUCPPnCPPCUU..',
      '..UUCCCCCCCCUggg',
      '..sUCPPCCPPCsGGG',
      '...UCCCCCCCCUG..',
      '...uuuuuuuuuu...',
    ],
  },
  {
    id: 'indy-blvd',
    name: 'Indy Blvd',
    short: 'INDY BLVD',
    archetype: 'DEFENDER',
    hp: 8, aim: 64, move: 4,
    weapon: gun('lmg'),
    special: {
      kind: 'deploy',
      name: 'DEPLOYABLE COVER',
      desc: 'Throws a steel barrier onto an open tile within 4. It gives full cover for the rest of the mission, until a blast breaks it. Costs 1 action.',
      cooldown: 3,
      freeAction: true,
    },
    price: 300, startsUnlocked: false, music: 'indy-blvd.mp3', idleFx: null,
    listen: 'https://open.spotify.com/track/1Wu1y72hcBgZDZ8fXRRYu5',
    // Flak suit: olive bomb-squad helmet with a dark blast visor, high padded collar,
    // bulky quilted olive-tan suit with an orange patch, dark gloves.
    palette: {
      H: 0x5a6a45, V: 0x1a2a3a, v: 0x6ab0ff, F: 0x8a8a5a, f: 0x5a5a3a, R: 0xff7a2a,
      s: 0x3a3a30, g: 0x5a5f6a, G: 0x2a2d34, p: 0x6a6a45, k: 0x2a2a20,
    },
    art: [
      '................',
      '.....HHHHHH.....',
      '....HHHHHHHH....',
      '...HHVVVVVVHH...',
      '...HHVvVVVVHH...',
      '...HHVVVVVVHH...',
      '..FFFHHHHHHFFF..',
      '.FFFFFFFFFFFFFF.',
      '.FFfFFFFFFFfFFF.',
      '.FFfFFRRFFFfFFF.',
      '.FFfFFFFFFFfFggg',
      '.sFfFFFFFFFfsGGG',
      '..FFFFFFFFFFFG..',
      '..ffffffffffff..',
    ],
  },
  {
    id: 'been-here-before',
    name: 'Been Here Before',
    short: 'BEEN HERE',
    archetype: 'GRAPPLER',
    hp: 7, aim: 66, move: 5,
    weapon: gun('sawedoff'),
    special: {
      kind: 'grapple',
      name: 'GRAPPLE',
      desc: 'Fires a hook at an enemy he can see within 7, yanks himself in and hits them for 4, never misses. Free: he keeps both actions.',
      cooldown: 3,
    },
    price: 350, startsUnlocked: false, music: 'been-here-before.mp3', idleFx: null,
    listen: 'https://open.spotify.com/track/4SXbB3dcKuv0cTL1jDQkTq',
    specialLines: ['BEGGING FOR MORE?'],
    hitLines: ['PEDAL TO THE FLOOR.'],
    hitLineChance: 0.35,
    // Weathered veteran: red bandana, gray stubble, scar over one eye, beat-up brown leather
    // jacket over a dark tee, grapple launcher strapped to his left wrist.
    palette: {
      D: 0xd8344a, h: 0x8a8a8a, s: 0xd9a27a, e: 0x1a1020, x: 0xa04a3a, b: 0x7a7a7a, m: 0x6a2a2a,
      J: 0x5a3420, j: 0x2a1810, T: 0x3a3a3a, Q: 0x9aa2ac,
      g: 0x6a4a2a, G: 0x3d404c, p: 0x2c3e6b, k: 0x2a1810,
    },
    art: [
      '................',
      '................',
      '....DDDDDDDD....',
      '...DDDDDDDDDD...',
      '....hssssssh....',
      '....ssessesx....',
      '....ssssssss....',
      '.....bbmmbb.....',
      '..JJJJTTTTJJJJ..',
      '..JjJJTTTTJJjJ..',
      '..JjJJTTTTJJjggg',
      '.QQjJJTTTTJJsGGG',
      '..JjJJTTTTJJJG..',
      '..JJJJJJJJJJJJ..',
    ],
  },
];

/** The rest of the 2nd album, shown in the shop as "coming soon". */
export const COMING_SOON: string[] = [];

export const getCharacter = (id: string) => CHARACTERS.find((c) => c.id === id)!;
