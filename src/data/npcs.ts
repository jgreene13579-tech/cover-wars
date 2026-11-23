import type { Palette } from '../art/pixel';

/** Characters the band meets in pre-show scenes (not fighters). */
export interface NpcDef {
  id: string;
  name: string;
  palette: Palette;
  art: string[];
}

export const NPCS: Record<string, NpcDef> = {
  earl: {
    id: 'earl',
    name: 'EARL, EAGLES LODGE',
    palette: {
      s: 0xe8b890, W: 0xf2f2f2, G: 0x3a3a44, e: 0x1a1020, m: 0x8a3a3a,
      M: 0x7a1a2a, Y: 0xffd34f, p: 0x5a5a64, k: 0x2a1a10,
    },
    art: [
      '................',
      '................',
      '.....ssssss.....',
      '....WsssssssW...',
      '...WWsssssssWW..',
      '....GGGsGGGs....',
      '....GeGsGeGs....',
      '....sWWmmWWs....',
      '....MMMMMMMM....',
      '...MMYMMMMMMM...',
      '...MMMMMMMMMM...',
      '...sMMMMMMMMs...',
      '...MMMMMMMMMM...',
      '....MMMMMMMM....',
    ],
  },
};
