import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 4561;
const BASE = `http://127.0.0.1:${PORT}`;

// 临时存储目录：播种一份 blueprint，投稿测试全在隔离环境进行
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'stylelab-api-'));
fs.mkdirSync(path.join(TMP, 'styles'), { recursive: true });
fs.cpSync(path.join(ROOT, 'tests', 'fixtures', 'styles', 'blueprint'), path.join(TMP, 'styles', 'blueprint'), { recursive: true });

process.env.STYLE_LAB_DIR = TMP;
const { createInvite } = await import('../src/lib/invites');
const { generateKeypair } = await import('../src/lib/auth');
const INVITE = createInvite('api.test');
const keys = generateKeypair();

let child: ChildProcess;

async function waitReady(): Promise<void> {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/styles.json`);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('dev server 启动超时');
}

const newPack = (slug: string) => ({
  meta: {
    slug, name: '接口包', version: '0.1.0', summary: 'API 集成测试用',
    mood: ['测试'], useCase: '集成测试', signature: '无',
    rules: { do: [], dont: [], voice: '' }, author: 'tester', createdAt: '2026-07-17',
  },
  tokens: {
    color: { bg: '#101010', surface: '#181818', text: '#EEEEEE', muted: '#999999', line: '#333333', accent: '#CC5500' },
    font: { display: 'Inter, sans-serif', body: 'Inter, sans-serif' },
    size: { display: '3rem', h1: '2rem', h2: '1.4rem', body: '1rem', small: '0.85rem' },
    space: { sm: '8px', md: '16px', lg: '24px' },
    radius: { sm: '2px', md: '4px' },
    shadow: { card: 'none' },
    motion: { duration: '150ms', easing: 'ease' },
  },
  skill: '# 接口包\n\n## 概述\n\n这是一段用于 API 集成测试的、长度达标的风格说明文字，描述整体气质与用法。',
  templates: { 'page.html': '<!DOCTYPE html><html><body>api</body></html>' },
  ownerPubkey: keys.publicKey,
});

before(async () => {
  child = spawn(process.execPath, ['node_modules/astro/bin/astro.mjs', 'dev', '--port', String(PORT), '--host', '127.0.0.1'], {
    cwd: ROOT,
    env: { ...process.env, STYLE_LAB_DIR: TMP },
    stdio: 'ignore',
  });
  await waitReady();
});

after(() => {
  child.kill('SIGTERM');
  fs.rmSync(TMP, { recursive: true, force: true });
});

test('GET /api/styles.json 列表与关键词过滤', async () => {
  const res = await fetch(`${BASE}/api/styles.json`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.count, 1);
  assert.equal(data.styles[0].slug, 'blueprint');

  const hit = await (await fetch(`${BASE}/api/styles.json?q=图纸`)).json();
  assert.equal(hit.count, 1);
  const miss = await (await fetch(`${BASE}/api/styles.json?q=不存在的词`)).json();
  assert.equal(miss.count, 0);
});

test('GET 单风格 / 404 / skill.md / tokens.css', async () => {
  const one = await (await fetch(`${BASE}/api/styles/blueprint.json`)).json();
  assert.equal(one.meta.slug, 'blueprint');
  assert.ok(one.files.includes('templates/page.html'));

  const ghost = await fetch(`${BASE}/api/styles/ghost.json`);
  assert.equal(ghost.status, 404);

  const skill = await fetch(`${BASE}/api/styles/blueprint/skill.md`);
  assert.match(skill.headers.get('content-type') ?? '', /text\/markdown/);
  assert.ok((await skill.text()).includes('## Tokens'));

  const css = await fetch(`${BASE}/api/styles/blueprint/tokens.css`);
  assert.match(css.headers.get('content-type') ?? '', /text\/css/);
  assert.ok((await css.text()).includes('--sl-color-bg: #0F2D52;'));
});

test('POST 投稿全链路：201 → 可读回 → 重复 409 → 非法 400', async () => {
  const post = async (body: unknown, invite: string | null = INVITE) =>
    fetch(`${BASE}/api/styles.json`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(invite ? { 'x-invite-code': invite } : {}) },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });

  // 无邀请码 → 403
  assert.equal((await post(newPack('noinvite'), null)).status, 403);

  const created = await post(newPack('apipack'));
  assert.equal(created.status, 201);
  const createdData = await created.json();
  assert.ok(createdData.files.includes('SKILL.md'));

  const readback = await fetch(`${BASE}/api/styles/apipack.json`);
  assert.equal(readback.status, 200);

  const dup = await post(newPack('apipack'));
  assert.equal(dup.status, 409);

  const bad = newPack('badpack');
  bad.tokens.color.bg = 'not-a-color';
  assert.equal((await post(bad)).status, 400);

  assert.equal((await post('{oops')).status, 400);
});
