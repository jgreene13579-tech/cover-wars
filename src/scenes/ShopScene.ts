import Phaser from 'phaser';
import { COLORS, GAME_W, css } from '../config';
import { CHARACTERS, COMING_SOON } from '../data/characters';
import { loadSave, writeSave } from '../save';
import { Button } from '../ui/Button';
import { txt } from '../ui/text';
import { DetailPanel, GRID_Y, PANEL_H, PANEL_W, PANEL_X, RosterCard, RosterItem, rosterGrid } from '../ui/Roster';
import { Music } from '../audio/Music';
import { sfx } from '../audio/Synth';
import { backdrop } from './backdrop';

/** Spend coins on new song-characters. Songs without a character yet are "coming soon". */
export class ShopScene extends Phaser.Scene {
  private panel!: DetailPanel;
  private cards: RosterCard[] = [];
  private buyBtn!: Button;
  private coinText!: Phaser.GameObjects.Text;
  private current: RosterItem | null = null;

  constructor() { super('Shop'); }

  create(data: { show?: string }) {
    backdrop(this);
    const save = loadSave();

    txt(this, GAME_W / 2, 10, 'MERCH TABLE', 16, css(COLORS.pink)).setOrigin(0.5, 0);
    txt(this, GAME_W / 2, 31, 'UNLOCK SONGS FROM BOTH ALBUMS', 8, css(COLORS.gray)).setOrigin(0.5, 0);
    this.add.image(14, 16, 'coin').setScale(2).setOrigin(0, 0.5);
    this.coinText = txt(this, 30, 12, `${save.coins}`, 8, css(COLORS.gold));

    const items: RosterItem[] = [...CHARACTERS.map((c) => ({ c })), ...COMING_SOON.map((s) => ({ soon: s }))];
    this.panel = new DetailPanel(this);
    this.cards = rosterGrid(this, items, (it) => !!it.c && !save.unlocked.includes(it.c.id), (card) => {
      sfx.click();
      this.select(card.item);
    });
    for (const card of this.cards) {
      const c = card.item.c;
      if (!c) continue;
      if (save.unlocked.includes(c.id)) card.status.setText('OWNED').setColor(css(COLORS.green));
      else card.status.setText(`${c.price}`).setColor(css(save.coins >= c.price ? COLORS.gold : COLORS.gray));
    }

    this.buyBtn = new Button(this, PANEL_X + 12, GRID_Y + PANEL_H - 30, PANEL_W - 24, 22, 'BUY', () => this.buy(),
      { fill: 0x5a1838, border: COLORS.gold });

    new Button(this, GAME_W - 102, 8, 92, 22, 'BACK', () => this.scene.start('Title'));
    new Button(this, GAME_W / 2 - 90, 318, 180, 28, 'PICK SET LIST', () => this.scene.start('Squad'), { fill: 0x5a1838, border: COLORS.pink });

    // open on the requested song, else the cheapest one still locked
    const start = (data?.show ? items.find((it) => it.c?.id === data.show) : undefined)
      ?? items.filter((it) => it.c && !save.unlocked.includes(it.c.id)).sort((a, b) => a.c!.price - b.c!.price)[0]
      ?? items[0];
    this.select(start);
    Music.menu(this);
  }

  private select(item: RosterItem) {
    this.current = item;
    const save = loadSave();
    for (const card of this.cards) card.frame.setStrokeStyle(2, card.item === item ? COLORS.cyan : COLORS.border);
    const c = item.c;
    if (!c) { this.panel.show(item); this.buyBtn.setVisible(false); return; }
    const owned = save.unlocked.includes(c.id);
    if (owned) {
      this.panel.show(item, 'ON THE SET LIST', css(COLORS.green));
      this.buyBtn.setVisible(false);
      return;
    }
    const can = save.coins >= c.price;
    this.panel.show(item, can ? '' : `NEED ${c.price - save.coins} MORE COINS`, css(COLORS.gray));
    this.buyBtn.setVisible(true).setText(`BUY FOR ${c.price}`).setEnabled(can);
  }

  private buy() {
    const c = this.current?.c;
    if (!c) return;
    const fresh = loadSave();
    if (fresh.coins < c.price || fresh.unlocked.includes(c.id)) return;
    fresh.coins -= c.price;
    fresh.unlocked.push(c.id);
    writeSave(fresh);
    sfx.buy();
    Music.playCharacter(this, c.id);
    this.scene.restart({ show: c.id });
  }
}
