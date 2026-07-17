import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// 在 import lib 之前把存储指到临时目录，避免污染真实 styles/
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'stylelab-create-'));
process.env.STYLE_LAB_DIR = TMP;

const { createStylePack, StyleConflictError } = await import('../src/lib/create');
const { loadStyle } = await import('../src/lib/store');

after(() => fs.rmSync(TMP, { recursive: true, force: true }));

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
};

test('合法投稿创建全部文件且可被 loadStyle 读回', () => {
  const res = createStylePack(structuredClone(valid));
  assert.equal(res.slug, 'testpack');
  for (const f of ['meta.json', 'tokens.json', 'SKILL.md', 'templates/page.html']) {
    assert.ok(res.files.includes(f), `未写入: ${f}`);
  }
  const pack = loadStyle('testpack');
  assert.equal(pack.meta.name, '测试包');
  assert.equal(pack.tokens.color.accent, '#0055CC');
  assert.equal(pack.overrides, null);
});

test('重复 slug 抛 StyleConflictError', () => {
  assert.throws(() => createStylePack(structuredClone(valid)), StyleConflictError);
});

test('templates 缺少 .html 被拒', () => {
  const bad = structuredClone(valid);
  bad.meta.slug = 'no-html';
  bad.templates = { 'note.md': '# hi' };
  assert.throws(() => createStylePack(bad), /至少包含一个 \.html/);
});

test('模板文件名带路径穿越被拒', () => {
  const bad = structuredClone(valid);
  bad.meta.slug = 'evil-name';
  bad.templates = { '../evil.html': '<html></html>', 'page.html': '<html></html>' };
  assert.throws(() => createStylePack(bad), /非法模板文件名/);
});

test('模板内容含 <script 被拒', () => {
  const bad = structuredClone(valid);
  bad.meta.slug = 'evil-script';
  bad.templates = { 'page.html': '<html><script>alert(1)</script></html>' };
  assert.throws(() => createStylePack(bad), /危险片段/);
});

test('overrides 含 url( 被拒', () => {
  const bad = structuredClone(valid);
  bad.meta.slug = 'evil-css';
  (bad as Record<string, unknown>).overrides = '.x { background: url(https://evil.com/a.png) }';
  assert.throws(() => createStylePack(bad), /危险片段/);
});

test('tokens 非法（坏 hex）被拒', () => {
  const bad = structuredClone(valid);
  bad.meta.slug = 'bad-hex';
  bad.tokens.color.bg = 'blue';
  assert.throws(() => createStylePack(bad));
});
