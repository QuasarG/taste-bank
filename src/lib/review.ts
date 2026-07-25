import fs from 'node:fs';
import path from 'node:path';
import { STYLES_DIR } from './store';
import { metaSchema, type Meta } from './schema';
import { setCategory } from './categories';

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
  // 更新场景：live 已存在。先把旧版快照归档（带版本号+时间戳，可回滚），再覆盖。
  // 新建场景：live 不存在，走原 mkdir + rename 逻辑。
  if (fs.existsSync(to)) snapshotLegacy(slug);
  else fs.mkdirSync(STYLES_DIR, { recursive: true });
  fs.renameSync(from, to);
}

// 更新 approve 时归档旧 live：移到 data/archived/<slug>-v<旧版本>-<时间戳>/。
// 路径含版本号 + 时间戳，保留多代历史不互相覆盖。
// 注意：不复用 archiveStyle——它的路径不带版本号会覆盖历史，且会清分类。
function snapshotLegacy(slug: string): void {
  const from = path.join(STYLES_DIR, slug);
  let version = '0';
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(from, 'meta.json'), 'utf8'));
    if (typeof meta.version === 'string') version = meta.version;
  } catch {}
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const to = path.join(path.dirname(STYLES_DIR), 'data', 'archived', `${slug}-v${version}-${stamp}`);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(from, to);
}

export function rejectStyle(slug: string): void {
  const from = pendingPath(slug);
  if (!fs.existsSync(from)) throw new Error(`审核队列中不存在: ${slug}`);
  fs.rmSync(from, { recursive: true, force: true });
}

// 一键通过全部待审：逐个 approve，单个失败不拖垮整批，返回明细
export function approveAllStyles(): { approved: string[]; failed: Array<{ slug: string; error: string }> } {
  const approved: string[] = [];
  const failed: Array<{ slug: string; error: string }> = [];
  for (const slug of listPending()) {
    try {
      approveStyle(slug);
      approved.push(slug);
    } catch (e) {
      failed.push({ slug, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { approved, failed };
}

// 下架：已上架风格移入 data/archived/（可恢复），并清除其分类
export function archiveStyle(slug: string): void {
  const from = path.join(STYLES_DIR, slug);
  if (!fs.existsSync(from)) throw new Error(`风格不存在: ${slug}`);
  const to = path.join(path.dirname(STYLES_DIR), 'data', 'archived', slug);
  fs.rmSync(to, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(from, to);
  setCategory(slug, '');
}

// —— 管理台读取：单条损坏不拖垮全列表 ——
export interface PendingEntry {
  slug: string;
  meta?: Meta;
  error?: string;
  isUpdate?: boolean; // live 已存在该 slug，本次是更新而非新投
  liveVersion?: string; // 若 isUpdate，当前 live 版本号（供 admin 显示 v旧→v新）
}

export function listPendingMeta(): PendingEntry[] {
  return listPending().map((slug) => {
    try {
      const meta = metaSchema.parse(JSON.parse(fs.readFileSync(path.join(pendingPath(slug), 'meta.json'), 'utf8')));
      const liveDir = path.join(STYLES_DIR, slug);
      const isUpdate = fs.existsSync(liveDir);
      let liveVersion: string | undefined;
      if (isUpdate) {
        try {
          const liveMeta = JSON.parse(fs.readFileSync(path.join(liveDir, 'meta.json'), 'utf8'));
          if (typeof liveMeta.version === 'string') liveVersion = liveMeta.version;
        } catch {}
      }
      return { slug, meta, isUpdate, liveVersion };
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
