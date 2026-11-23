import Phaser from 'phaser';
import { COLORS, GAME_W, css } from '../config';
import { CHARACTERS, COMING_SOON } from '../data/characters';
import { UPGRADES, UpgradeDef, addUpgradeLevel, upgradeLevel } from '../data/upgrades';
import { loadSave, writeSave } from '../save';
import { Button } from '../ui/Button';
import { txt } from '../ui/text';
import { DetailPanel, GRID_Y, PANEL_H, PANEL_W, PANEL_X, RosterCard, RosterItem, rosterGrid } from '../ui/Roster';
import { Music } from '../audio/Music';
import { sfx } from '../audio/Synth';
import { backdrop } from './backdrop';

type Tab = 'songs' | 'upgrades';

/** Spend coins on new song-characters, or on set-list upgrades for the whole band. */
export class ShopScene extends Phaser.Scene {
  private panel!: DetailPanel;
  private cards: RosterCard[] = [];
  private buyBtn!: Button;
  private current: RosterItem | null = null;

  constructor() { super('Shop'); }

  create(data: { show?: string; tab?: Tab }) {
    backdrop(this);
    const save = loadSave();
    const tab: Tab = data?.tab ?? 'songs';

    txt(this, GAME_W / 2, 6, 'MERCH TABLE', 16, css(COLORS.pink)).setOrigin(0.5, 0);
    this.add.image(14, 16, 'coin').setScale(2).setOrigin(0, 0.5);
    txt(this, 30, 12, `${save.coins}`, 8, css(COLORS.gold));
    new Button(this, GAME_W - 102, 8, 92, 22, 'BACK', () => this.scene.start('Title'));

    // tabs
    const songsTab = new Button(this, GAME_W / 2 - 124, 26, 120, 18, 'SONGS', () => tab !== 'songs' && this.scene.restart({ tab: 'songs' }));
    const upTab = new Button(this, GAME_W / 2 + 4, 26, 120, 18, 'SET LIST UPGRADES', () => tab !== 'upgrades' && this.scene.restart({ tab: 'upgrades' }));
    (tab === 'songs' ? songsTab : upTab).setActive2(true);

    new Button(this, GAME_W / 2 - 90, 318, 180, 28, 'PICK SET LIST', () => this.scene.start('Squad'), { fill: 0x5a1838, border: COLORS.pink });

    if (tab === 'upgrades') this.buildUpgrades();
    else this.buildSongs(data?.show);
    Music.menu(this);
  }

  // ---------------------------------------------------------------- songs

  private buildSongs(show?: string) {
    const save = loadSave();
    const items: RosterItem[] = [...CHARACTERS.map((c) => ({ c })), ...COMING_SOON.map((s) => ({ soon: s }))];
    this.panel = new DetailPanel(this);
    this.cards = rosterGrid(this, items, (it) => !!it.c && !save.unlocked.includes(it.c.id), (card) => {
      sfx.click();
      this.select(card.item);
    });
    for (const card of this.cards) {
      const c = card.item.c;
      if (!c) continue;
      if ((save.fallen ?? []).includes(c.id)) card.status.setText('FALLEN').setColor(css(COLORS.red));
      else if (save.unlocked.includes(c.id)) card.status.setText('OWNED').setColor(css(COLORS.green));
      else card.status.setText(`${c.price}`).setColor(css(save.coins >= c.price ? COLORS.gold : COLORS.gray));
    }
    this.buyBtn = new Button(this, PANEL_X + 12, GRID_Y + PANEL_H - 30, PANEL_W - 24, 22, 'BUY', () => this.buy(),
      { fill: 0x5a1838, border: COLORS.gold });
    // open on the requested song, else the cheapest one still locked
    const start = (show ? items.find((it) => it.c?.id === show) : undefined)
      ?? items.filter((it) => it.c && !save.unlocked.includes(it.c.id)).sort((a, b) => a.c!.price - b.c!.price)[0]
      ?? items[0];
    this.select(start);
  }

