import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadStyle } from '../src/lib/store';
import { tokensToCss, fullCss, assembleSkill } from '../src/lib/assemble';

const pack = loadStyle('blueprint');

test('tokensToCss 生成 scoped 变量块', () => {
  const css = tokensToCss('blueprint', pack.tokens);
  assert.ok(css.startsWith('[data-style="blueprint"] {'));
  assert.ok(css.includes('--sl-color-bg: #0F2D52;'));
  assert.ok(css.includes('--sl-font-mono:'));
  assert.ok(css.includes('--sl-duration: 160ms;'));
});

test('fullCss 拼接 overrides', () => {
  const css = fullCss('blueprint', pack.tokens, pack.overrides);
  assert.ok(css.includes('--sl-color-bg'));
  assert.ok(css.includes('[data-style="blueprint"] .sl-card::before'));
  const bare = fullCss('x', pack.tokens, null);
  assert.ok(!bare.includes('sl-card'));
});

test('assembleSkill 追加 Tokens 附录且不动原文', () => {
  const skill = assembleSkill(pack.meta, pack.tokens, pack.skillRaw);
  assert.ok(skill.includes('## 概述'));
  assert.ok(skill.includes('## Tokens（由 tokens.json 自动生成，勿手改）'));
  assert.ok(skill.includes('--sl-color-accent: #7FD4FF;'));
  assert.ok(skill.trim().endsWith('```'));
});
