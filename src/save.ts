import { CHARACTERS } from './data/characters';
import { freshProgress, type CharProgress } from './data/progress';

export interface SaveData {
  coins: number;
  unlocked: string[];
  wins: number;
  cleared: number; // how many tour stops are done; the next one is unlocked
  progress: Record<string, CharProgress>; // XP, level and level-up picks per song
  upgrades: Record<string, number>; // set-list upgrades bought at the merch table (id -> level)
  fallen: string[]; // hardcore: songs knocked out for good this run
}

const KEY = 'mb-cover-wars-save-v1';
const HARDCORE_KEY = 'mb-cover-wars-hardcore-v1';
const MODE_KEY = 'mb-cover-wars-mode';

export type Mode = 'normal' | 'hardcore';
/** Normal and hardcore runs keep separate saves; this is the one being played. */
export function getMode(): Mode {
  try { return localStorage.getItem(MODE_KEY) === 'hardcore' ? 'hardcore' : 'normal'; } catch { return 'normal'; }
}
export function setMode(m: Mode) {
  try { localStorage.setItem(MODE_KEY, m); } catch { /* ignore */ }
}
export const isHardcore = () => getMode() === 'hardcore';
/** Hardcore pays this much more per show. */
export const HARDCORE_COIN_BONUS = 0.3;
/** Wipes the hardcore run so a new one can start. */
export function resetHardcore() {
  try { localStorage.removeItem(HARDCORE_KEY); } catch { /* ignore */ }
}
const saveKey = () => (isHardcore() ? HARDCORE_KEY : KEY);

const defaults = (): SaveData => ({
  coins: 0,
  unlocked: CHARACTERS.filter((c) => c.startsUnlocked).map((c) => c.id),
  wins: 0,
  cleared: 0,
  progress: {},
  upgrades: {},
  fallen: [],
});

export function loadSave(): SaveData {
  let data = defaults();
  try {
    const raw = localStorage.getItem(saveKey());
    if (raw) data = { ...data, ...(JSON.parse(raw) as Partial<SaveData>) };
  } catch {
    /* private mode / blocked storage: play without saving */
  }
  // Dev/test toggle: add ?unlockall to the URL to try every character and venue.
  if (new URLSearchParams(location.search).has('unlockall')) {
    data.unlocked = CHARACTERS.map((c) => c.id);
    data.cleared = Math.max(data.cleared, 99);
  }
  return data;
}

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(saveKey(), JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

const SEEN_KEY = 'mb-cover-wars-seen-v1';

/** Characters whose intro card has already been shown (band ids and enemy ids). */
export function loadSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

export function markSeen(ids: string[]) {
  const seen = loadSeen();
  for (const id of ids) seen.add(id);
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    /* ignore */
  }
}

/** A song's progress record (created on first use). */
export function progressFor(save: SaveData, id: string): CharProgress {
  return (save.progress[id] ??= freshProgress());
}

/** Songs with level-ups still waiting for a stat pick. */
export function pendingLevelUps(save: SaveData): string[] {
  return Object.entries(save.progress).filter(([, p]) => p.picks > 0).map(([id]) => id);
}
