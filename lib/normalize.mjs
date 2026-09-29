import { trunc, summarize, text, isAgentTool, clean, isAsyncLaunch } from './detail.mjs';

const spawns = new Map();   // tool_use_id -> {session, type, bound}
const bindings = new Map(); // subagent id -> spawn tool_use_id
const prune = () => {
  if (spawns.size > 500) for (const k of [...spawns.keys()].slice(0, 200)) spawns.delete(k);
  if (bindings.size > 1000) for (const k of [...bindings.keys()].slice(0, 400)) bindings.delete(k);
};

function bind(session, agentId, type) {
  if (bindings.has(agentId)) return bindings.get(agentId);
  for (const [id, s] of spawns) {
    if (s.session === session && !s.bound && (!type || !s.type || s.type === type)) {
      s.bound = true; bindings.set(agentId, id); return id;
    }
  }
  return null;
}

export function normalize(p) {
  try {
    if (!p || typeof p !== 'object') return [];
    const t = Date.now(), session = p.session_id, ev = p.hook_event_name;
    const base = { t, session };
    switch (ev) {
      case 'UserPromptSubmit': { const d = clean(p.prompt); return d ? [{ ...base, kind: 'boss_prompt', detail: trunc(d, 140) }] : []; }
      case 'Stop': return [{ ...base, kind: 'boss_idle' }];
      case 'SubagentStart': if (p.agent_id) bind(session, p.agent_id, p.agent_type); return [];
      case 'SubagentStop': {
        const id = p.agent_id && bind(session, p.agent_id, p.agent_type);
        const s = id && spawns.get(id);
        if (!s || s.done) return [];
        s.done = true;
        return [{ ...base, kind: 'agent_done', agent: id, ok: true, detail: trunc(clean(p.last_assistant_message), 160) }];
      }
      case 'PreToolUse': case 'PostToolUse': {
        const tool = p.tool_name, inp = p.tool_input || {};
        if (p.agent_id) { // tool call inside a subagent
          if (ev !== 'PreToolUse') return [];
          const id = bind(session, p.agent_id, p.agent_type);
          if (!id) return [];
          const s = spawns.get(id), out = [];
          if (s.done) { s.done = false; out.push({ ...base, kind: 'agent_spawn', agent: id, name: s.name, type: s.type, detail: 'resumed' }); }
          out.push({ ...base, kind: 'agent_tool', agent: id, name: s.name, type: s.type, tool, detail: summarize(tool, inp) });
          return out;
        }
        if (isAgentTool(tool)) {
          const id = p.tool_use_id; if (!id) return [];
          if (ev === 'PreToolUse') {
            spawns.set(id, { session, type: inp.subagent_type, name: trunc(inp.description, 60), bound: false }); prune();
            return [{ ...base, kind: 'agent_spawn', agent: id, name: trunc(inp.description, 60), type: inp.subagent_type, detail: trunc(inp.prompt, 200) }];
          }
          const r = p.tool_response, txt = text(r), s = spawns.get(id);
          if (isAsyncLaunch(txt) || (r && typeof r === 'object' && (r.isAsync || r.status === 'async_launched'))) return [];
          if (!s || s.done) return [];
          s.done = true;
          const bad = (r && typeof r === 'object' && (r.error === true || r.is_error === true || r.isError === true)) || /^\s*(error|api error)/i.test(txt);
          return [{ ...base, kind: 'agent_done', agent: id, ok: !bad, detail: trunc(clean(txt), 160) }];
        }
        if (ev === 'PreToolUse') return [{ ...base, kind: 'boss_tool', tool, detail: summarize(tool, inp) }];
        return [];
      }
      default: return [];
    }
  } catch { return []; }
}
