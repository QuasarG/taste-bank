import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRate, resetRate, rateKey } from '../src/lib/ratelimit';
import { StyleRateLimitError } from '../src/lib/errors';

test('窗口内放行，超限拒绝', () => {
  resetRate();
  checkRate('a', 3, 60_000);
  checkRate('a', 3, 60_000);
  checkRate('a', 3, 60_000);
  assert.throws(() => checkRate('a', 3, 60_000), StyleRateLimitError);
});

test('不同 key 互不影响，resetRate 清零', () => {
  resetRate();
  for (let i = 0; i < 3; i++) checkRate('a', 3, 60_000);
  checkRate('b', 3, 60_000); // b 不受影响
  resetRate();
  checkRate('a', 3, 60_000); // 清零后放行
});

test('rateKey 不泄露原文', () => {
  const k = rateKey('submit', 'sl_secret-code');
  assert.ok(k.startsWith('submit:'));
  assert.ok(!k.includes('secret'));
});
