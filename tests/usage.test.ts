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

test('作者名-公钥绑定：登记、改名回写、占用拒收、兜底播种', async () => {
  const { assertAuthorForPubkey, getBoundAuthor } = await import('../src/lib/authors');
  const keyA = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
  const keyB = 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=';
  const keyC = 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=';

  // 首次投稿登记
  assertAuthorForPubkey(keyA, 'QuasarG');
  assert.equal(getBoundAuthor(keyA), 'QuasarG');
  // 同名放行
  assertAuthorForPubkey(keyA, 'QuasarG');

  // keyA 名下有一套房，改名后应全量回写
  const packDir = path.join(tmp, 'styles', 'owned-pack');
  fs.mkdirSync(packDir, { recursive: true });
  fs.writeFileSync(path.join(packDir, 'owner.key'), keyA + '\n');
  fs.writeFileSync(path.join(packDir, 'meta.json'), JSON.stringify({ author: 'QuasarG' }));
  assertAuthorForPubkey(keyA, 'NewName'); // 身份认钥匙：换名即改名，不再 403
  assert.equal(getBoundAuthor(keyA), 'NewName');
  assert.equal(JSON.parse(fs.readFileSync(path.join(packDir, 'meta.json'), 'utf8')).author, 'NewName');

  // 冒名：名字已被 keyA 占用，keyC 使用即拒收
  assert.throws(() => assertAuthorForPubkey(keyC, 'NewName'), /已被其他身份占用/);

  // 绑定机制上线前的旧 pack：从 owner.key 反查播种
  const legacyDir = path.join(tmp, 'styles', 'legacy-pack');
  fs.mkdirSync(legacyDir, { recursive: true });
  fs.writeFileSync(path.join(legacyDir, 'owner.key'), keyB + '\n');
  fs.writeFileSync(path.join(legacyDir, 'meta.json'), JSON.stringify({ author: 'LegacyAuthor' }));
  assert.equal(getBoundAuthor(keyB), 'LegacyAuthor');
});
