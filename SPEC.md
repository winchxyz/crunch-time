# CRUNCH TIME — agent office visualizer

A local web app that shows Claude Code agents at work as a PS1-era low-poly pixel office:
the boss (main session) storms in and yells a task, workers (subagents) spawn at desks,
do their real tool calls as office actions, chat, and bring reports back.

No build step, no npm dependencies. Node 24 built-ins only on the server; Three.js from a CDN
(`https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js` via importmap) on the client.

## Layout (file ownership)

| Path | Owner |
|---|---|
| `server.mjs`, `hook/emit.mjs`, `install-hooks.mjs`, `lib/*.mjs`, `data/` | backend |
| `public/**` | frontend |
| `SPEC.md` | orchestrator (read-only for workers) |

Run: `node server.mjs` -> http://localhost:7777/ (serves `public/`).

## Event contract (the only coupling between backend and frontend)

Every event is one flat JSON object:

```json
{ "t": 1759150000000, "session": "abc123", "kind": "agent_tool",
  "agent": "toolu_01X", "name": "Survey hook docs", "type": "general-purpose",
  "tool": "WebSearch", "detail": "claude code hooks agent_id", "ok": true }
```

| kind | meaning | fields used |
|---|---|---|
| `boss_prompt` | user sent a prompt to the main session | `detail` = prompt, max 140 chars |
| `boss_tool` | main session used a non-Agent tool | `tool`, `detail` |
| `agent_spawn` | main session launched a subagent | `agent` (stable id), `name` (description), `type` (subagent_type), `detail` = prompt, max 200 chars |
| `agent_tool` | a subagent used a tool | `agent`, `tool`, `detail` |
| `agent_done` | subagent finished | `agent`, `ok`, `detail` = result, max 160 chars |
| `boss_idle` | main session turn ended (Stop hook) | — |

`agent` is always the id from `agent_spawn` (the Agent tool_use_id); the backend maps any internal
subagent ids onto it. `detail` is a short human string: WebSearch -> query, WebFetch -> hostname,
Read/Edit/Write -> file basename, Grep/Glob -> pattern, Bash -> its description or first 50 chars.
Unknown fields may be absent; the frontend must never crash on missing fields or unknown kinds/tools.

## HTTP API (server.mjs, port 7777)

- `GET /` and static files from `public/`
- `POST /event` — raw Claude Code hook payload (JSON body). Server normalizes to the contract,
  appends raw payload to `data/raw.jsonl`, broadcasts normalized events. Always 204.
- `GET /stream` — Server-Sent Events; each message `data: <event json>`. Heartbeat comment every 15 s.
- `GET /api/sessions` — recent sessions that contain subagent runs:
  `[{ "path": "...jsonl", "project": "C--Users-oxman", "mtime": 0, "agents": 3, "title": "first prompt…" }]`, newest first, max 40.
- `GET /api/replay?path=<abs path of a transcript .jsonl>` — `{ "events": [ ...contract events sorted by t ] }`.
  Only paths under `~/.claude/projects` are allowed.

## Frontend debug hooks

`window.CT = { feed(evt), demo(), clear(), state() }` — `feed` pushes one contract event into the
director, `demo()` plays the built-in scripted demo (`public/demo.json`), `state()` returns a small
JSON summary (agents, their current action, queue length).
