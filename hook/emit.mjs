// Claude Code hook: forward stdin JSON to the CRUNCH TIME server. Never fails, never prints.
let buf = '';
const done = () => process.exit(0);
setTimeout(done, 600).unref();
try {
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', c => { buf += c; });
  process.stdin.on('error', done);
  process.stdin.on('end', async () => {
    try {
      if (buf.trim()) {
        await fetch('http://127.0.0.1:7777/event', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: buf, signal: AbortSignal.timeout(400),
        }).catch(() => {});
      }
    } catch {}
    done();
  });
} catch { done(); }
