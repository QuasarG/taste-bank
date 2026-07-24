import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { STYLES_DIR } from './store';
import { StyleForbiddenError } from './errors';
import { trackNewUser } from './stats';

export interface InviteEntry {
  hash: string;
  note: string;
  boundPubkey: string | null;
  createdAt: string;
}

// 邀请码文件：<root>/data/invite-codes.json；文件缺失 = 零有效码（全部拒投）
function invitesPath(): string {
  return path.join(path.dirname(STYLES_DIR), 'data', 'invite-codes.json');
}

function readInvites(): InviteEntry[] {
  const p = invitesPath();
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8')) as InviteEntry[];
}

function writeInvites(entries: InviteEntry[]): void {
  const p = invitesPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(entries, null, 2) + '\n', 'utf8');
}

const hashCode = (code: string): string => crypto.createHash('sha256').update(code).digest('hex');

export function createInvite(note = ''): string {
  const code = `sl_${crypto.randomBytes(16).toString('base64url')}`;
  const entries = readInvites();
  entries.push({ hash: hashCode(code), note, boundPubkey: null, createdAt: new Date().toISOString().slice(0, 10) });
  writeInvites(entries);
  return code;
}

export function listInvites(): Array<{ hashPrefix: string; note: string; boundPubkey: string | null; createdAt: string }> {
  return readInvites().map((e) => ({ hashPrefix: e.hash.slice(0, 8), note: e.note, boundPubkey: e.boundPubkey, createdAt: e.createdAt }));
}

// 按明文码查条目（whoami 用），找不到返回 null
export function findInvite(code: string): InviteEntry | null {
  return readInvites().find((e) => e.hash === hashCode(code)) ?? null;
}

export function revokeInvite(hashPrefix: string): boolean {
  const entries = readInvites();
  const idx = entries.findIndex((e) => e.hash.startsWith(hashPrefix));
  if (idx === -1) return false;
  entries.splice(idx, 1);
  writeInvites(entries);
  return true;
}

// 投稿门禁：邀请码有效 + 与 ownerPubkey 一码一身份绑定
export function checkInvite(code: string | undefined, pubkey: string | undefined): void {
  if (!code) throw new StyleForbiddenError('投稿需要邀请码（inviteCode 字段），向库主索取');
  const entries = readInvites();
  const entry = entries.find((e) => e.hash === hashCode(code));
  if (!entry) throw new StyleForbiddenError('邀请码无效');
  if (!pubkey) throw new StyleForbiddenError('邀请制投稿必须携带 ownerPubkey 登记身份');
  if (entry.boundPubkey && entry.boundPubkey !== pubkey) throw new StyleForbiddenError('邀请码已被其他身份绑定');
  if (!entry.boundPubkey) {
    entry.boundPubkey = pubkey;
    writeInvites(entries);
    trackNewUser();
  }
}
