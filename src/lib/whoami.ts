import fs from 'node:fs';
import path from 'node:path';
import { STYLES_DIR } from './store';
import { getBoundAuthor } from './authors';
import { findInvite } from './invites';
import { StyleForbiddenError } from './errors';

// whoami：凭邀请码（配置注入，非参数）查身份——绑定作者、名下风格（含审核队列）
export interface OwnedStyle {
  slug: string;
  name: string;
  version?: string;
  author?: string;
}

export interface WhoamiResult {
  bound: boolean;
  author: string | null;
  styles: OwnedStyle[];
  pending: OwnedStyle[];
  note: string;
}

function scanOwned(root: string, pubkey: string): OwnedStyle[] {
  const out: OwnedStyle[] = [];
  if (!fs.existsSync(root)) return out;
  for (const slug of fs.readdirSync(root)) {
    try {
      const dir = path.join(root, slug);
      const key = fs.readFileSync(path.join(dir, 'owner.key'), 'utf8').trim();
      if (key !== pubkey) continue;
      const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
      out.push({ slug, name: meta.name ?? slug, version: meta.version, author: meta.author });
    } catch {
      // 无 owner.key 或 meta 损坏的 pack 跳过
    }
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

export function whoami(inviteCode: string | undefined): WhoamiResult {
  if (!inviteCode) throw new StyleForbiddenError('whoami 需要邀请码（由 MCP 配置的 x-invite-code 头注入）');
  const entry = findInvite(inviteCode);
  if (!entry) throw new StyleForbiddenError('邀请码无效');
  if (!entry.boundPubkey) {
    return { bound: false, author: null, styles: [], pending: [], note: '该邀请码尚未投稿过，未绑定身份' };
  }
  const author = getBoundAuthor(entry.boundPubkey);
  return {
    bound: true,
    author,
    styles: scanOwned(STYLES_DIR, entry.boundPubkey),
    pending: scanOwned(path.join(path.dirname(STYLES_DIR), 'data', 'pending'), entry.boundPubkey),
    note: '被拒绝的投稿会即刻焚毁，没有历史记录可查',
  };
}
