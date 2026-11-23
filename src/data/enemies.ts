import type { Palette } from '../art/pixel';
import type { Weapon } from './characters';

// The cover songs. Each is a personified "song every bar band covers".
// Taunts are original jokes about the song's vibe; no lyrics are quoted.
export interface EnemyDef {
  id: string;
  name: string; // <= 20 chars, fits the HUD
  tier: 'basic' | 'elite' | 'tank' | 'legend' | 'boss';
  hp: number;
  aim: number;
  move: number;
  weapon: Weapon;
  boss?: boolean;
  /** Runs up and hits instead of shooting when someone is in reach. Flat hit chance, ignores cover. */
  melee?: { name: string; dmg: [number, number]; aim: number };
  /** Blinks to a new spot instead of walking, every `cooldown` turns. */
  teleport?: { range: number; cooldown: number };
  /** Other cover songs within `range` tiles get +`aim` to hit. */
  aura?: { range: number; aim: number };
  /**
   * Hotel California: "checks in" a band member in sight within `range`. While he holds them he
   * can't move or shoot; they turn on the band each enemy turn. Any damage to him breaks it.
   * After a hold ends he waits `cooldown` turns before trying again.
   */
  mindControl?: { range: number; cooldown: number };
  taunts: string[];
  palette: Palette;
  art: string[];
}

