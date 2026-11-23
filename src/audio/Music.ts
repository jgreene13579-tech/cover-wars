import Phaser from 'phaser';
import { available } from '../assets';
import { CHARACTERS } from '../data/characters';
import { setSynthMuted, startChipLoop, stopChipLoop } from './Synth';

// Each song-character has a theme: their own track. Selecting a character
// crossfades to their song. With no MP3s yet, a chiptune loop plays instead.

let current: Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound | null = null;
let currentKey = '';
let muted = false;
const VOLUME = 0.55;

function fade(snd: { volume: number }, to: number, ms: number, done?: () => void) {
  const from = snd.volume;
  const start = performance.now();
  const id = window.setInterval(() => {
    const t = Math.min(1, (performance.now() - start) / ms);
    snd.volume = from + (to - from) * t;
    if (t >= 1) { window.clearInterval(id); done?.(); }
  }, 30);
}

export const Music = {
  playCharacter(scene: Phaser.Scene, charId: string) {
    const key = `song-${charId}`;
    if (!available.music.has(charId) || !scene.cache.audio.exists(key)) {
      if (!current) startChipLoop();
      return;
    }
    if (currentKey === key) return;
    stopChipLoop();
    const old = current;
    if (old) fade(old, 0, 600, () => { old.stop(); old.destroy(); });
    const snd = scene.sound.add(key, { loop: true, volume: 0 }) as typeof current;
    if (!snd) return;
    snd.play();
    fade(snd, VOLUME, 800);
    current = snd;
    currentKey = key;
  },

  /** Menu music: first available band song, else the chip loop. */
  menu(scene: Phaser.Scene) {
    if (current) return;
    const first = CHARACTERS.find((c) => available.music.has(c.id));
    if (first) this.playCharacter(scene, first.id);
    else startChipLoop();
  },

  toggleMute(game: Phaser.Game) {
    muted = !muted;
    game.sound.mute = muted;
    setSynthMuted(muted);
    return muted;
  },

  get muted() { return muted; },
};
