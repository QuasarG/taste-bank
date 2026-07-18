import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 4563;
const BASE = `http://127.0.0.1:${PORT}`;

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'stylelab-shot-'));
fs.mkdirSync(path.join(TMP, 'styles'), { recursive: true });
fs.cpSync(path.join(ROOT, 'tests', 'fixtures', 'styles', 'blueprint'), path.join(TMP, 'styles', 'blueprint'), { recursive: true });

let child: ChildProcess;

before(async () => {
  child = spawn(process.execPath, ['node_modules/astro/bin/astro.mjs', 'dev', '--port', String(PORT), '--host', '127.0.0.1'], {
    cwd: ROOT,
    env: { ...process.env, STYLE_LAB_DIR: TMP },
    stdio: 'ignore',
  });
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${BASE}/api/styles.json`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('dev server 启动超时');
});

after(() => {
  child.kill('SIGTERM');
  fs.rmSync(TMP, { recursive: true, force: true });
});

test('截图端点返回真实 PNG 且缓存复用', { timeout: 120_000 }, async () => {
  const res = await fetch(`${BASE}/api/styles/blueprint/screenshot.png`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /image\/png/);
  const buf = Buffer.from(await res.arrayBuffer());
  // PNG 魔数 + 最小体积，证明不是空图
  assert.deepEqual([...buf.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
  assert.ok(buf.length > 20_000, `截图体积异常小: ${buf.length}`);

  const cached = await fetch(`${BASE}/api/styles/blueprint/screenshot.png`);
  assert.equal(cached.status, 200);

  const ghost = await fetch(`${BASE}/api/styles/ghost/screenshot.png`);
  assert.equal(ghost.status, 404);
});
