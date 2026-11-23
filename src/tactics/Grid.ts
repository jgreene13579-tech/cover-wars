export type TileType =
  | 'floor' | 'floor2' | 'stage' | 'mat' | 'rubble'
  | 'wall' | 'neon'
  | 'table' | 'stool' | 'crate' | 'bar' | 'amp'
  | 'bush' | 'tree' | 'fence' | 'couch' | 'bleacher' | 'post' | 'rope' | 'ropev'
  | 'pillar' | 'keg' | 'grill' | 'fountain' | 'bench' | 'arcade' | 'shroom'
  | 'folding' | 'chair' | 'podium' | 'flag'
  | 'cooler' | 'flipchair' | 'pong' | 'trash' | 'barricade';

export interface Pos { x: number; y: number }
export interface ReachNode { x: number; y: number; cost: number; prev: string | null }

export const key = (x: number, y: number) => `${x},${y}`;
export const dist = (a: Pos, b: Pos) => Math.hypot(a.x - b.x, a.y - b.y);
const cheb = (a: Pos, b: Pos) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

interface TileInfo { walk: boolean; cover: 0 | 1 | 2; destructible: boolean }
export const TILE_INFO: Record<TileType, TileInfo> = {
  floor: { walk: true, cover: 0, destructible: false },
  floor2: { walk: true, cover: 0, destructible: false },
  stage: { walk: true, cover: 0, destructible: false },
  mat: { walk: true, cover: 0, destructible: false },
  rubble: { walk: true, cover: 0, destructible: false },
  bush: { walk: false, cover: 1, destructible: true },
  tree: { walk: false, cover: 2, destructible: false },
  fence: { walk: false, cover: 1, destructible: true },
  couch: { walk: false, cover: 1, destructible: true },
  bleacher: { walk: false, cover: 1, destructible: false },
  post: { walk: false, cover: 2, destructible: false },
  rope: { walk: false, cover: 1, destructible: false },
  ropev: { walk: false, cover: 1, destructible: false },
  pillar: { walk: false, cover: 2, destructible: false },
  keg: { walk: false, cover: 1, destructible: true },
  grill: { walk: false, cover: 1, destructible: true },
  fountain: { walk: false, cover: 2, destructible: false },
  bench: { walk: false, cover: 1, destructible: true },
  arcade: { walk: false, cover: 2, destructible: true },
  shroom: { walk: false, cover: 1, destructible: true },
  folding: { walk: false, cover: 1, destructible: true },
  chair: { walk: false, cover: 1, destructible: true },
  podium: { walk: false, cover: 2, destructible: true },
  flag: { walk: false, cover: 1, destructible: true },
  cooler: { walk: false, cover: 1, destructible: true },
  flipchair: { walk: false, cover: 1, destructible: true },
  pong: { walk: false, cover: 1, destructible: true },
  trash: { walk: false, cover: 1, destructible: true },
  barricade: { walk: false, cover: 2, destructible: true }, // Indy Blvd's deployable cover
  wall: { walk: false, cover: 2, destructible: false },
  neon: { walk: false, cover: 2, destructible: false },
  table: { walk: false, cover: 1, destructible: true },
  stool: { walk: false, cover: 1, destructible: true },
  crate: { walk: false, cover: 1, destructible: true },
  bar: { walk: false, cover: 2, destructible: true },
  amp: { walk: false, cover: 2, destructible: true },
};

