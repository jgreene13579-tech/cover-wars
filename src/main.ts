import Phaser from 'phaser';
import { GAME_H, GAME_W } from './config';
import { available } from './assets';
import { CHARACTERS } from './data/characters';
import { Music } from './audio/Music';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { TourScene } from './scenes/TourScene';
import { SquadScene } from './scenes/SquadScene';
import { ShopScene } from './scenes/ShopScene';
import { MissionScene } from './scenes/MissionScene';
import { ResultsScene } from './scenes/ResultsScene';

/** True if a band file exists (checked by content type so a missing file never breaks the game). */
async function exists(url: string, type: 'audio' | 'image') {
  try {
    const r = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    return r.ok && (r.headers.get('content-type') ?? '').startsWith(type);
  } catch {
    return false;
  }
}

async function firstExisting(urls: string[]) {
  for (const u of urls) if (await exists(u, 'image')) return u;
  return '';
}

async function start() {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  const fontReady = fonts
    ? Promise.race([fonts.load('8px "Press Start 2P"'), new Promise((r) => setTimeout(r, 2500))])
    : Promise.resolve();

  const checks = [
    ...CHARACTERS.map(async (c) => {
      if (await exists(`assets/music/${c.music}`, 'audio')) available.music.add(c.id);
    }),
    (async () => { available.logoFile = await firstExisting(['assets/art/logo.png', 'assets/art/logo.jpg']); })(),
    (async () => { available.albumFile = await firstExisting(['assets/art/album.png', 'assets/art/album.jpg']); })(),
  ];
  await Promise.all([fontReady, ...checks]);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_W,
    height: GAME_H,
    backgroundColor: '#0b0710',
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 2 },
    scene: [BootScene, TitleScene, TourScene, SquadScene, ShopScene, MissionScene, ResultsScene],
  });

  if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;

  window.addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') Music.toggleMute(game);
  });
}

void start();
