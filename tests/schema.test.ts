import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokensSchema, metaSchema } from '../src/lib/schema';

const validTokens = {
  color: {
    bg: '#0F2D52', surface: '#143A66', text: '#E8F1FF',
    muted: '#8FB3E8', line: '#3D6CA8', accent: '#7FD4FF', warn: '#FFB86B',
  },
  font: { display: 'Inter, sans-serif', body: 'Inter, sans-serif', mono: 'Consolas, monospace' },
  size: { display: '3rem', h1: '2rem', h2: '1.4rem', body: '1rem', small: '0.85rem' },
  space: { sm: '8px', md: '16px', lg: '24px' },
  radius: { sm: '2px', md: '3px' },
  shadow: { card: 'none' },
  motion: { duration: '160ms', easing: 'cubic-bezier(0.2, 0, 0, 1)' },
};

const validMeta = {
  slug: 'blueprint', name: '蓝图', version: '1.0.0', summary: '图纸气质',
  mood: ['精确'], useCase: '仪表盘', signature: '坐标刻痕',
  rules: { do: ['用发丝线'], dont: ['禁阴影'], voice: '简短' },
  author: 'tester', createdAt: '2026-07-17',
};

test('合法 tokens 通过校验', () => {
  const parsed = tokensSchema.parse(validTokens);
  assert.equal(parsed.color.bg, '#0F2D52');
});

test('扩展色角色允许，非 hex 颜色拒绝', () => {
  assert.equal(tokensSchema.parse(validTokens).color.warn, '#FFB86B');
  const bad = structuredClone(validTokens);
  bad.color.bg = 'red';
  assert.throws(() => tokensSchema.parse(bad));
});

test('font 中出现 url( 被拒绝', () => {
  const bad = structuredClone(validTokens);
  bad.font.body = 'url(https://evil.com/x.css)';
  assert.throws(() => tokensSchema.parse(bad), /危险片段/);
});

test('缺少必需色角色被拒绝', () => {
  const bad = structuredClone(validTokens);
  // @ts-expect-error 故意删掉必需字段
  delete bad.color.surface;
  assert.throws(() => tokensSchema.parse(bad));
});

test('shadow 允许 none，尺寸单位不合法拒绝', () => {
  assert.equal(tokensSchema.parse(validTokens).shadow.card, 'none');
  const bad = structuredClone(validTokens);
  bad.space.md = '16';
  assert.throws(() => tokensSchema.parse(bad));
});

test('合法 meta 通过，非法 slug 与版本号拒绝', () => {
  assert.equal(metaSchema.parse(validMeta).slug, 'blueprint');
  assert.throws(() => metaSchema.parse({ ...validMeta, slug: 'Blueprint_A' }));
  assert.throws(() => metaSchema.parse({ ...validMeta, version: '1.0' }));
});
