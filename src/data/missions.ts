import type { TileType } from '../tactics/Grid';

// Map legend (each map is 20 x 9)
//  # wall   N wall with the venue's decoration   . floor   , second floor (carpet, patio, court paint...)
//  s stage  m ring mat
//  Half cover: T table  S stool  c crate  b bush  f fence  C couch  L bleachers  - | ring ropes
//              k keg  G grill  n bench  h giant mushroom  W folding table  H chair  J flag pole
//              q cooler  x knocked-over lawn chair  p beer pong table  t trash bags
//  Full cover: B bar  A amp  O tree  o ring post  I pillar  F fountain  R arcade cabinet  Q podium
//  P band spawn
//  Enemies: E Sweet Caroline  D Don't Stop Believin'  Y Shake It Off  (basic)
//           K Teenage Dirtbag  U Tennessee Whiskey  V Wonderwall  r Mr. Brightside  (elite)
//           l Livin' on a Prayer (elite medic)
//           M DJ Megamix (tank)   * Free Bird (legendary: teleports)   @ Hotel California (legendary: mind control)
//           X Seven Nation Army (boss)  Z Bohemian Rhapsody (final boss, three acts)

/** One line of a pre-show scene. `who` is 'npc' (the mission's guest), 'band' (your first song) or an enemy id. */
export interface Line { who: string; text: string }

export interface Scene {
  /** The character the band confronts: an id from NPCS or ENEMIES. */
  guest: string;
  /** Where the guest stands on the map during the scene. */
  at: { x: number; y: number };
  /** Guest leaves when the scene ends (an NPC), or stays and fights (an enemy already on the map). */
  leaves: boolean;
  lines: Line[];
}

export interface MissionDef {
  id: string;
  venue: string;
  where: string;
  blurb: string;
  intro: string;
  theme: string;
  map: string[];
  tutorial?: boolean;
  scene?: Scene;
}

