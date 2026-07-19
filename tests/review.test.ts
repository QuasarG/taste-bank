import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'stylelab-review-'));
process.env.STYLE_LAB_DIR = TMP;

const { createStylePack } = await import('../src/lib/create');
const { listPending, approveStyle, rejectStyle } = await import('../src/lib/review');
const { loadStyle } = await import('../src/lib/store');
const { createInvite } = await import('../src/lib/invites');
const { generateKeypair, canonicalMessage, signMessage } = await import('../src/lib/auth');

after(() => fs.rmSync(TMP, { recursive: true, force: true }));

const keys = generateKeypair();
const CODE = createInvite('review.test');

const pack = (slug: string) => ({
  meta: {
    slug, name: '审核包', version: '1.0.0', summary: '审核队列测试',
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
  skill: '# 审核包\n\n## 概述\n\n这是一段用于审核队列测试的、长度达标的风格说明文字，描述这套风格的整体气质、适用场景与用法。',
  templates: { 'page.html': '<!DOCTYPE html><html><body>r</body></html>' },
  ownerPubkey: keys.publicKey,
});

function submit(slug: string) {
  const input = pack(slug);
  const raw = JSON.stringify(input);
  const ts = String(Date.now());
  return createStylePack(input, {
    inviteCode: CODE,
    timestamp: ts,
    signature: signMessage(canonicalMessage('submit', slug, ts, raw), keys.privateKey),
    rawPayload: raw,
  });
}

test('投稿进 pending 且不可见，approve 后上架', () => {
  const res = submit('review-a');
  assert.equal(res.status, 'pending');
  assert.deepEqual(listPending(), ['review-a']);
  assert.throws(() => loadStyle('review-a'), /风格不存在/);
  approveStyle('review-a');
  assert.deepEqual(listPending(), []);
  assert.equal(loadStyle('review-a').meta.slug, 'review-a');
});

test('reject 清除 pending 且不上架', () => {
  submit('review-b');
  rejectStyle('review-b');
  assert.deepEqual(listPending(), []);
  assert.throws(() => loadStyle('review-b'), /风格不存在/);
});

test('approve 不存在的 pending 报错', () => {
  assert.throws(() => approveStyle('ghost'), /审核队列中不存在/);
});
