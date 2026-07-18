import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'stylelab-invite-'));
process.env.STYLE_LAB_DIR = TMP;

const { createInvite, listInvites, revokeInvite, checkInvite } = await import('../src/lib/invites');
const { generateKeypair } = await import('../src/lib/auth');
const { StyleForbiddenError } = await import('../src/lib/errors');

after(() => fs.rmSync(TMP, { recursive: true, force: true }));

const keys = generateKeypair();

test('无码 / 错码 / 无公钥全部拒投', () => {
  assert.throws(() => checkInvite(undefined, keys.publicKey), StyleForbiddenError);
  assert.throws(() => checkInvite('sl_wrong-code', keys.publicKey), /邀请码无效/);
  const code = createInvite('测试');
  assert.throws(() => checkInvite(code, undefined), /ownerPubkey/);
});

test('首次使用绑定身份，同身份复用，异身份拒绝', () => {
  const code = createInvite('绑定测试');
  checkInvite(code, keys.publicKey);
  checkInvite(code, keys.publicKey); // 同身份复用
  assert.throws(() => checkInvite(code, generateKeypair().publicKey), /已被其他身份绑定/);
  const list = listInvites();
  assert.equal(list.filter((e) => e.boundPubkey).length, 1);
});

test('吊销后失效', () => {
  const code = createInvite('吊销测试');
  const prefix = listInvites().find((e) => e.note === '吊销测试')!.hashPrefix;
  assert.ok(revokeInvite(prefix));
  assert.throws(() => checkInvite(code, keys.publicKey), /邀请码无效/);
});
