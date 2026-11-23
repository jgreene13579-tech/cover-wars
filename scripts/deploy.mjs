// Publishes dist/ to the gh-pages branch, which GitHub Pages serves.
// Run with: npm run deploy
import { execSync } from 'node:child_process';
import { mkdtempSync, cpSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sh = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit' });
const remote = execSync('git remote get-url origin').toString().trim();
const email = execSync('git config user.email').toString().trim();
const name = execSync('git config user.name').toString().trim();

const dir = mkdtempSync(join(tmpdir(), 'cover-wars-'));
cpSync('dist', dir, { recursive: true });
writeFileSync(join(dir, '.nojekyll'), '');
sh('git init -q -b gh-pages', dir);
sh(`git -c user.email="${email}" -c user.name="${name}" add -A`, dir);
sh(`git -c user.email="${email}" -c user.name="${name}" commit -q -m "Deploy"`, dir);
sh(`git push -f "${remote}" gh-pages`, dir);
rmSync(dir, { recursive: true, force: true });
console.log('Deployed. Live in a minute at https://jgreene13579-tech.github.io/cover-wars/');
