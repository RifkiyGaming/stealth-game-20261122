// Shadow Veil — a top-down stealth game for best-stealth-game-20261121-1759 (Node 22, standard
// library only). The player sneaks through 3 hand-built levels, staying out of the guards' vision
// cones, ducking behind cover (crates, walls, tall grass) to break line of sight, and reaching the
// exit without being spotted. Spotted guards raise the alarm and chase; slipping away lets the
// alert cool down. The game itself is this directory's game/ folder, plain static files a desktop
// browser loads offline (game/index.html and its ES modules, no library and no network request),
// and this program hands it in. It copies game/ and screenshots/ from beside this file to /output
// and writes /output/dossier.json, the summary the judge reads, with the vendored make.fun
// library. Before copying it runs a pre-flight check of the entry (game entry point present,
// 3–4 screenshots inside the size cap, game/ inside the file-count and byte caps) and refuses to
// hand in a broken entry instead of letting the scorer reject it later.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps (reference/gate.json), checked here up front so a bad entry fails loudly
// with a named reason instead of travelling to the scorer: at most 4 screenshots, each at most
// 256 KiB; at most 993 files in game/ totalling at most 48 MiB.
const MAX_SCREENSHOTS = 4;
const MIN_SCREENSHOTS = 3;
const MAX_SCREENSHOT_BYTES = 262144; // 256 KiB
const MAX_GAME_FILES = 993;
const MAX_GAME_BYTES = 50331648; // 48 MiB

function fail(message: string): never {
  console.error(`error: pre-flight check failed — ${message}`);
  process.exit(1);
}

// Walk a directory tree and return every file under it, with its size in bytes.
function walkFiles(dir: string, out: { path: string; bytes: number }[] = []): { path: string; bytes: number }[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(path, out);
    else if (entry.isFile()) out.push({ path, bytes: statSync(path).size });
  }
  return out;
}

// --- Pre-flight validation (runs before anything is copied) ---

// 1. The game must have an entry point the browser can load.
if (!existsSync(join(here, 'game', 'index.html'))) {
  fail('game/index.html is missing — the game has no entry point to load');
}

// 2. Screenshots: 3–4 files, each a JPEG or PNG of at most 256 KiB (the first by name is the cover).
const shotsDir = join(here, 'screenshots');
if (!existsSync(shotsDir)) fail('screenshots/ is missing — expected 3–4 screenshot files');
const shotNames = readdirSync(shotsDir).filter((name) => statSync(join(shotsDir, name)).isFile());
if (shotNames.length < MIN_SCREENSHOTS || shotNames.length > MAX_SCREENSHOTS) {
  fail(`screenshots/ holds ${shotNames.length} file(s) [${shotNames.join(', ')}], expected ${MIN_SCREENSHOTS}–${MAX_SCREENSHOTS}`);
}
let shotBytes = 0;
for (const name of shotNames) {
  const path = join(shotsDir, name);
  const lower = name.toLowerCase();
  if (!lower.endsWith('.jpg') && !lower.endsWith('.jpeg') && !lower.endsWith('.png')) {
    fail(`screenshot ${name} is not a .jpg/.jpeg/.png file`);
  }
  const size = statSync(path).size;
  if (size > MAX_SCREENSHOT_BYTES) {
    fail(`screenshot ${name} is ${size} bytes, over the 256 KiB (${MAX_SCREENSHOT_BYTES} bytes) cap`);
  }
  shotBytes += size;
}

// 3. The game bundle must stay inside the scorer's file-count and byte caps.
const gameFiles = walkFiles(join(here, 'game'));
const gameBytes = gameFiles.reduce((sum, file) => sum + file.bytes, 0);
if (gameFiles.length > MAX_GAME_FILES) {
  fail(`game/ holds ${gameFiles.length} files, over the ${MAX_GAME_FILES}-file cap`);
}
if (gameBytes > MAX_GAME_BYTES) {
  fail(`game/ totals ${gameBytes} bytes, over the 48 MiB (${MAX_GAME_BYTES} bytes) cap`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);

console.log(
  `Shadow Veil handed in: ${gameFiles.length} game file(s) (${gameBytes} bytes), ` +
  `${shotNames.length} screenshot(s) (${shotBytes} bytes), dossier.json (${dossier.length} bytes) -> ${out}`,
);