  private select(item: RosterItem) {
    this.current = item;
    const save = loadSave();
    for (const card of this.cards) card.frame.setStrokeStyle(2, card.item === item ? COLORS.cyan : COLORS.border);
    const c = item.c;
    if (!c) { this.panel.show(item); this.buyBtn.setVisible(false); return; }
    if ((save.fallen ?? []).includes(c.id)) {
      this.panel.show(item, 'FALLEN. GONE FOR GOOD THIS RUN.', css(COLORS.red));
      this.buyBtn.setVisible(false);
      return;
    }
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
    if (fresh.coins < c.price || fresh.unlocked.includes(c.id) || (fresh.fallen ?? []).includes(c.id)) return;
    fresh.coins -= c.price;
    fresh.unlocked.push(c.id);
    writeSave(fresh);
    sfx.buy();
    Music.playCharacter(this, c.id);
    this.scene.restart({ show: c.id });
  }

  // ---------------------------------------------------------------- upgrades

  private buildUpgrades() {
    const save = loadSave();
    // two columns of cards, read left to right
    const w = (GAME_W - 30) / 2;
    const rowH = 50;
    UPGRADES.forEach((u, i) => {
      const x = 10 + (i % 2) * (w + 10);
      const y = 50 + Math.floor(i / 2) * (rowH + 2);
      const lvl = upgradeLevel(save, u.id);
      const max = u.prices.length;
      const locked = !!u.requires && upgradeLevel(save, u.requires) === 0;
      const maxed = lvl >= max;
      const price = maxed ? 0 : u.prices[lvl];
      const top = u.id === 'ap';
      this.add.rectangle(x, y, w, rowH, top ? 0x2a1438 : COLORS.panel, 0.95).setOrigin(0)
        .setStrokeStyle(2, maxed ? COLORS.green : top ? COLORS.gold : COLORS.border);
      const name = txt(this, x + 8, y + 6, u.levelNames?.[Math.min(lvl, max - 1)] ?? u.name, 8, maxed ? css(COLORS.green) : top ? css(COLORS.gold) : '#ffffff');
      // level pips
      for (let k = 0; k < max; k++) {
        this.add.rectangle(x + 14 + name.width + k * 11, y + 6, 8, 8, k < lvl ? COLORS.cyan : 0x0b0710).setOrigin(0).setStrokeStyle(1, COLORS.border);
      }
      const room = w - 128;
      txt(this, x + 8, y + 20, locked ? `NEEDS ${this.nameOf(u.requires!)} FIRST. ${u.desc}` : u.desc, 8, css(COLORS.gray))
        .setScale(0.75).setWordWrapWidth(room / 0.75, true).setLineSpacing(3);

      const label = maxed ? 'OWNED' : locked ? 'LOCKED' : `${max > 1 ? `LV ${lvl + 1}: ` : ''}${price}`;
      const can = !maxed && !locked && save.coins >= price;
      const b = new Button(this, x + w - 112, y + 14, 104, 22, label, () => this.buyUpgrade(u),
        maxed ? {} : { fill: 0x5a1838, border: COLORS.gold });
      b.setEnabled(can);
    });
  }

  private nameOf(id: string) { return UPGRADES.find((u) => u.id === id)?.name ?? id; }

  private buyUpgrade(u: UpgradeDef) {
    const fresh = loadSave();
    const lvl = upgradeLevel(fresh, u.id);
    if (lvl >= u.prices.length) return;
    if (u.requires && upgradeLevel(fresh, u.requires) === 0) return;
    const price = u.prices[lvl];
    if (fresh.coins < price) return;
    fresh.coins -= price;
    addUpgradeLevel(fresh, u);
    writeSave(fresh);
    sfx.buy();
    this.cameras.main.flash(150, 255, 211, 79);
    this.scene.restart({ tab: 'upgrades' });
  }
}
