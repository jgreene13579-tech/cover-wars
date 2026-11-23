import { CHARACTERS } from './data/characters';

export interface SaveData {
  coins: number;
  unlocked: string[];
  wins: number;
  cleared: number; // how many tour stops are done; the next one is unlocked
}

const KEY = 'mb-cover-wars-save-v1';

const defaults = (): SaveData => ({
  coins: 0,
  unlocked: CHARACTERS.filter((c) => c.startsUnlocked).map((c) => c.id),
  wins: 0,
  cleared: 0,
});

export function loadSave(): SaveData {
  let data = defaults();
  try {
    const raw = localStorage.getItem(KEY);
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
    localStorage.setItem(KEY, JSON.stringify(data));
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
