import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 4565;
const BASE = `http://127.0.0.1:${PORT}`;
const TOKEN = 'test-token';

// 临时存储：pending 里播种 alpha/beta 两个包（meta.slug 同步改写）
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'stylelab-admin-'));
fs.mkdirSync(path.join(TMP, 'styles'), { recursive: true });
const FIXTURE = path.join(ROOT, 'tests', 'fixtures', 'styles', 'blueprint');
for (const slug of ['alpha', 'beta']) {
  const dir = path.join(TMP, 'data', 'pending', slug);
  fs.cpSync(FIXTURE, dir, { recursive: true });
  const metaPath = path.join(dir, 'meta.json');
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  meta.slug = slug;
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf8');
}

let child: ChildProcess;

before(async () => {
  child = spawn(process.execPath, ['node_modules/astro/bin/astro.mjs', 'dev', '--port', String(PORT), '--host', '127.0.0.1'], {
    cwd: ROOT,
    env: { ...process.env, STYLE_LAB_DIR: TMP, STYLE_LAB_ADMIN_TOKEN: TOKEN },
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

async function login(): Promise<string> {
  const res = await fetch(`${BASE}/api/admin/session.json`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: TOKEN }),
  });
  assert.equal(res.status, 200);
  const cookie = (res.headers.get('set-cookie') ?? '').split(';')[0];
  assert.ok(cookie.startsWith('sl_admin='), `缺少 sl_admin cookie: ${cookie}`);
  return cookie;
}

test('无口令一律 403', async () => {
  assert.equal((await fetch(`${BASE}/api/admin/pending.json`)).status, 403);
  assert.equal((await fetch(`${BASE}/api/admin/session.json`)).status, 403);
  assert.equal((await fetch(`${BASE}/pending/alpha/template.html`)).status, 403);
  assert.equal(
    (await fetch(`${BASE}/api/admin/session.json`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'wrong' }),
    })).status,
    403,
  );
});

test('登录 → Cookie → 列表 / 详情 / 预览', async () => {
  const cookie = await login();
  const auth = { headers: { cookie } };

  const list = await (await fetch(`${BASE}/api/admin/pending.json`, auth)).json();
  assert.equal(list.count, 2);
  assert.ok(list.pending.some((p: { slug: string }) => p.slug === 'alpha'));

  const detail = await (await fetch(`${BASE}/api/admin/pending/alpha.json`, auth)).json();
  assert.equal(detail.meta.slug, 'alpha');
  assert.ok(detail.files.includes('templates/page.html'));
  assert.ok(detail.skill.length >= 50);

  const preview = await fetch(`${BASE}/pending/alpha/template.html`, auth);
  assert.equal(preview.status, 200);
  assert.match(preview.headers.get('content-security-policy') ?? '', /default-src 'none'/);
});

test('approve 后公开可见，reject 后消失', async () => {
  const cookie = await login();
  const auth = { headers: { cookie, 'content-type': 'application/json' } };

  assert.equal((await fetch(`${BASE}/api/admin/pending/alpha/approve.json`, { method: 'POST', ...auth })).status, 200);
  assert.equal((await fetch(`${BASE}/api/styles/alpha.json`)).status, 200);

  assert.equal((await fetch(`${BASE}/api/admin/pending/beta/reject.json`, { method: 'POST', ...auth })).status, 200);
  const left = await (await fetch(`${BASE}/api/admin/pending.json`, auth)).json();
  assert.equal(left.count, 0);

  assert.equal((await fetch(`${BASE}/api/admin/pending/ghost/approve.json`, { method: 'POST', ...auth })).status, 404);
});

test('下架：archive 后公开不可见，归入 data/archived，无口令 403', async () => {
  const auth = { headers: { cookie: await login(), 'content-type': 'application/json' } };

  // 无口令 → 403
  assert.equal((await fetch(`${BASE}/api/admin/styles/alpha/archive.json`, { method: 'POST', headers: { 'content-type': 'application/json' } })).status, 403);
  // 不存在的风格 → 404
  assert.equal((await fetch(`${BASE}/api/admin/styles/ghost/archive.json`, { method: 'POST', ...auth })).status, 404);
  // alpha（上个用例已 approve 上架）→ 下架 200，公开 404，归档可见
  assert.equal((await fetch(`${BASE}/api/admin/styles/alpha/archive.json`, { method: 'POST', ...auth })).status, 200);
  assert.equal((await fetch(`${BASE}/api/styles/alpha.json`)).status, 404);
  assert.ok(fs.existsSync(path.join(TMP, 'data', 'archived', 'alpha', 'meta.json')));
  assert.ok(!fs.existsSync(path.join(TMP, 'styles', 'alpha')));
});

test('assertAdmin 单元：未配置 / 错口令 / header / cookie', async () => {
  const { assertAdmin } = await import('../src/lib/admin');
  const saved = process.env.STYLE_LAB_ADMIN_TOKEN;
  try {
    delete process.env.STYLE_LAB_ADMIN_TOKEN;
    assert.throws(() => assertAdmin(new Request('http://x/')), /管理台未启用/);
    process.env.STYLE_LAB_ADMIN_TOKEN = 'unit-token';
    assert.throws(() => assertAdmin(new Request('http://x/')), /管理口令无效/);
    assert.doesNotThrow(() => assertAdmin(new Request('http://x/', { headers: { 'x-admin-token': 'unit-token' } })));
    assert.doesNotThrow(() => assertAdmin(new Request('http://x/', { headers: { cookie: 'a=1; sl_admin=unit-token' } })));
  } finally {
    if (saved === undefined) delete process.env.STYLE_LAB_ADMIN_TOKEN;
    else process.env.STYLE_LAB_ADMIN_TOKEN = saved;
  }
});
