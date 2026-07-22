import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateKeypair, isValidPubkey, canonicalMessage,
  signMessage, verifyMessage, timestampInWindow,
} from '../src/lib/auth';

test('钥匙生成与验签往返', () => {
  const { publicKey, privateKey } = generateKeypair();
  assert.ok(isValidPubkey(publicKey));
  assert.ok(!isValidPubkey('not-a-key'));

  const msg = canonicalMessage('update', 'mono-console', '1784400000000', '{"a":1}');
  const sig = signMessage(msg, privateKey);
  assert.ok(verifyMessage(msg, sig, publicKey));
});

test('错私钥 / 错消息 / 错公钥全部验不过', () => {
  const a = generateKeypair();
  const b = generateKeypair();
  const msg = canonicalMessage('delete', 'x', '1784400000000', '');
  const sig = signMessage(msg, a.privateKey);
  assert.ok(!verifyMessage(msg, sig, b.publicKey));
  assert.ok(!verifyMessage(msg + 'tampered', sig, a.publicKey));
  assert.ok(!verifyMessage(msg, 'aGVsbG8=', a.publicKey));
});

test('时间窗校验', () => {
  assert.ok(timestampInWindow(String(Date.now())));
  assert.ok(timestampInWindow(String(Date.now() - 10 * 60 * 1000))); // 10 分钟内在 30 分钟窗口内
  assert.ok(!timestampInWindow(String(Date.now() - 40 * 60 * 1000))); // 40 分钟前超出
  assert.ok(!timestampInWindow('not-a-number'));
});

test('canonicalMessage 对 payload 敏感', () => {
  const m1 = canonicalMessage('update', 's', '1', 'A');
  const m2 = canonicalMessage('update', 's', '1', 'B');
  assert.notEqual(m1, m2);
});
