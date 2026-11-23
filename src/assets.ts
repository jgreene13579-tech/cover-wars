// Filled in by main.ts before the game starts: which optional band files
// (songs, logo, album art) are actually present in public/assets/.
export const available = {
  music: new Set<string>(), // character ids that have a song file
  logoFile: '' as string, // e.g. 'assets/art/logo.png'
  albumFile: '' as string,
};
