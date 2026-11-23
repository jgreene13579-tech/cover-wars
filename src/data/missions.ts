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
        { who: 'npc', text: 'EVERY SONG GETS TWO ACTIONS A TURN. MOVE, SHOOT, OR PLAY ITS SPECIAL. SHOOTING ENDS ITS TURN, SO MOVE FIRST.' },
        { who: 'npc', text: "GET BEHIND SOMETHING. TABLES AND CHAIRS ARE HALF COVER. THE BAR AND MY PODIUM ARE FULL COVER. THEY'RE HALF AS LIKELY TO HIT YOU THERE." },
        { who: 'npc', text: "AIM GETS WORSE WITH DISTANCE AND COVER. CATCH 'EM FROM THE SIDE WITH NOTHING IN THE WAY AND YOU'LL LAND A BIG CRIT." },
        { who: 'band', text: 'MOVE, TAKE COVER, FLANK, SHOOT. GOT IT.' },
        { who: 'npc', text: "I'LL BE AT THE BAR YELLING TIPS. GO GET 'EM." },
      ],
    },
    map: [
      '####N########N######',
      '#........JsssssJ...#',
      '#P........sssEs....#',
      '#...HTH.......HTH..#',
      '#PP.........Q...D..#',
      '#...WWWW....WWWW...#',
      '#PP.............Y..#',
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
      '#PP...I..,,,....D..#',
      '#.........k...Y..c.#',
      '#PP.cc.....I.....E.#',
      '#.........C...D....#',
      '#P....I.......Y..cc#',
    ],
  },
  {
    id: 'reef', venue: 'THE REEF', where: 'HOUSE SHOW', theme: 'reef',
    blurb: 'A COLLEGE HOUSE PARTY, THE MORNING AFTER. KEGS, COOLERS, CUPS EVERYWHERE. A DJ ON THE DECK.',
    intro: 'THE COVERS CRASHED THE AFTER-PARTY!',
    scene: {
      guest: 'megamix', at: { x: 18, y: 2 }, leaves: false,
      lines: [
        { who: 'megamix', text: "OH GOOD, A LIVE BAND. HOLD ON, LET ME TURN MY SPEAKER UP." },
        { who: 'band', text: "THIS IS A BACKYARD PARTY. NOBODY ASKED FOR A FOUR-HOUR MASHUP." },
        { who: 'megamix', text: "WHY PLAY ONE SONG WHEN YOU CAN PLAY THE CHORUS OF EIGHT AT ONCE?" },
        { who: 'band', text: "BECAUSE OURS HAVE BRIDGES. HE'S TOUGH AND HITS HARD UP CLOSE. KEEP YOUR DISTANCE AND FOCUS FIRE." },
      ],
    },
    map: [
      '####N####N####N#####',
      'f,,,,,G,,,q,,k,,,,,f',
      'fP.......x..D..sssMf',
      'f....C...pp...t....f',
      'fPP......q....E..x.f',
      'f...x......C...k...f',
      'fPP....k..t...D..Y.f',
      'f..........x...q...f',
      'fP...ffff.....E..Y.f',
    ],
  },
  {
    id: 'bishop', venue: 'THE BISHOP', where: 'ONE-ROOM VENUE', theme: 'bishop',
    blurb: 'ONE BIG ROOM, ONE BIG STAGE. A DJ MEGAMIX IS WORKING THE CROWD.',
    intro: 'PACK THE ROOM. KNOCK OUT THE DJ!',
    scene: {
      guest: 'karaoke', at: { x: 15, y: 6 }, leaves: false,
      lines: [
        { who: 'karaoke', text: "YOU'RE PLAYING THE BISHOP? CUTE. I SANG HERE LAST FRIDAY. AND THE FRIDAY BEFORE THAT." },
        { who: 'brightside', text: "AND I'M FAST. I DON'T EVEN NEED MY GUN TO RUIN YOUR NIGHT." },
        { who: 'band', text: "STRIPED SLEEVES HITS HARD. THE RUNNER PUNCHES THROUGH COVER. DO NOT LET HIM REACH YOU." },
        { who: 'karaoke', text: "SEE YOU AT THE HIGH NOTE." },
      ],
    },
    map: [
      '#####N####N####N####',
      '#BBBBB.......S..sss#',
      '#P.......T.......sM#',
      '#.....S......I..Ess#',
      '#PP.....,,,,,..D.ss#',
      '#..T....,,,,,..D.AA#',
      '#PP......I.....K.ss#',
      '#....S.......Y...sr#',
      '#P.....T.....E.T.ss#',
    ],
  },
  {
    id: 'hoosier-dome', venue: 'HOOSIER DOME', where: 'MID-SIZE VENUE', theme: 'hoosierdome',
    blurb: 'A REAL VENUE WITH A REAL STAGE, AND SEVEN NATION ARMY WANTS IT.',
    intro: 'BOSS FIGHT: SEVEN NATION ARMY!',
    scene: {
      guest: 'boss', at: { x: 17, y: 2 }, leaves: false,
      lines: [
        { who: 'boss', text: "WELCOME TO THE DOME. SEVENTY THOUSAND SEATS, AND EVERY ONE OF THEM KNOWS MY RIFF." },
        { who: 'acoustic', text: "I'LL BE UP IN THE CHEAP SEATS. TAKING MY TIME. AIMING WITH IT." },
        { who: 'wonderwall', text: "AND I BROUGHT THE ACOUSTIC. EVERYONE NEAR ME PLAYS A LITTLE BETTER." },
        { who: 'band', text: "THE BIG ONE'S CHANT IS A SHOCKWAVE, SO DON'T BUNCH UP. TAKE OUT THE GUITAR GUY FIRST." },
        { who: 'boss', text: "LET ME HEAR YOU, STADIUM!" },
      ],
    },
    map: [
      '###N######N######N##',
      '#..cc......B.E..sss#',
      '#P.......T....A.sXs#',
      '#...S.........U.sss#',
      '#PP...,,,,,,....A..#',
      '#..T..,,,,,,..Y....#',
      '#PP.......T....K...#',
      '#....S.......V...Y.#',
      '#P.....BBBBB...D...#',
    ],
  },
  {
    id: 'bum-fights', venue: 'BUM FIGHTS', where: 'GYMNASIUM', theme: 'bumfights',
    blurb: 'A GYMNASIUM WITH A FIGHTING RING IN THE MIDDLE. DO NOT ASK QUESTIONS.',
    intro: 'TWO DJS IN THE RING. RING THE BELL!',
    scene: {
      guest: 'prayer', at: { x: 17, y: 4 }, leaves: false,
      lines: [
        { who: 'prayer', text: "IN THIS CORNER: TWO DJS, A RUNNER, AND ME. I KEEP THEM ALL STANDING." },
        { who: 'band', text: "WAIT. COVERS HAVE MEDICS NOW?" },
        { who: 'prayer', text: "EVERY BAR IN AMERICA SINGS ME AT LAST CALL. NOBODY STAYS DOWN ON MY WATCH." },
        { who: 'band', text: "THEN YOU GO DOWN FIRST." },
      ],
    },
    map: [
      '####N#####N#####N###',
      '#.LLLL......D..LLLL#',
      '#P.....o----o......#',
      '#......|mmmm|..Y.D.#',
      '#PP....mmmMmm....l.#',
      '#..k...|mmmm|..K...#',
      '#PP....o----o....Y.#',
      '#..............r..E#',
      '#P.LLLL....,,,..LLL#',
    ],
  },
  {
    id: 'healer', venue: 'HEALER', where: '???', theme: 'healer',
    blurb: 'NOTHING IN HERE IS REAL. THE MUSHROOMS ARE BIG ENOUGH TO HIDE BEHIND.',
    intro: 'THE WALLS ARE BREATHING. KEEP PLAYING.',
    scene: {
      guest: 'hotel', at: { x: 13, y: 5 }, leaves: false,
      lines: [
        { who: 'hotel', text: "WELCOME. YOUR ROOM IS READY. IT HAS ALWAYS BEEN READY." },
        { who: 'band', text: "IS THE FLOOR... BREATHING?" },
        { who: 'hotel', text: "STAY AS LONG AS YOU LIKE. ACTUALLY, STAY FOREVER. I INSIST." },
        { who: 'freebird', text: "AND RIGHT WHEN YOU GET COMFORTABLE, I'LL BE BEHIND YOU. WITH A VERY LONG SOLO." },
        { who: 'band', text: "IF HE TAKES ONE OF US, HIT HIM TO BREAK THE SPELL. AND WATCH YOUR BACKS FOR THE BIRD." },
      ],
    },
    map: [
      '##N####N####N####N##',
      '#...h......,,,.E.sU#',
      '#P.....h..,,h,,..ss#',
      '#..h.....,,,,,..Y.Y#',
      '#PP...A....h....h.M#',
      '#.......h....@.....#',
      '#PP.h......,,,..D..#',
      '#.......A.....h..*.#',
      '#P...h.....h..l....#',
    ],
  },
  {
    id: 'bluebird', venue: 'THE BLUEBIRD', where: 'CLASSY DIVE BAR', theme: 'bluebird',
    blurb: 'A DIVE BAR THAT OWNS ONE NICE SHIRT. CHECKERED FLOOR, BOOTHS, NO MERCY.',
    intro: 'ACOUSTIC SNIPERS IN THE BOOTHS. WATCH THE ANGLES.',
    scene: {
      guest: 'acoustic', at: { x: 17, y: 2 }, leaves: false,
      lines: [
        { who: 'acoustic', text: "QUIET, PLEASE. THIS IS A LISTENING ROOM." },
        { who: 'band', text: "WE'RE A ROCK BAND." },
        { who: 'acoustic', text: "THEN YOU'LL BE VERY EASY TO HEAR. AND VERY EASY TO HIT." },
        { who: 'band', text: "SNIPERS IN THE BOOTHS. FLANK THEM. DON'T TRADE SHOTS ACROSS THE ROOM." },
      ],
    },
    map: [
      '####N#####N#####N###',
      '#BBBBBBBB.....K.sss#',
      '#P.S.S.S.S...Y..sUs#',
      '#...........T...r..#',
      '#PP.,,,,,......C..M#',
      '#...,T,,,..T.....l.#',
      '#PP.,,,,,....D..@V.#',
      '#.........C....U...#',
      '#P..CC.....T.......#',
    ],
  },
  {
    id: 'kilroys', venue: "KILROY'S SPORTS", where: 'COLLEGE SPORTS BAR', theme: 'kilroys',
    blurb: 'EVERY TV IS ON. SO IS SEVEN NATION ARMY, AND HE BROUGHT FRIENDS.',
    intro: 'GAME DAY. THE STADIUM CHANT IS BACK!',
    scene: {
      guest: 'earl', at: { x: 2, y: 3 }, leaves: true,
      lines: [
        { who: 'npc', text: "KID! I DROVE ALL THE WAY OUT HERE. THE WHOLE LODGE IS WATCHING ON THE BIG SCREEN." },
        { who: 'band', text: "EARL? AT A SPORTS BAR?" },
        { who: 'npc', text: "THAT STADIUM CHANT IS BACK, AND HE BROUGHT HIS WHOLE TEAM. WIN THIS ONE AND IT'S THE PARK. HOMETOWN SHOW." },
        { who: 'boss', text: "GAME DAY! YOU CAN'T OUT-CHANT A STADIUM. YOU DEFINITELY CAN'T OUT-CHANT A SPORTS BAR." },
        { who: 'npc', text: "DON'T LISTEN TO HIM. GO GET 'EM. I'LL BE AT THE BAR." },
      ],
    },
    map: [
      '##N###N###N###N###N#',
      '#RRR.........T.E.RR#',
      '#P.......BBBB...sXs#',
      '#..T.....B..B....U.#',
      '#PP......BBBB..l.r.#',
      '#....T.....D...M..@#',
      '#PP.,,,,..T..K....*#',
      '#...,CC,......Y....#',
      '#P..,,,,.T...V..RRR#',
    ],
  },
  {
    id: 'central-park', venue: 'CENTRAL PARK PLAZA', where: 'VALPARAISO, IN', theme: 'park',
    blurb: 'THE HOMETOWN HEADLINER. BOHEMIAN RHAPSODY HAS TAKEN THE AMPHITHEATER.',
    intro: 'FINAL SHOW: TAKE BACK THE AMPHITHEATER!',
    scene: {
      guest: 'encore', at: { x: 18, y: 2 }, leaves: false,
      lines: [
        { who: 'encore', text: "SO. THE LITTLE ORIGINAL BAND MADE IT HOME." },
        { who: 'encore', text: "I AM SIX MINUTES LONG. I HAVE NO CHORUS. AND STILL, EVERY CROWD ON EARTH KNOWS EVERY PART OF ME." },
        { who: 'band', text: "WE KNOW. WE'VE HEARD YOU AT EVERY WEDDING WE'VE EVER PLAYED." },
        { who: 'encore', text: "THEN YOU KNOW HOW THIS GOES. FIRST A BALLAD. THEN AN OPERA. THEN WE ROCK." },
        { who: 'band', text: "AND THEN WE PLAY OUR SET. IN OUR TOWN." },
      ],
    },
    map: [
      'OO#N###N#OO#N###N#OO',
      '....,,,,,,,..O.Mssss',
      '.P..,I,,,I,.....ssZs',
      '....,,,,,,,.En..ssss',
      '.PP.,I,,,I,..U.D...n',
      '....,,,,,,,..l..F..r',
      '.PP.....b.....M..*..',
      '..n...O......V...@..',
      '.P.......n.r....O.Y.',
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