export const ENEMIES: Record<string, EnemyDef> = {
  // ------------------------------------------------ basic cover songs
  caroline: {
    id: 'caroline',
    name: 'SWEET CAROLINE',
    tier: 'basic',
    hp: 4, aim: 60, move: 5,
    weapon: { name: 'BALLPARK HORN', dmg: [2, 3], range: 10, shots: 1, crit: 5, sfx: 'note' },
    taunts: [
      'EVERY BALLPARK IN AMERICA KNOWS MY HORN PART.',
      'THE CROWD SINGS ME FOR FREE. WHO SINGS YOU?',
      'I AM THE 8TH INNING. YOU ARE A RAIN DELAY.',
      'WEDDINGS. BAR MITZVAHS. YOUR FUNERAL.',
      'YOUR DRUMMER IS WAITING FOR MY HORN HITS.',
      'WHO EVEN WROTE YOU? OH, YOU DID? YIKES.',
    ],
    palette: {
      C: 0x1e2a5a, R: 0xd8344a, c: 0x16204a, h: 0x6b4226, s: 0xf1c29a, e: 0x1a1020, m: 0x8a2040,
      W: 0xf4f0ea, y: 0xffd34f, Y: 0xffe88a, p: 0x3a4a6a, k: 0xf2f2f2,
    },
    art: [
      '................',
      '.....CCCCCC.....',
      '....CCCRCCCC....',
      '....CCCCCCCCcc..',
      '....hsssssss....',
      '....ssesssess...',
      '....ssssssss....',
      '.....ssmmss.....',
      '....WWRWWRWW....',
      '...WWWRWWRWWW...',
      '...WWWRWWRWWsyy.',
      '...sWWRWWRWWWyY.',
      '....WWRWWRWW....',
      '....WWWWWWWW....',
    ],
  },
  believin: {
    id: 'believin',
    name: "DON'T STOP BELIEVIN'",
    tier: 'basic',
    hp: 5, aim: 58, move: 4,
    weapon: { name: 'POWER CHORD', dmg: [2, 4], range: 11, shots: 1, crit: 10, sfx: 'note' },
    taunts: [
      "I'VE BEEN THE LAST SONG OF THE NIGHT SINCE 1981.",
      'EVERY KARAOKE NIGHT ENDS WITH ME. EVERY. ONE.',
      'MY KEYBOARD INTRO ALONE HAS MORE FANS THAN YOU.',
      'EVERY DIVE BAR JUKEBOX HAS ME ON IT. TWICE.',
      'I NEVER STOP. LIKE, LITERALLY. PLEASE HELP.',
      'NICE ORIGINALS. NOBODY WILL SCREAM THEM AT 2 AM.',
    ],
    palette: {
      H: 0x5a3418, r: 0xd8344a, s: 0xe8b890, e: 0x1a1020, m: 0x8a2a2a,
      L: 0x1a1a22, W: 0xf2f2f2, g: 0xc8ccd8, G: 0x555a66, p: 0x3a4a8a, k: 0x1a1a1a,
    },
    art: [
      '...HHHHHHHHH....',
      '..HHHHHHHHHHH...',
      '..HHHrrrrrrHHH..',
      '..HHsssssssHH...',
      '..HHssessesHH...',
      '..HHHsssssHHH...',
      '...HHsmmmsHH....',
      '....LLWWWLL.....',
      '...LLLWWWLLL....',
      '...LLLWWWLLLggg.',
      '...sLLWWWLLsGG..',
      '...LLLLLLLLL....',
      '....LLLLLLL.....',
      '....LLLLLLL.....',
    ],
  },
  shake: {
    id: 'shake',
    name: 'SHAKE IT OFF',
    tier: 'basic',
    hp: 4, aim: 62, move: 6,
    weapon: { name: 'GLITTER CANNON', dmg: [1, 2], range: 7, shots: 2, crit: 10, sfx: 'note' },
    taunts: [
      "YOUR CRITICISM? ALREADY SHAKEN. IT'S GONE.",
      "I DON'T TAKE COVER. I TAKE CHOREOGRAPHY.",
      'EVERY BRIDESMAID IN TOWN KNOWS MY DANCE.',
      'YOU CANNOT HIT WHAT YOU CANNOT STOP DANCING NEAR.',
      'GLITTER NEVER COMES OUT. GOOD LUCK, BOYS.',
      'BAD REVIEWS? I DANCE THOSE OFF TOO.',
    ],
    palette: {
      V: 0xa64fff, s: 0xf3c9a6, e: 0x1a1020, m: 0xc02060,
      P: 0xff4fa3, G: 0xffffff, g: 0xffd34f, p: 0xff4fa3, k: 0xffffff,
    },
    art: [
      '................',
      '.....VVVVVV.....',
      '....VVVVVVVV....',
      '....VVVVVVVVV...',
      '....VsssssssV...',
      '....ssesssess...',
      '....ssssssss....',
      '.....ssmmss.....',
      '....PPGPPGPP....',
      '..s.PGPPGPPG.s..',
      '..sPPPGPPGPPPs..',
      '....PGPPGPPGgg..',
      '....PPGPPGPPG...',
      '....PPPPPPPP....',
    ],
  },

  // ------------------------------------------------ elites
  karaoke: {
    id: 'karaoke',
    name: 'KARAOKE POWER BALLAD',
    tier: 'elite',
    hp: 6, aim: 65, move: 4,
    weapon: { name: 'POWER NOTE', dmg: [3, 4], range: 10, shots: 1, crit: 10, sfx: 'note' },
    taunts: [
      'KEY CHANGE INCOMING! EVERYBODY STAND UP!',
      'I HIT THE HIGH NOTE. SORT OF. CLOSE ENOUGH.',
      'THE KARAOKE HOST LOVES ME. SHE HAS TO.',
      'THIS SONG HAS FOUR CHORUSES AND I NEED ALL OF THEM.',
    ],
    palette: {
      Y: 0xffe07a, y: 0xfff3b8, s: 0xf3c9a6, e: 0x3a1060, m: 0xc02060,
      V: 0x8a3fd1, v: 0xe8c6ff, g: 0xc8ccd8, G: 0x555a66, p: 0x2a1840, k: 0xd8344a,
    },
    art: [
      '...YYYYYYYYY....',
      '..YYYyYYYyYYY...',
      '..YYYYYYYYYYYY..',
      '..YYsssssssYY...',
      '..YYsssesseYY...',
      '..YYsssssssYY...',
      '...YYsmmmsYY....',
      '....VVVVVVVV....',
      '...VvVVvVVvVV...',
      '...VVVvVVvVVs...',
      '...VvVVVVVVVsgg.',
      '...VVVvVVvVV.G..',
      '....VVVVVVVV....',
      '....VvVVvVVV....',
    ],
  },
  acoustic: {
    id: 'acoustic',
    name: 'COFFEEHOUSE ACOUSTIC',
    tier: 'elite',
    hp: 4, aim: 72, move: 4,
    weapon: { name: 'OPEN STRING', dmg: [3, 4], range: 15, shots: 1, crit: 15, sfx: 'note' },
    taunts: [
      'THIS NEXT ONE IS A STRIPPED-DOWN VERSION. OF YOU.',
      'I SAW YOU FROM ACROSS THE COFFEE SHOP.',
      'CAPO ON THE SECOND FRET. SCOPE ON YOUR HEAD.',
      'PLEASE HOLD YOUR APPLAUSE. AND YOUR COVER.',
    ],
    palette: {
      H: 0x6a6a7a, h: 0x4a4a5a, s: 0xf1c29a, e: 0x1a1020, b: 0x8a5a2a, m: 0x6a2a2a,
      F: 0x3a7a4a, f: 0x1e4a2a, O: 0xc8843a, o: 0x3a1a0a, w: 0x6a4a2a, p: 0x3a3a4a, k: 0x5a3a20,
    },
    art: [
      '................',
      '.....HHHHHH.....',
      '....HHHHHHHH....',
      '....HhHhHhHH....',
      '....ssssssss....',
      '....sesssess....',
      '....bbbbbbbb....',
      '.....bbmmbb.....',
      '....FFFFFFFF....',
      '...FfFFfFFfFF...',
      '...FFfOOOOFfFww.',
      '...sFOOooOOFsw..',
      '...FFfOOOOfFF...',
      '....FFFFFFFF....',
    ],
  },

  wonderwall: {
    id: 'wonderwall',
    name: 'WONDERWALL',
    tier: 'elite',
    hp: 6, aim: 60, move: 3,
    weapon: { name: 'CAMPFIRE STRUM', dmg: [2, 3], range: 10, shots: 1, crit: 5, sfx: 'note' },
    aura: { range: 3, aim: 15 },
    taunts: [
      "SOMEBODY ALWAYS BRINGS AN ACOUSTIC TO THE PARTY. IT'S ME.",
      'EVERYONE GROANS WHEN I START. THEN THEY ALL SING ALONG.',
      'FOUR CHORDS. INFINITE CONFIDENCE.',
      "SIT DOWN. I'LL PLAY YOU A SONG. YOU KNOW WHICH ONE.",
      'COVERS! SING LOUDER! I CAN FEEL US WINNING!',
    ],
    palette: {
      H: 0x6a3a1a, D: 0x1a1020, s: 0xf1c29a, m: 0x8a3a3a,
      P: 0x5a6a3a, Q: 0x3a4a22, O: 0xd89a4a, o: 0x2a1a0a, w: 0x6a4a2a, p: 0x2a3a5a, k: 0xe8e8e8,
    },
    art: [
      '................',
      '.....HHHHHH.....',
      '....HHHHHHHH....',
      '...HHHHHHHHHH...',
      '...HHDDsDDsHH...',
      '....sDDsDDss....',
      '....ssssssss....',
      '.....sssmss.....',
      '....PPPPPPPP....',
      '...PPQOOOOQPPw..',
      '...POOOooOOOw...',
      '...sPOOOOOOPs...',
      '....PPPPPPPP....',
      '....PQPPPPQP....',
    ],
  },
  brightside: {
    id: 'brightside',
    name: 'MR. BRIGHTSIDE',
    tier: 'elite',
    hp: 5, aim: 62, move: 7,
    weapon: { name: 'MIRRORBALL PISTOL', dmg: [2, 3], range: 8, shots: 1, crit: 10, sfx: 'note' },
    melee: { name: 'BRASS KNUCKLES', dmg: [3, 5], aim: 85 },
    taunts: [
      'EVERY INDIE NIGHT ENDS WITH ME. EVERY. SINGLE. ONE.',
      "TWENTY YEARS ON THE CHARTS AND I'VE NEVER SLOWED DOWN.",
      'PUNCH FIRST. SING SECOND.',
      'TOO FAST? I HAVE BEEN ON REPEAT SINCE 2004.',
      'LOOK ON THE... OH, YOU GET IT.',
    ],
    palette: {
      H: 0x1a1020, s: 0xf1c29a, e: 0x1a1020, m: 0x8a2a3a,
      W: 0xf2f2f2, Y: 0xffd34f, R: 0xff4fa3, g: 0xc8ccd8, G: 0x555a66, p: 0x1a1a22, k: 0x1a1a1a,
    },
    art: [
      '................',
      '.....HHHHHH.....',
      '....HHHHHHHHH...',
      '....HHssssssH...',
      '....Hssessess...',
      '.....ssssssss...',
      '.....ssmmss.....',
      '....WYWRRWYW....',
      '...WWWWRRWWWW...',
      '...WWWWRRWWWWgg.',
      '...sWWWRRWWWsG..',
      '....WWWWWWWW....',
      '....WWWWWWWW....',
      '....WWW..WWW....',
    ],
  },
  freebird: {
    id: 'freebird',
    name: 'FREE BIRD',
    tier: 'legend',
    hp: 10, aim: 72, move: 4,
    weapon: { name: 'ENDLESS SOLO', dmg: [3, 5], range: 13, shots: 1, crit: 15, sfx: 'note' },
    teleport: { range: 8, cooldown: 2 },
    taunts: [
      'SOMEBODY IN THE BACK REQUESTED ME. SOMEBODY ALWAYS DOES.',
      'MY SOLO IS LONGER THAN YOUR WHOLE SET.',
      "NOW YOU SEE ME. NOW I'M BEHIND YOU.",
      'THE GUITAR SOLO HAS ENTERED THE BUILDING.',
      'YELLED FROM EVERY BAR SINCE 1974. LOUDER EVERY YEAR.',
    ],
    palette: {
      T: 0x5a3a1a, Y: 0xffe07a, s: 0xe8b08a, A: 0x3a3a44, b: 0xc9a44a, m: 0x8a3a2a,
      J: 0x3a5a9a, W: 0xf2f2f2, F: 0xd8344a, g: 0xc8ccd8, G: 0x8a3a1a, p: 0x2a3a6a, k: 0x6a3a1a,
    },
    art: [
      '.....TTTTTT.....',
      '..TTTTTTTTTTTT..',
      '....YsssssssY...',
      '...YYsAAsAAsYY..',
      '...YYssssssssY..',
      '...YYbsssssbYY..',
      '...YY.ssmss.YY..',
      '....JJJJJJJJ....',
      '...JJWWFFWWJJ...',
      '...JJWFFFFWJJggg',
      '...sJWWFFWWJsGG.',
      '....JJWWWWJJ....',
      '....JJJJJJJJ....',
      '....JJJJJJJJ....',
    ],
  },

  hotel: {
    id: 'hotel',
    name: 'HOTEL CALIFORNIA',
    tier: 'legend',
    hp: 8, aim: 65, move: 4,
    weapon: { name: 'FRONT DESK BELL', dmg: [2, 3], range: 10, shots: 1, crit: 10, sfx: 'note' },
    mindControl: { range: 9, cooldown: 2 },
    taunts: [
      'YOUR ROOM IS READY. IT HAS BEEN READY FOR A VERY LONG TIME.',
      'NO VACANCY. EXCEPT FOR YOU.',
      "SIX AND A HALF MINUTES LONG. YOU'RE NOT GOING ANYWHERE.",
      'THE FRONT DESK NEVER SLEEPS.',
      'MY GUITAR SOLO IS LONGER THAN YOUR CAREER.',
      'CHECKOUT IS... COMPLICATED.',
    ],
    palette: {
      R: 0x7a1a2a, Y: 0xffd34f, H: 0x1a1020, s: 0xe8c0a0, P: 0xc77dff, m: 0x5a1a2a,
      W: 0xf2f2f2, g: 0xffd34f, G: 0xc9a44a, p: 0x1a1a22, k: 0x1a1a1a,
    },
    art: [
      '.....RRRRRR.....',
      '.....RYYYYR.....',
      '....HHHHHHHH....',
      '....HsssssssH...',
      '....sPsssPss....',
      '....ssssssss....',
      '.....ssmmss.....',
      '....RRRRRRRR....',
      '...RRRYRRYRRR...',
      '...RRRRWWRRRRgg.',
      '...sRRYRRYRRsG..',
      '...RRRRRRRRRR...',
      '....RRYRRYRR....',
      '....RRRRRRRR....',
    ],
  },

  // ------------------------------------------------ tank
  megamix: {
    id: 'megamix',
    name: 'DJ MEGAMIX',
    tier: 'tank',
    hp: 12, aim: 55, move: 4,
    weapon: { name: 'BASS DROP', dmg: [3, 5], range: 6, shots: 1, crit: 10, sfx: 'note' },
    taunts: [
      'TAKING REQUESTS! REQUEST DENIED.',
      'I MASHED SIX COVERS INTO ONE. I AM UNSTOPPABLE.',
      'THE DROP IS COMING. THE DROP IS ALWAYS COMING.',
      'NO ORIGINALS ON MY PLAYLIST. HOUSE RULES.',
      'I GOT A LAPTOP AND A FOG MACHINE. YOU GOT NOTHING.',
    ],
    palette: {
      C: 0x2a2a2a, P: 0xff4fa3, H: 0x1a1020, s: 0x8a5a3a, L: 0x4fe3ff, m: 0x5a1a2a,
      J: 0x2a2a6a, j: 0xffffff, Y: 0xffd34f, D: 0x3a3a44, p: 0x2a2a6a, k: 0xf2f2f2,
    },
    art: [
      '.....CCCCCC.....',
      '....C......C....',
      '...CHHHHHHHHC...',
      '..PCHHHHHHHHCP..',
      '..PPssssssssPP..',
      '..PPLLLLLLLLPP..',
      '....ssssssss....',
      '.....ssmmss.....',
      '..JJJJJJJJJJJJ..',
      '..JJjJJJJJJjJJ..',
      '..JJjJJYYJJjJJ..',
      '..sJjJJYYJJjsDD.',
      '..JJjJJJJJJjJDD.',
      '...JJJJJJJJJJ...',
    ],
  },

  // ------------------------------------------------ bosses
  boss: {
    id: 'boss',
    name: 'STADIUM CLAP-ALONG',
    tier: 'boss',
    hp: 12, aim: 70, move: 4,
    weapon: { name: 'FOAM FINGER', dmg: [3, 4], range: 10, shots: 1, crit: 10, sfx: 'note' },
    boss: true,
    taunts: [
      'EVERYBODY CLAP! EVEN YOU! ESPECIALLY YOU!',
      'TWO CLAPS AND A STOMP. THAT IS THE WHOLE SONG.',
      'THE JUMBOTRON LOVES ME.',
      'YOU CANNOT OUT-CLAP A STADIUM.',
    ],
    palette: {
      F: 0xffd34f, R: 0xd8344a, c: 0x9a1f30, s: 0xe0a070, b: 0x3a7bd5, e: 0x1a1020, m: 0x7a1020,
      J: 0xd8344a, n: 0xffffff, p: 0x2c3e6b, k: 0xffffff,
    },
    art: [
      '...........FF...',
      '....RRRRR..FF...',
      '...RRRRRRR.FF...',
      '..cccccccc.FFF..',
      '....sbsssbsFFFF.',
      '....sssesse.sFF.',
      '.....smmmss.s...',
      '....JJJJJJJJs...',
      '...JJJJnnJJJJ...',
      '...JJJnJJnJJJ...',
      '...sJJJJJnJJJ...',
      '...sJJJJnJJJJ...',
      '....JJJnnnJJ....',
      '....JJJJJJJJ....',
    ],
  },
  encore: {
    id: 'encore',
    name: 'THE ENCORE ANTHEM',
    tier: 'boss',
    hp: 18, aim: 72, move: 4,
    weapon: { name: 'POWER CHORUS', dmg: [3, 5], range: 11, shots: 1, crit: 15, sfx: 'note' },
    boss: true,
    taunts: [
      'YOU THOUGHT THE SHOW WAS OVER? ONE MORE SONG!',
      'LIGHTERS UP! PHONE FLASHLIGHTS UP! HANDS UP!',
      'THIS TOWN ONLY WANTS THE HITS.',
      'I HAVE BEEN THE ENCORE SINCE BEFORE YOU WERE BORN.',
    ],
    palette: {
      Y: 0xfff04f, s: 0xf1c29a, K: 0xff4fa3, m: 0xd8344a, C: 0xa64fff,
      R: 0xd8344a, W: 0xffffff, g: 0xc8ccd8, G: 0x555a66, p: 0xd8344a, k: 0xffffff,
    },
    art: [
      '...YY.YYYY.YY...',
      '..YYYYYYYYYYYY..',
      '.YYYYYYYYYYYYYY.',
      '.YYssssssssssYY.',
      '.YYsKKssssKKsYY.',
      '.YYssssssssssYY.',
      '..YYssmmmmssYY..',
      '..CCRRRRRRRRCC..',
      '.CCRRWRRRRWRRCC.',
      '.CCRRRWRRWRRRCC.',
      '.CCRRRRWWRRRRCgg',
      '.CsRRRRRRRRRRsG.',
      '.CCRRRRRRRRRRCC.',
      '.CC.RRRRRRRR.CC.',
    ],
  },
};

