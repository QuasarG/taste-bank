import fs from 'node:fs';
import path from 'node:path';
import { STYLES_DIR } from './store';
import { metaSchema, type Meta } from './schema';

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

// —— 管理台读取：单条损坏不拖垮全列表 ——
export interface PendingEntry {
  slug: string;
  meta?: Meta;
  error?: string;
}

export function listPendingMeta(): PendingEntry[] {
  return listPending().map((slug) => {
    try {
      const meta = metaSchema.parse(JSON.parse(fs.readFileSync(path.join(pendingPath(slug), 'meta.json'), 'utf8')));
      return { slug, meta };
    } catch (e) {
      return { slug, error: e instanceof Error ? e.message : String(e) };
    }
  });
}

function walk(dir: string, base: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, base, out);
    else out.push(path.relative(base, abs).split(path.sep).join('/'));
  }
}

export function loadPendingDetail(slug: string): { meta: Meta; skillRaw: string; files: string[] } {
  const dir = pendingPath(slug);
  if (!fs.existsSync(dir)) throw new Error(`审核队列中不存在: ${slug}`);
  const meta = metaSchema.parse(JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')));
  const skillRaw = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8');
  const files: string[] = [];
  walk(dir, dir, files);
  return { meta, skillRaw, files: files.sort() };
}

// 读取 pending pack 内任意文件，禁止路径逃逸
export function readPendingFile(slug: string, relPath: string): string {
  const dir = path.resolve(pendingPath(slug));
  const abs = path.resolve(dir, relPath);
  if (!abs.startsWith(dir + path.sep)) throw new Error(`非法路径: ${relPath}`);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) throw new Error(`文件不存在: ${relPath}`);
  return fs.readFileSync(abs, 'utf8');
}
