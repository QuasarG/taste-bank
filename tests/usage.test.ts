import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 独立临时目录：复制 fixture 风格库，usage/categories 落盘不污染源
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'style-lab-usage-'));
fs.cpSync(fileURLToPath(new URL('fixtures/styles', import.meta.url)), path.join(tmp, 'styles'), { recursive: true });
process.env.STYLE_LAB_DIR = tmp;

const { incrementUsage, getUsage, getTopSlugs, getAuthorUsage } = await import('../src/lib/usage');
const { setCategory, getCategory, listCategories } = await import('../src/lib/categories');

test('引用计数递增并持久化', () => {
  assert.equal(getUsage('blueprint'), 0);
  assert.equal(incrementUsage('blueprint'), 1);
  assert.equal(incrementUsage('blueprint'), 2);
  assert.equal(getUsage('blueprint'), 2);
});

test('Top 榜按引用量排序且只在架风格', () => {
  incrementUsage('ghost-style'); // 不在架，不应上榜
  const top = getTopSlugs(5);
  assert.deepEqual(top[0], 'blueprint');
  assert.ok(!top.includes('ghost-style'));
});

test('作者总引用量聚合', () => {
  assert.equal(getAuthorUsage(['blueprint']), getUsage('blueprint'));
  assert.equal(getAuthorUsage([]), 0);
});

test('分类设置 / 读取 / 清除', () => {
  setCategory('blueprint', '工具台');
  assert.equal(getCategory('blueprint'), '工具台');
  assert.ok(listCategories().includes('工具台'));
  setCategory('blueprint', '');
  assert.equal(getCategory('blueprint'), null);
  assert.ok(!listCategories().includes('工具台'));
});

test('meta.authorUrl 校验：https 可选，非法拒绝', async () => {
  const { metaSchema } = await import('../src/lib/schema');
  const base = {
    slug: 't', name: 'T', version: '1.0.0', summary: 's', mood: [], useCase: 'u',
    signature: 'sig', rules: { do: [], dont: [], voice: '' }, author: 'a', createdAt: '2026-01-01',
  };
  assert.ok(metaSchema.safeParse(base).success); // 省略字段
  assert.ok(metaSchema.safeParse({ ...base, authorUrl: 'https://github.com/x' }).success);
  assert.ok(!metaSchema.safeParse({ ...base, authorUrl: 'http://github.com/x' }).success);
  assert.ok(!metaSchema.safeParse({ ...base, authorUrl: 'not-a-url' }).success);
});