const DIRS: Pos[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

export class Grid {
  constructor(public tiles: TileType[][]) {}

  get rows() { return this.tiles.length; }
  get cols() { return this.tiles[0].length; }

  inBounds(x: number, y: number) { return x >= 0 && y >= 0 && x < this.cols && y < this.rows; }
  get(x: number, y: number): TileType | null { return this.inBounds(x, y) ? this.tiles[y][x] : null; }
  set(x: number, y: number, t: TileType) { if (this.inBounds(x, y)) this.tiles[y][x] = t; }
  walkable(x: number, y: number) { const t = this.get(x, y); return !!t && TILE_INFO[t].walk; }
  cover(x: number, y: number): 0 | 1 | 2 { const t = this.get(x, y); return t ? TILE_INFO[t].cover : 0; }
  destructible(x: number, y: number) { const t = this.get(x, y); return !!t && TILE_INFO[t].destructible; }
  /** Standing right behind one of Indy Blvd's barriers (any side). */
  besideBarricade(p: Pos) { return DIRS.some((d) => this.get(p.x + d.x, p.y + d.y) === 'barricade'); }
  isWall(x: number, y: number) { const t = this.get(x, y); return t === 'wall' || t === 'neon'; }

  /** Breadth-first search over 4-way moves. Includes the start tile at cost 0. */
  reachable(from: Pos, maxCost: number, occupied: Set<string>): Map<string, ReachNode> {
    const out = new Map<string, ReachNode>();
    out.set(key(from.x, from.y), { x: from.x, y: from.y, cost: 0, prev: null });
    const queue: ReachNode[] = [out.get(key(from.x, from.y))!];
    while (queue.length) {
      const n = queue.shift()!;
      if (n.cost >= maxCost) continue;
      for (const d of DIRS) {
        const nx = n.x + d.x, ny = n.y + d.y, k = key(nx, ny);
        if (out.has(k) || !this.walkable(nx, ny) || occupied.has(k)) continue;
        const node = { x: nx, y: ny, cost: n.cost + 1, prev: key(n.x, n.y) };
        out.set(k, node);
        queue.push(node);
      }
    }
    return out;
  }

  /** Path from the reach origin to `to`, excluding the start tile. */
  pathTo(reach: Map<string, ReachNode>, to: Pos): Pos[] {
    const path: Pos[] = [];
    let n = reach.get(key(to.x, to.y));
    while (n && n.prev !== null) {
      path.push({ x: n.x, y: n.y });
      n = reach.get(n.prev);
    }
    return path.reverse();
  }

  /**
   * Line of sight between tile centres. Walls always block. Full cover blocks
   * unless it is right next to the shooter or the target (you can lean out
   * from behind the bar, and be shot leaning out).
   */
  los(a: Pos, b: Pos): boolean {
    const steps = Math.ceil(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) * 4);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const cx = Math.floor(a.x + 0.5 + (b.x - a.x) * t);
      const cy = Math.floor(a.y + 0.5 + (b.y - a.y) * t);
      if ((cx === a.x && cy === a.y) || (cx === b.x && cy === b.y)) continue;
      if (this.isWall(cx, cy)) return false;
      const c = { x: cx, y: cy };
      if (this.cover(cx, cy) === 2 && cheb(c, a) > 1 && cheb(c, b) > 1) return false;
    }
    return true;
  }

  /** Cover the target tile gets against a shooter standing at `shooter`. */
  coverAgainst(target: Pos, shooter: Pos): { cover: 0 | 1 | 2; any: boolean; barricade: boolean } {
    let best: 0 | 1 | 2 = 0;
    let any = false;
    let barricade = false; // Indy Blvd's steel barrier is between them
    for (const d of DIRS) {
      const c = this.cover(target.x + d.x, target.y + d.y);
      if (!c) continue;
      any = true;
      const dot = (shooter.x - target.x) * d.x + (shooter.y - target.y) * d.y;
      if (dot > 0 && c > best) best = c;
      if (dot > 0 && this.get(target.x + d.x, target.y + d.y) === 'barricade') barricade = true;
    }
    return { cover: best, any, barricade };
  }

  /** Cover pieces around a tile, for drawing shield icons. */
  coverAround(p: Pos): { dir: Pos; cover: 1 | 2 }[] {
    const out: { dir: Pos; cover: 1 | 2 }[] = [];
    for (const d of DIRS) {
      const c = this.cover(p.x + d.x, p.y + d.y);
      if (c) out.push({ dir: d, cover: c });
    }
    return out;
  }
}
