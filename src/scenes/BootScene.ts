import Phaser from 'phaser';
import { available } from '../assets';
import { CHARACTERS } from '../data/characters';
import { buildTextures } from '../art/textures';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    this.load.on('loaderror', () => { /* optional band files: ignore anything missing */ });
    for (const c of CHARACTERS) {
      if (available.music.has(c.id)) this.load.audio(`song-${c.id}`, `assets/music/${c.music}`);
    }
    if (available.logoFile) this.load.image('logo', available.logoFile);
    if (available.albumFile) this.load.image('album', available.albumFile);
  }

  create() {
    buildTextures(this);
    document.getElementById('loading')?.remove();
    this.scene.start('Title');
  }
}
