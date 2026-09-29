import path from 'node:path';
export const trunc = (s, n) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const base = p => { try { return path.basename(String(p).replace(/\\/g, '/')); } catch { return ''; } };
export function summarize(tool, inp) {
  inp = inp && typeof inp === 'object' ? inp : {};
  switch (tool) {
    case 'WebSearch': return trunc(inp.query, 60);
    case 'WebFetch': try { return new URL(inp.url).hostname; } catch { return trunc(inp.url, 50); }
    case 'Read': case 'Edit': case 'Write': case 'MultiEdit': case 'NotebookEdit': return base(inp.file_path || inp.notebook_path);
    case 'Grep': case 'Glob': return trunc(inp.pattern, 50);
    case 'Bash': return trunc(inp.description || inp.command, 50);
    default: return trunc(inp.description || inp.query || inp.pattern || inp.file_path || inp.command || inp.url || inp.prompt || '', 50);
  }
}
export function text(x) {
  if (x == null) return '';
  if (typeof x === 'string') return x;
  if (Array.isArray(x)) return x.map(text).filter(Boolean).join(' ');
  if (typeof x === 'object') {
    if (typeof x.text === 'string') return x.text;
    if (x.content != null) return text(x.content);
    if (x.result != null) return text(x.result);
    try { return JSON.stringify(x); } catch { return ''; }
  }
  return String(x);
}
export const isAgentTool = n => n === 'Agent' || n === 'Task';
const BLOCK = /<([a-z][a-z0-9]*(?:-[a-z0-9]+)+)(?:\s[^<>]*)?>[\s\S]*?<\/\1>/gi;
const TAG = /<\/?[a-z][a-z0-9]*(?:-[a-z0-9]+)+(?:\s[^<>]*)?\/?>/gi;
// strip harness tags (hyphenated pseudo-tags such as <system-reminder>, <command-name>, <task-notification>)
export const clean = s => String(s ?? '').replace(BLOCK, ' ').replace(TAG, ' ').replace(/\s+/g, ' ').trim();
export const isAsyncLaunch = t => /^\s*Async agent launched/i.test(t) || /async_launched/.test(t);
