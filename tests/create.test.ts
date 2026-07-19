import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// 在 import lib 之前把存储指到临时目录，避免污染真实 styles/
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'stylelab-create-'));
process.env.STYLE_LAB_DIR = TMP;

const { createStylePack, StyleConflictError, StyleForbiddenError } = await import('../src/lib/create');
const { loadStyle } = await import('../src/lib/store');
const { createInvite } = await import('../src/lib/invites');
const { generateKeypair, canonicalMessage, signMessage } = await import('../src/lib/auth');
const { approveStyle } = await import('../src/lib/review');

after(() => fs.rmSync(TMP, { recursive: true, force: true }));

const keys = generateKeypair();
const CODE = createInvite('create.test');

const valid = {
  meta: {
    slug: 'testpack', name: '测试包', version: '0.1.0', summary: '测试用风格',
    mood: ['测试'], useCase: '单元测试', signature: '无',
    rules: { do: ['保持简单'], dont: ['禁止花哨'], voice: '直白' },
    author: 'tester', createdAt: '2026-07-17',
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
  skill: '# 测试包\n\n## 概述\n\n这是一段用于单元测试的、长度达标的风格说明文字，描述这套风格的整体气质、适用场景与用法。',
  templates: { 'page.html': '<!DOCTYPE html><html><body>hi</body></html>' },
  ownerPubkey: keys.publicKey,
};

// 签名投稿辅助：与客户端行为一致
function submit(input: unknown, sign = true) {
  const raw = JSON.stringify(input);
  const slug = (input as typeof valid).meta.slug;
  const ts = String(Date.now());
  return createStylePack(input, {
    inviteCode: CODE,
    timestamp: sign ? ts : undefined,
    signature: sign ? signMessage(canonicalMessage('submit', slug, ts, raw), keys.privateKey) : undefined,
    rawPayload: raw,
  });
}

test('签名投稿进审核队列，approve 后可读回', () => {
  const res = submit(structuredClone(valid));
  assert.equal(res.slug, 'testpack');
  assert.equal(res.status, 'pending');
  for (const f of ['meta.json', 'tokens.json', 'SKILL.md', 'templates/page.html', 'owner.key']) {
    assert.ok(res.files.includes(f), `未写入: ${f}`);
  }
  assert.throws(() => loadStyle('testpack'), /风格不存在/);
  approveStyle('testpack');
  const pack = loadStyle('testpack');
  assert.equal(pack.meta.name, '测试包');
  assert.equal(pack.tokens.color.accent, '#0055CC');
});

test('重复 slug 抛 StyleConflictError', () => {
  assert.throws(() => submit(structuredClone(valid)), StyleConflictError);
});

test('无签名 / 错签名投稿被拒', () => {
  const a = structuredClone(valid);
  a.meta.slug = 'unsigned';
  assert.throws(() => submit(a, false), StyleForbiddenError);

  const b = structuredClone(valid);
  b.meta.slug = 'wrongsig';
  const raw = JSON.stringify(b);
  const ts = String(Date.now());
  assert.throws(
    () =>
      createStylePack(b, {
        inviteCode: CODE,
        timestamp: ts,
        signature: signMessage(canonicalMessage('submit', 'wrongsig', ts, raw), generateKeypair().privateKey),
        rawPayload: raw,
      }),
    /签名验证失败/,
  );
});

test('templates 缺少 .html 被拒', () => {
  const bad = structuredClone(valid);
  bad.meta.slug = 'no-html';
  bad.templates = { 'note.md': '# hi' };
  assert.throws(() => submit(bad), /至少包含一个 \.html/);
});

test('模板文件名带路径穿越被拒', () => {
  const bad = structuredClone(valid);
  bad.meta.slug = 'evil-name';
  bad.templates = { '../evil.html': '<html></html>', 'page.html': '<html></html>' };
  assert.throws(() => submit(bad), /非法模板文件名/);
});

test('模板内容含 <script 被拒', () => {
  const bad = structuredClone(valid);
  bad.meta.slug = 'evil-script';
  bad.templates = { 'page.html': '<html><script>alert(1)</script></html>' };
  assert.throws(() => submit(bad), /危险片段/);
});

test('模板内容含事件处理器 / iframe / link 被拒', () => {
  const cases = [
    '<html><img src="x" onerror="alert(1)"></html>',
    '<html><iframe src="https://evil.com"></iframe></html>',
    '<html><link rel="stylesheet" href="https://evil.com/x.css"></html>',
  ];
  for (const [i, html] of cases.entries()) {
    const bad = structuredClone(valid);
    bad.meta.slug = `evil-attr-${i}`;
    bad.templates = { 'page.html': html };
    assert.throws(() => submit(bad), /危险片段/);
  }
});

test('overrides 含 url( 被拒', () => {
  const bad = structuredClone(valid);
  bad.meta.slug = 'evil-css';
  (bad as Record<string, unknown>).overrides = '.x { background: url(https://evil.com/a.png) }';
  assert.throws(() => submit(bad), /危险片段/);
});

test('tokens 非法（坏 hex）被拒', () => {
  const bad = structuredClone(valid);
  bad.meta.slug = 'bad-hex';
  bad.tokens.color.bg = 'blue';
  assert.throws(() => submit(bad));
});

test('skill 混入 AWS key / JWT 被拒并要求脱敏', () => {
  const bad = structuredClone(valid);
  bad.meta.slug = 'leaky';
  bad.skill += '\n参考密钥 AKIAIOSFODNN7EXAMPLE 别学我。';
  assert.throws(() => submit(bad), /疑似包含密钥/);

  const bad2 = structuredClone(valid);
  bad2.meta.slug = 'leaky2';
  bad2.skill += '\neyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJVadQssw5c';
  assert.throws(() => submit(bad2), /疑似包含密钥/);
});

test('无邀请码被拒', () => {
  const bad = structuredClone(valid);
  bad.meta.slug = 'no-invite';
  assert.throws(() => createStylePack(bad, {}), /邀请码/);
});
