import fs from 'node:fs';
import path from 'node:path';
import { STYLES_DIR } from './store';
import { StyleForbiddenError } from './errors';

// 作者名-公钥绑定：首次投稿登记，之后同一公钥投稿的 meta.author 必须一致，防止冒名顶替
// 落盘 STYLE_LAB_DIR/data/authors.json，{ pubkey: author }
function bindFile(): string {
  return path.join(path.dirname(STYLES_DIR), 'data', 'authors.json');
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

export function getBoundAuthor(pubkey: string): string | null {
  const bound = getAllBindings()[pubkey];
  if (bound) return bound;
  // 兜底：从已上架 pack 的 owner.key 反查并播种（兼容绑定机制上线前的投稿）
  if (!fs.existsSync(STYLES_DIR)) return null;
  for (const slug of fs.readdirSync(STYLES_DIR)) {
    try {
      const key = fs.readFileSync(path.join(STYLES_DIR, slug, 'owner.key'), 'utf8').trim();
      if (key === pubkey) {
        const meta = JSON.parse(fs.readFileSync(path.join(STYLES_DIR, slug, 'meta.json'), 'utf8'));
        if (typeof meta.author === 'string' && meta.author) {
          bindAuthor(pubkey, meta.author);
          return meta.author;
        }
      }
    } catch {
      // 无 owner.key 或 meta 损坏的 pack 跳过
    }
  }
  return null;
}

// 投稿/更新时调用：一致则放行（未绑定则登记），不一致直接拒收
export function assertAuthorForPubkey(pubkey: string | undefined, author: string): void {
  if (!pubkey) return;
  const bound = getBoundAuthor(pubkey);
  if (bound && bound !== author) {
    throw new StyleForbiddenError(`该公钥已绑定作者名「${bound}」，与本次提交的「${author}」不一致。作者名一经绑定不可自封，如需改名请联系库主`);
  }
  if (!bound) bindAuthor(pubkey, author);
}