export const MISSIONS: MissionDef[] = [
  {
    id: 'eagles-lodge', venue: 'EAGLES LODGE', where: 'VALPARAISO, IN', theme: 'lodge', tutorial: true,
    blurb: 'WHERE IT ALL STARTED. A LOW STAGE, TWO FLAGS, FOLDING TABLES AND A DISCO BALL.',
    intro: 'FIRST GIG EVER. TIME TO LEARN THE ROPES!',
    scene: {
      guest: 'earl', at: { x: 3, y: 4 }, leaves: true,
      lines: [
        { who: 'npc', text: "WELL I'LL BE. A REAL BAND. WITH REAL SONGS. HAVEN'T SEEN ONE OF YOU IN YEARS." },
        { who: 'npc', text: 'THE COVER SONGS TOOK OVER EVERY STAGE IN TOWN. THEY EVEN TOOK BINGO NIGHT.' },
        { who: 'npc', text: "YOU MIGHT BE THE LAST HOPE TO DEFEAT THE COVER BANDS. WE'RE ALL COUNTING ON YOU." },
        { who: 'band', text: 'NO PRESSURE, THEN.' },
        { who: 'npc', text: "BUT I NEED TO KNOW YOU'VE GOT WHAT IT TAKES. THREE OF 'EM JUST CLIMBED ON OUR STAGE." },
        { who: 'npc', text: 'COME ON, KID. LET ME SHOW YOU THE ROPES.' },
      ],
    },
    map: [
      '####N########N######',
      '#........JsssssJ...#',
      '#P........sssEs....#',
      '#...HTH.......HTH..#',
      '#P..........Q...D..#',
      '#...WWWW....WWWW...#',
      '#P..............Y..#',
      '#..HTH...WWWW..HTH.#',
      '#P.......H...BBB...#',
    ],
  },
  {
    id: 'blockhouse', venue: 'BLOCKHOUSE', where: 'BASEMENT BAR', theme: 'blockhouse',
    blurb: 'AN UNFINISHED BASEMENT BAR. BARE BULBS, CONCRETE AND ONE VERY SAD COUCH.',
    intro: 'IT IS DARK DOWN HERE. STICK TO COVER.',
    scene: {
      guest: 'caroline', at: { x: 17, y: 6 }, leaves: false,
      lines: [
        { who: 'caroline', text: 'WELL, WELL. ORIGINAL SONGS? IN THIS ECONOMY?' },
        { who: 'band', text: "WE'RE HERE TO PLAY OUR SET. YOU'RE IN OUR SPOT." },
        { who: 'caroline', text: 'EVERYBODY DOWN HERE KNOWS ALL MY WORDS. NOBODY KNOWS ANY OF YOURS.' },
        { who: 'band', text: "THEY WILL AFTER TONIGHT." },
      ],
    },
    map: [
      '###N#####N#####N####',
      '#...c....I...c..sss#',
      '#P.......,,,....sEs#',
      '#..C.....,C,..I....#',
      '#P....I..,,,....D..#',
      '#.........k...Y..c.#',
      '#P..cc.....I.....E.#',
      '#.........C...D....#',
      '#P....I.......Y..cc#',
    ],
  },
  {
    id: 'reef', venue: 'THE REEF', where: 'HOUSE SHOW', theme: 'reef',
    blurb: 'A COLLEGE HOUSE PARTY, THE MORNING AFTER. KEGS, COOLERS, CUPS EVERYWHERE. A DJ ON THE DECK.',
    intro: 'THE COVERS CRASHED THE AFTER-PARTY!',
    map: [
      '####N####N####N#####',
      'f,,,,,G,,,q,,k,,,,,f',
      'fP.......x..D..sssMf',
      'f....C...pp...t....f',
      'fP.......q....E..x.f',
      'f...x......C...k...f',
      'fP.....k..t...D..Y.f',
      'f..........x...q...f',
      'fP...ffff.....E..Y.f',
    ],
  },
  {
    id: 'bishop', venue: 'THE BISHOP', where: 'ONE-ROOM VENUE', theme: 'bishop',
    blurb: 'ONE BIG ROOM, ONE BIG STAGE. A DJ MEGAMIX IS WORKING THE CROWD.',
    intro: 'PACK THE ROOM. KNOCK OUT THE DJ!',
    map: [
      '#####N####N####N####',
      '#BBBBB.......S..sss#',
      '#P.......T.......sM#',
      '#.....S......I..Ess#',
      '#P......,,,,,..D.ss#',
      '#..T....,,,,,..D.AA#',
      '#P.......I.....K.ss#',
      '#....S.......Y...sr#',
      '#P.....T.....E.T.ss#',
    ],
  },
  {
    id: 'hoosier-dome', venue: 'HOOSIER DOME', where: 'MID-SIZE VENUE', theme: 'hoosierdome',
    blurb: 'A REAL VENUE WITH A REAL STAGE, AND SEVEN NATION ARMY WANTS IT.',
    intro: 'BOSS FIGHT: SEVEN NATION ARMY!',
    map: [
      '###N######N######N##',
      '#..cc......B.E..sss#',
      '#P.......T....A.sXs#',
      '#...S.......E.U.sss#',
      '#P....,,,,,,....A..#',
      '#..T..,,,,,,..Y..D.#',
      '#P........T....K...#',
      '#....S.......V...Y.#',
      '#P.....BBBBB...D...#',
    ],
  },
  {
    id: 'bum-fights', venue: 'BUM FIGHTS', where: 'GYMNASIUM', theme: 'bumfights',
    blurb: 'A GYMNASIUM WITH A FIGHTING RING IN THE MIDDLE. DO NOT ASK QUESTIONS.',
    intro: 'TWO DJS IN THE RING. RING THE BELL!',
    map: [
      '####N#####N#####N###',
      '#.LLLL......Dr.LLLL#',
      '#P.....o----o......#',
      '#......|mmmm|..M.D.#',
      '#P.....mmmMmm....l.#',
      '#..k...|mmmm|..K...#',
      '#P.....o----o....Y.#',
      '#...........Y..r..E#',
      '#P.LLLL....,,,..LLL#',
    ],
  },
  {
    id: 'healer', venue: 'HEALER', where: '???', theme: 'healer',
    blurb: 'NOTHING IN HERE IS REAL. THE MUSHROOMS ARE BIG ENOUGH TO HIDE BEHIND.',
    intro: 'THE WALLS ARE BREATHING. KEEP PLAYING.',
    map: [
      '##N####N####N####N##',
      '#...h......,,,.E.sU#',
      '#P.....h..,,h,,..ss#',
      '#..h.....,,,,,..Y.Y#',
      '#P....A....h....h.M#',
      '#.......h....@..K..#',
      '#P..h......,,,..D..#',
      '#.......A...r.h..*.#',
      '#P...h.....h..l.U..#',
    ],
  },
  {
    id: 'bluebird', venue: 'THE BLUEBIRD', where: 'CLASSY DIVE BAR', theme: 'bluebird',
    blurb: 'A DIVE BAR THAT OWNS ONE NICE SHIRT. CHECKERED FLOOR, BOOTHS, NO MERCY.',
    intro: 'ACOUSTIC SNIPERS IN THE BOOTHS. WATCH THE ANGLES.',
    map: [
      '####N#####N#####N###',
      '#BBBBBBBB.....K.sss#',
      '#P.S.S.S.S...Y..sUs#',
      '#...........T...r.D#',
      '#P..,,,,,......C..M#',
      '#...,T,,,..T.....l.#',
      '#P..,,,,,....D..@V.#',
      '#.........C.Y..U...#',
      '#P..CC.....T....*..#',
    ],
  },
  {
    id: 'kilroys', venue: "KILROY'S SPORTS", where: 'COLLEGE SPORTS BAR', theme: 'kilroys',
    blurb: 'EVERY TV IS ON. SO IS SEVEN NATION ARMY, AND HE BROUGHT FRIENDS.',
    intro: 'GAME DAY. THE STADIUM CHANT IS BACK!',
    map: [
      '##N###N###N###N###N#',
      '#RRR.........T.E.RR#',
      '#P.......BBBB...sXs#',
      '#..T.....B..B....U.#',
      '#P.......BBBB..l.r.#',
      '#....T.....D...M..@#',
      '#P..,,,,..T..K....*#',
      '#...,CC,......YK...#',
      '#P..,,,,.T.E.V..RRR#',
    ],
  },
  {
    id: 'central-park', venue: 'CENTRAL PARK PLAZA', where: 'VALPARAISO, IN', theme: 'park',
    blurb: 'THE HOMETOWN HEADLINER. BOHEMIAN RHAPSODY HAS TAKEN THE AMPHITHEATER.',
    intro: 'FINAL SHOW: TAKE BACK THE AMPHITHEATER!',
    map: [
      'OO#N###N#OO#N###N#OO',
      '....,,,,,,,.YO.Mssss',
      '.P..,I,,,I,.....ssZs',
      '....,,,,,,,.En..ssss',
      '.P..,I,,,I,..U.D...n',
      '....,,,,,,,..l..F..r',
      '.P......b...K.M..*..',
      '..n...O......V...@..',
      '.P.......n.r....O.YU',
    ],
  },
];

