import fs from 'node:fs';
import path from 'node:path';
import { STYLES_DIR } from './store';
import { StyleForbiddenError } from './errors';

// 作者名-公钥绑定：身份认钥匙不认名字。首次投稿登记名字；
// 之后同公钥提交不同名字 = 改名（签名即授权，全量回写该身份所有 pack）；
// 名字已被其他公钥占用 = 拒收。落盘 STYLE_LAB_DIR/data/authors.json，{ pubkey: author }
function bindFile(): string {
  return path.join(path.dirname(STYLES_DIR), 'data', 'authors.json');
}

function pendingRoot(): string {
  return path.join(path.dirname(STYLES_DIR), 'data', 'pending');
}

export function getAllBindings(): Record<string, string> {
  try {
    const data = JSON.parse(fs.readFileSync(bindFile(), 'utf8'));
    return typeof data === 'object' && data !== null ? data : {};
  } catch {
    return {};
  }
}

function bindAuthor(pubkey: string, author: string): void {
  const all = getAllBindings();
  all[pubkey] = author;
  fs.mkdirSync(path.dirname(bindFile()), { recursive: true });
  fs.writeFileSync(bindFile(), JSON.stringify(all, null, 2));
}

// 遍历 pack 目录（已上架 + 审核队列），yield [dir, ownerKey]
function* packDirs(root: string): Generator<[string, string]> {
  if (!fs.existsSync(root)) return;
  for (const slug of fs.readdirSync(root)) {
    try {
      const key = fs.readFileSync(path.join(root, slug, 'owner.key'), 'utf8').trim();
      yield [path.join(root, slug), key];
    } catch {
      // 无 owner.key 的 pack 跳过
    }
  }
}

export function getBoundAuthor(pubkey: string): string | null {
  const bound = getAllBindings()[pubkey];
  if (bound) return bound;
  // 兜底：从已有 pack 的 owner.key 反查并播种（兼容绑定机制上线前的投稿）
  for (const [dir, key] of packDirs(STYLES_DIR)) {
    if (key !== pubkey) continue;
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
      if (typeof meta.author === 'string' && meta.author) {
        bindAuthor(pubkey, meta.author);
        return meta.author;
      }
    } catch {
      // meta 损坏的 pack 跳过
    }
  }
  return null;
}

// 反查名字的主人：该作者名当前绑在哪把公钥上
function getAuthorOwner(author: string): string | null {
  for (const [pubkey, name] of Object.entries(getAllBindings())) {
    if (name === author) return pubkey;
  }
  for (const [dir, key] of packDirs(STYLES_DIR)) {
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
      if (meta.author === author) return key;
    } catch {
      // meta 损坏的 pack 跳过
    }
  }
  return null;
}

// 改名：重新绑定 + 回写该身份所有 pack（含审核队列）的 meta.author
function renameAuthor(pubkey: string, next: string): number {
  bindAuthor(pubkey, next);
  let rewritten = 0;
  for (const root of [STYLES_DIR, pendingRoot()]) {
    for (const [dir, key] of packDirs(root)) {
      if (key !== pubkey) continue;
      try {
        const metaPath = path.join(dir, 'meta.json');
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (meta.author === next) continue;
        meta.author = next;
        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
        rewritten++;
      } catch {
        // meta 损坏的 pack 跳过
      }
    }
  }
  return rewritten;
}

// 投稿/更新时调用（此时签名已验证通过，持有私钥即身份）：
// 名字被别人占用 → 403；首次 → 登记；换名 → 全量改名
export function assertAuthorForPubkey(pubkey: string | undefined, author: string): void {
  if (!pubkey) return;
  const owner = getAuthorOwner(author);
  if (owner && owner !== pubkey) {
    throw new StyleForbiddenError(`作者名「${author}」已被其他身份占用，请换一个名字`);
  }
  const bound = getBoundAuthor(pubkey);
  if (!bound) {
    bindAuthor(pubkey, author);
    return;
  }
  if (bound !== author) renameAuthor(pubkey, author);
}
