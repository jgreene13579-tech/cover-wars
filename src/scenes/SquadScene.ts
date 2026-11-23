import Phaser from 'phaser';
import { COLORS, GAME_W, css } from '../config';
import { CHARACTERS } from '../data/characters';
import { MISSIONS } from '../data/missions';
import { loadSave, pendingLevelUps } from '../save';
import { squadSize } from '../data/upgrades';
import { Button } from '../ui/Button';
import { txt } from '../ui/text';
import { DetailPanel, RosterCard, rosterGrid } from '../ui/Roster';
import { Music } from '../audio/Music';
import { sfx } from '../audio/Synth';
import { backdrop } from './backdrop';


/** Pick the set list: which song-characters go on stage. */
export class SquadScene extends Phaser.Scene {
  private chosen: string[] = [];
  private cards: RosterCard[] = [];
  private startBtn!: Button;
  private countText!: Phaser.GameObjects.Text;
  private panel!: DetailPanel;
  private owned = new Set<string>();
  private mission = 0;
  /** Keep the last set list between shows. */
  static lastSquad: string[] = [];
  private maxSquad = 4;

  constructor() { super('Squad'); }

  create(data: { mission?: number }) {
    const save = loadSave();
    if (pendingLevelUps(save).length) {
      this.scene.start('LevelUp', { next: { key: 'Squad', data } });
      return;
    }
    backdrop(this);
    this.mission = data?.mission ?? Math.min(save.cleared, MISSIONS.length - 1);
    this.owned = new Set(save.unlocked);
    this.maxSquad = squadSize(save);
    const remembered = SquadScene.lastSquad.filter((id) => this.owned.has(id)).slice(0, squadSize(save));
    this.chosen = remembered.length ? remembered
      : CHARACTERS.filter((c) => this.owned.has(c.id)).slice(0, this.maxSquad).map((c) => c.id);

    txt(this, GAME_W / 2, 10, 'PICK YOUR SET LIST', 16, css(COLORS.pink)).setOrigin(0.5, 0);
    txt(this, GAME_W / 2, 31, `NIGHT ${this.mission + 1}: ${MISSIONS[this.mission].venue}. UP TO ${this.maxSquad} SONGS.`, 8, css(COLORS.gray)).setOrigin(0.5, 0);

    this.panel = new DetailPanel(this);
    this.cards = rosterGrid(this, CHARACTERS.map((c) => ({ c })), (it) => !this.owned.has(it.c!.id),
      (card) => this.pick(card), (card) => this.showDetail(card));

    new Button(this, 10, 318, 90, 28, 'BACK', () => this.scene.start('Tour'));
    new Button(this, 108, 318, 90, 28, 'SHOP', () => this.scene.start('Shop'));
    this.countText = txt(this, 290, 332, '', 8, css(COLORS.gold)).setOrigin(0.5);
    this.startBtn = new Button(this, GAME_W - 210, 318, 200, 28, 'START SHOW', () => this.start(), { fill: 0x5a1838, border: COLORS.pink });
    this.showDetail(this.cards[0]);
    this.refresh();
    Music.menu(this);
  }

  private showDetail(card: RosterCard) {
    const c = card.item.c!;
    if (this.owned.has(c.id)) this.panel.show(card.item);
    else this.panel.show(card.item, `LOCKED: ${c.price} COINS IN SHOP`, css(COLORS.red));
  }

  private pick(card: RosterCard) {
    const c = card.item.c!;
    this.showDetail(card);
    if (!this.owned.has(c.id)) { sfx.miss(); return; }
    const i = this.chosen.indexOf(c.id);
    if (i >= 0) this.chosen.splice(i, 1);
    else if (this.chosen.length < this.maxSquad) this.chosen.push(c.id);
    else { sfx.miss(); return; }
    sfx.select();
    Music.playCharacter(this, c.id);
    this.refresh();
  }

  private refresh() {
    for (const card of this.cards) {
      const id = card.item.c!.id;
      const n = this.chosen.indexOf(id);
      card.frame.setStrokeStyle(2, n >= 0 ? COLORS.pink : COLORS.border);
      card.frame.setFillStyle(n >= 0 ? 0x241430 : COLORS.panel, 0.95);
      if (!this.owned.has(id)) card.status.setText(`${card.item.c!.price}`).setColor(css(COLORS.gray));
      else card.status.setText(n >= 0 ? `#${n + 1}` : '').setColor(css(COLORS.gold));
    }
    this.countText.setText(`SET LIST ${this.chosen.length}/${this.maxSquad}`);
    this.startBtn.setEnabled(this.chosen.length > 0);
  }

  private start() {
    if (!this.chosen.length) return;
    SquadScene.lastSquad = [...this.chosen];
    this.scene.start('Mission', { squad: [...this.chosen], mission: this.mission });
  }
}
