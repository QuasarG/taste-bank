import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listStyles, loadStyle, readStyleFile } from '../src/lib/store';

test('listStyles 收录 blueprint', () => {
  assert.ok(listStyles().includes('blueprint'));
});

test('loadStyle 返回完整 pack 且通过校验', () => {
  const pack = loadStyle('blueprint');
  assert.equal(pack.meta.slug, 'blueprint');
  assert.equal(pack.tokens.color.bg, '#0F2D52');
  assert.ok(pack.skillRaw.includes('# 蓝图 Blueprint'));
  assert.ok(pack.overrides !== null && pack.overrides.includes('sl-card'));
  for (const f of ['meta.json', 'tokens.json', 'SKILL.md', 'overrides.css', 'templates/page.html']) {
    assert.ok(pack.files.includes(f), `缺少文件: ${f}`);
  }
});

test('不存在的风格报错', () => {
  assert.throws(() => loadStyle('ghost-style'), /风格不存在/);
});

test('readStyleFile 正常读取且拒绝路径逃逸', () => {
  assert.ok(readStyleFile('blueprint', 'templates/page.html').includes('<!DOCTYPE html>'));
  assert.throws(() => readStyleFile('blueprint', '../../package.json'), /非法路径/);
  assert.throws(() => readStyleFile('blueprint', 'nope.txt'), /文件不存在/);
});