/** A band member checked in by Hotel California, fighting it. */
export const HYPNO_LINES = [
  'MUST... PLAY... THE HITS...',
  'I LOVE THIS SONG. WHY DO I LOVE THIS SONG?',
  'SORRY! MY HANDS ARE DOING IT!',
  'THE LOBBY IS SO NICE...',
  "I CAN'T FIND THE EXIT!",
  'ONE MORE NIGHT. JUST ONE MORE NIGHT.',
];

/** A band member snapping out of it. */
export const FREED_LINES = [
  'WHAT HAPPENED? WHY DO I KNOW ALL THE WORDS?',
  "I'M OUT! I'M CHECKING OUT!",
  'NEVER AGAIN. NEVER EVER AGAIN.',
  'WHO TOOK MY ROOM KEY?',
];

/** What the band shouts back after a knockout. */
export const BAND_COMEBACKS = [
  'WRITE YOUR OWN SONGS!',
  'NOBODY REQUESTED YOU.',
  "THAT'S WHAT ORIGINAL MATERIAL SOUNDS LIKE.",
  'GET OFF OUR STAGE.',
  'CHECK OUT OUR MERCH TABLE ON YOUR WAY OUT.',
  'THAT ONE WAS AN ORIGINAL, BY THE WAY.',
  'WE TAKE REQUESTS. NOT YOURS.',
  'STREAM OUR ALBUM, COWARD.',
  'YOU HAVE BEEN DROPPED FROM THE SET LIST.',
  'CANCEL THE ENCORE.',
  'TIP YOUR BARTENDERS.',
  'THANK YOU, GOODNIGHT!',
];