export const TILE_CHARS: Record<string, TileType> = {
  '#': 'wall', N: 'neon', '.': 'floor', ',': 'floor2', s: 'stage', m: 'mat',
  T: 'table', S: 'stool', c: 'crate', B: 'bar', A: 'amp',
  b: 'bush', O: 'tree', f: 'fence', C: 'couch', L: 'bleacher', o: 'post', '-': 'rope', '|': 'ropev',
  I: 'pillar', k: 'keg', G: 'grill', F: 'fountain', n: 'bench', R: 'arcade', h: 'shroom',
  W: 'folding', H: 'chair', Q: 'podium', J: 'flag',
  q: 'cooler', x: 'flipchair', p: 'pong', t: 'trash',
};

export const ENEMY_CHARS: Record<string, string> = {
  E: 'caroline', D: 'believin', Y: 'shake',
  K: 'karaoke', U: 'acoustic', V: 'wonderwall', r: 'brightside', M: 'megamix', l: 'prayer',
  '*': 'freebird', '@': 'hotel', X: 'boss', Z: 'encore',
};

/** How many cover songs a map has. */
export const enemyCount = (m: MissionDef) => [...m.map.join('')].filter((ch) => ENEMY_CHARS[ch]).length;

const WALKABLE_FLOORS: TileType[] = ['floor', 'floor2', 'stage', 'mat'];

/**
 * Turns a map into tiles. Spawn and enemy letters take the floor most of
 * their neighbours use, so someone standing in the ring stands on the mat.
 */
export function mapTiles(rows: string[]): TileType[][] {
  const base = rows.map((r) => [...r].map((ch) => TILE_CHARS[ch] ?? null));
  return base.map((row, y) => row.map((t, x) => {
    if (t) return t;
    const count = new Map<TileType, number>();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = base[y + dy]?.[x + dx];
      if (n && WALKABLE_FLOORS.includes(n)) count.set(n, (count.get(n) ?? 0) + 1);
    }
    let best: TileType = 'floor';
    let bestN = 0;
    for (const [k, n] of count) if (n > bestN) { best = k; bestN = n; }
    return best;
  }));
}

/** Win bonus grows as the tour gets bigger. */
export const winBonus = (index: number) => 100 + index * 25;
