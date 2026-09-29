// node install-hooks.mjs [--global] [--uninstall] [--file <path>]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)).replace(/\\/g, '/');
const args = process.argv.slice(2);
const fi = args.indexOf('--file');
const file = fi >= 0 ? path.resolve(args[fi + 1]) :
  args.includes('--global') ? path.join(os.homedir(), '.claude', 'settings.json') : path.join(here, '.claude', 'settings.json');
const uninstall = args.includes('--uninstall');
const TAG = 'hook/emit.mjs';
const command = `node "${here}/${TAG}"`;
const EVENTS = { UserPromptSubmit: null, PreToolUse: '*', PostToolUse: '*', SubagentStart: null, SubagentStop: null, Stop: null };
const isOurs = h => typeof h?.command === 'string' && h.command.includes(TAG);

let settings = {};
if (fs.existsSync(file)) {
  const raw = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  if (raw.trim()) settings = JSON.parse(raw);
  fs.copyFileSync(file, `${file}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`);
} else if (uninstall) { console.log('nothing to do: ' + file); process.exit(0); }

settings.hooks ??= {};
// strip ours first (idempotent), then add unless uninstalling
for (const ev of Object.keys(settings.hooks)) {
  const groups = (settings.hooks[ev] || []).map(g => ({ ...g, hooks: (g.hooks || []).filter(h => !isOurs(h)) })).filter(g => g.hooks.length);
  if (groups.length) settings.hooks[ev] = groups; else delete settings.hooks[ev];
}
if (!uninstall) {
  for (const [ev, matcher] of Object.entries(EVENTS)) {
    const g = { hooks: [{ type: 'command', command }] };
    if (matcher) g.matcher = matcher;
    (settings.hooks[ev] ??= []).push(g);
  }
}
if (!Object.keys(settings.hooks).length) delete settings.hooks;
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(settings, null, 2) + '\n', 'utf8');
console.log(`${uninstall ? 'removed from' : 'installed into'} ${file}`);
