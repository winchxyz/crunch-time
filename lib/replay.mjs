import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';
import { trunc, summarize, text, isAgentTool, clean, isAsyncLaunch } from './detail.mjs';

export const PROJECTS = path.join(os.homedir(), '.claude', 'projects');

async function* lines(file) {
  const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const l of rl) {
    if (!l) continue;
    try { yield JSON.parse(l); } catch { /* skip bad line */ }
  }
}
const ts = e => { const n = Date.parse(e.timestamp); return Number.isFinite(n) ? n : 0; };
const blocks = e => Array.isArray(e?.message?.content) ? e.message.content : [];

// real user prompt text, or '' (tool results, meta, system-injected wrappers)
export function promptText(e) {
  if (e.type !== 'user' || e.isMeta || e.isSidechain) return '';
  const c = e.message?.content;
  let s = typeof c === 'string' ? c : Array.isArray(c) ? (c.some(b => b.type === 'tool_result') ? '' : c.filter(b => b.type === 'text').map(b => b.text).join(' ')) : '';
  s = clean(s);
  if (!s || s.startsWith('[Request interrupted')) return '';
  return s;
}

export async function replay(file) {
  const events = [];
  let session = path.basename(file, '.jsonl');
  const isAsync = (id, txt) => { if (!isAsyncLaunch(txt)) return false; const m = txt.match(/agentId:\s*(\w+)/); if (m) tasks.set(m[1], id); return true; };
  const spawns = new Map(), notes = new Map(), tasks = new Map();
  for await (const e of lines(file)) {
    if (e.sessionId) session = e.sessionId;
    const t = ts(e); if (!t) continue;
    const raw = typeof e.content === 'string' ? e.content : typeof e.message?.content === 'string' ? e.message.content : Array.isArray(e.message?.content) ? e.message.content.filter(b => b.type === 'text').map(b => b.text).join(' ') : '';
    if (raw.includes('<task-notification>')) {
      const g = k => (raw.match(new RegExp('<' + k + '>([\\s\\S]*?)</' + k + '>')) || [])[1] || '';
      const id = tasks.get(g('task-id').trim()) || g('tool-use-id').trim(), st = g('status').trim();
      const key = id + st;
      if (id && st && !(notes.get(key) > t - 30000)) { notes.set(key, t); events.push({ t, session, kind: 'agent_done', agent: id, ok: st === 'completed', detail: trunc(clean(g('summary')), 160) }); }
      continue;
    }
    const p = promptText(e);
    if (p) { events.push({ t, session, kind: 'boss_prompt', detail: trunc(p, 140) }); continue; }
    if (e.isSidechain) continue;
    for (const b of blocks(e)) {
      if (e.type === 'assistant' && b.type === 'tool_use') {
        const inp = b.input || {};
        if (isAgentTool(b.name)) {
          spawns.set(b.id, { name: trunc(inp.description, 60), type: inp.subagent_type });
          events.push({ t, session, kind: 'agent_spawn', agent: b.id, name: trunc(inp.description, 60), type: inp.subagent_type, detail: trunc(inp.prompt, 200) });
        } else events.push({ t, session, kind: 'boss_tool', tool: b.name, detail: summarize(b.name, inp) });
      } else if (e.type === 'user' && b.type === 'tool_result' && spawns.has(b.tool_use_id) && !(isAsync(b.tool_use_id, text(b.content)))) {
        events.push({ t, session, kind: 'agent_done', agent: b.tool_use_id, ok: !b.is_error, detail: trunc(text(b.content), 160) });
      }
    }
  }
  // subagent transcripts: <session>/subagents/agent-*.jsonl (+ .meta.json with toolUseId)
  const dir = path.join(path.dirname(file), path.basename(file, '.jsonl'), 'subagents');
  let names = [];
  try { names = (await fsp.readdir(dir)).filter(n => /^agent-.*\.jsonl$/.test(n)); } catch {}
  for (const n of names) {
    let meta = {};
    try { meta = JSON.parse(await fsp.readFile(path.join(dir, n.replace(/\.jsonl$/, '.meta.json')), 'utf8')); } catch {}
    const id = meta.toolUseId;
    if (!id || !spawns.has(id)) continue;
    const type = meta.agentType;
    for await (const e of lines(path.join(dir, n))) {
      const t = ts(e); if (!t || e.type !== 'assistant') continue;
      for (const b of blocks(e)) if (b.type === 'tool_use') events.push({ t, session, kind: 'agent_tool', agent: id, name: spawns.get(id).name, type, tool: b.name, detail: summarize(b.name, b.input) });
    }
  }
  events.sort((a, b) => a.t - b.t);
  const out = [], done = new Set();
  for (const e of events) {
    if (e.kind === 'agent_done') done.add(e.agent);
    else if (e.kind === 'agent_spawn') done.delete(e.agent);
    else if (e.kind === 'agent_tool' && done.has(e.agent)) {
      done.delete(e.agent);
      out.push({ t: e.t - 1, session, kind: 'agent_spawn', agent: e.agent, name: e.name, type: e.type, detail: 'resumed' });
    }
    out.push(e);
  }
  return out;
}

const cache = new Map(); // path -> {mtime, info|null}
const SPAWN_RE = /"type":"tool_use","id":"[^"]*","name":"(?:Agent|Task)"/g;

async function inspect(file, mtime) {
  const c = cache.get(file);
  if (c && c.mtime === mtime) return c.info;
  let info = null;
  try {
    const raw = await fsp.readFile(file, 'utf8');
    const agents = (raw.match(SPAWN_RE) || []).length;
    if (agents) {
      let title = '';
      let pos = 0, n = 0;
      while (pos < raw.length && !title && n++ < 400) {
        let end = raw.indexOf('\n', pos); if (end < 0) end = raw.length;
        try { title = promptText(JSON.parse(raw.slice(pos, end))); } catch {}
        pos = end + 1;
      }
      info = { agents, title: trunc(title, 80) };
    }
  } catch {}
  cache.set(file, { mtime, info });
  return info;
}

export async function listSessions(max = 40) {
  const cands = [];
  let projects = [];
  try { projects = await fsp.readdir(PROJECTS); } catch { return []; }
  for (const pr of projects) {
    let fs_ = [];
    try { fs_ = await fsp.readdir(path.join(PROJECTS, pr)); } catch { continue; }
    for (const f of fs_) {
      if (!f.endsWith('.jsonl')) continue;
      const p = path.join(PROJECTS, pr, f);
      try { cands.push({ path: p, project: pr, mtime: (await fsp.stat(p)).mtimeMs }); } catch {}
    }
  }
  cands.sort((a, b) => b.mtime - a.mtime);
  const out = [];
  for (const c of cands.slice(0, 300)) {
    const info = await inspect(c.path, c.mtime);
    if (info) out.push({ path: c.path, project: c.project, mtime: c.mtime, ...info });
    if (out.length >= max) break;
  }
  return out;
}
