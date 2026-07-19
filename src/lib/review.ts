import fs from 'node:fs';
import path from 'node:path';
import { STYLES_DIR } from './store';

// 审核队列：投稿先落 data/pending/，approve 后才进 styles/ 对外可见
function pendingDir(): string {
  return path.join(path.dirname(STYLES_DIR), 'data', 'pending');
}

export function listPending(): string[] {
  const dir = pendingDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

export function pendingPath(slug: string): string {
  return path.join(pendingDir(), slug);
}

export function approveStyle(slug: string): void {
  const from = pendingPath(slug);
  if (!fs.existsSync(from)) throw new Error(`审核队列中不存在: ${slug}`);
  const to = path.join(STYLES_DIR, slug);
  if (fs.existsSync(to)) throw new Error(`风格已存在，无法上架: ${slug}`);
  fs.mkdirSync(STYLES_DIR, { recursive: true });
  fs.renameSync(from, to);
}

export function rejectStyle(slug: string): void {
  const from = pendingPath(slug);
  if (!fs.existsSync(from)) throw new Error(`审核队列中不存在: ${slug}`);
  fs.rmSync(from, { recursive: true, force: true });
}
