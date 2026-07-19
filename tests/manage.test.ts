import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateKeypair, canonicalMessage, signMessage } from '../src/lib/auth';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 4564;
const BASE = `http://127.0.0.1:${PORT}`;

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'stylelab-manage-'));
fs.mkdirSync(path.join(TMP, 'styles'), { recursive: true });

process.env.STYLE_LAB_DIR = TMP;
const { createInvite } = await import('../src/lib/invites');
const { approveStyle } = await import('../src/lib/review');
const INVITE = createInvite('manage.test');

let child: ChildProcess;
const keys = generateKeypair();

const pack = (slug: string, version: string, owner?: string) => ({
  meta: {
    slug, name: '管理测试包', version, summary: '管理链路测试用',
    mood: ['测试'], useCase: '测试', signature: '无',
    rules: { do: [], dont: [], voice: '' }, author: 'tester', createdAt: '2026-07-18',
  },
  tokens: {
    color: { bg: '#FFFFFF', surface: '#F5F5F5', text: '#111111', muted: '#666666', line: '#DDDDDD', accent: '#0055CC' },
    font: { display: 'Inter, sans-serif', body: 'Inter, sans-serif' },
    size: { display: '3rem', h1: '2rem', h2: '1.4rem', body: '1rem', small: '0.85rem' },
    space: { sm: '8px', md: '16px', lg: '24px' },
    radius: { sm: '2px', md: '4px' },
    shadow: { card: 'none' },
    motion: { duration: '150ms', easing: 'ease' },
  },
  skill: '# 管理测试包\n\n## 概述\n\n这是一段用于管理链路测试的、长度达标的风格说明文字，描述这套风格的整体气质与用法。',
  templates: { 'page.html': '<!DOCTYPE html><html><body>manage</body></html>' },
  ...(owner ? { ownerPubkey: owner } : {}),
});

function signedHeaders(action: string, slug: string, payload: string, priv = keys.privateKey, ts = String(Date.now())) {
  return {
    'content-type': 'application/json',
    'x-timestamp': ts,
    'x-signature': signMessage(canonicalMessage(action, slug, ts, payload), priv),
  };
}

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

test('所有权管理全链路', { timeout: 120_000 }, async () => {
  const post = (b: unknown, invite: string | null = INVITE) => {
    const raw = JSON.stringify(b);
    const slug = (b as { meta?: { slug?: string } })?.meta?.slug ?? '';
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (invite) headers['x-invite-code'] = invite;
    Object.assign(headers, signedHeaders('submit', slug, raw));
    return fetch(`${BASE}/api/styles.json`, { method: 'POST', headers, body: raw });
  };
  const put = (slug: string, raw: string, headers: Record<string, string>) =>
    fetch(`${BASE}/api/styles/${slug}.json`, { method: 'PUT', headers, body: raw });
  const del = (slug: string, headers: Record<string, string>) =>
    fetch(`${BASE}/api/styles/${slug}.json`, { method: 'DELETE', headers });

  // 1. 带公钥签名投稿 → 201 pending，approve 后 owner.key 可见
  assert.equal((await post(pack('owned', '1.0.0', keys.publicKey))).status, 201);
  approveStyle('owned');
  const detail = await (await fetch(`${BASE}/api/styles/owned.json`)).json();
  assert.ok(detail.files.includes('owner.key'));

  // 2. 无签名更新 → 403；错签名 → 403；有效签名但版本不升 → 400
  const sameVer = JSON.stringify(pack('owned', '1.0.0', keys.publicKey));
  assert.equal((await put('owned', sameVer, { 'content-type': 'application/json' })).status, 403);
  assert.equal((await put('owned', sameVer, signedHeaders('update', 'owned', sameVer, generateKeypair().privateKey))).status, 403);
  assert.equal((await put('owned', sameVer, signedHeaders('update', 'owned', sameVer))).status, 400);

  // 3. 有效签名 + 版本升级 → 200，内容生效
  const upgraded = JSON.stringify(pack('owned', '1.1.0', keys.publicKey));
  assert.equal((await put('owned', upgraded, signedHeaders('update', 'owned', upgraded))).status, 200);
  const after1 = await (await fetch(`${BASE}/api/styles/owned.json`)).json();
  assert.equal(after1.meta.version, '1.1.0');

  // 4. 过期时间戳 → 403
  const staleTs = String(Date.now() - 10 * 60 * 1000);
  assert.equal((await del('owned', signedHeaders('delete', 'owned', '', keys.privateKey, staleTs))).status, 403);

  // 5. 邀请码门禁：无码 / 错码 → 403
  assert.equal((await post(pack('noinvite', '1.0.0', keys.publicKey), null)).status, 403);
  assert.equal((await post(pack('noinvite', '1.0.0', keys.publicKey), 'sl_wrong-code')).status, 403);

  // 6. 正确签名删除 → 200，随后 404
  assert.equal((await del('owned', signedHeaders('delete', 'owned', ''))).status, 200);
  assert.equal((await fetch(`${BASE}/api/styles/owned.json`)).status, 404);
});
