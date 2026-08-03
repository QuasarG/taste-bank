// 配置读写：~/.style-lab/ 目录的文件约定
// v1 只读取（透传给将来投稿用），不写入。config.json 是 v1 新增文件，老用户没有不影响。
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const HOME = os.homedir();
export const CONFIG_DIR = path.join(HOME, '.style-lab');

export const FILES = {
  privateKey: path.join(CONFIG_DIR, 'private.key'),
  publicKey: path.join(CONFIG_DIR, 'public.key'),
  author: path.join(CONFIG_DIR, 'author'),
  authorUrl: path.join(CONFIG_DIR, 'author_url'),
  config: path.join(CONFIG_DIR, 'config.json'),
  favorites: path.join(CONFIG_DIR, 'favorites.json'),
  submissions: path.join(CONFIG_DIR, 'submissions.json'),
};

/** 安全读纯文本单值文件（不存在/读失败返回 null） */
export function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8').trim() || null;
  } catch {
    return null;
  }
}

/**
 * 读 config.json。文件缺失或损坏返回 {}。
 * 字段：{ inviteCode?, mcpUrl? }
 * @returns {{inviteCode?: string, mcpUrl?: string}}
 */
export function readConfig() {
  try {
    const raw = fs.readFileSync(FILES.config, 'utf8');
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

/** config.json 是否存在 */
export function configExists() {
  return fs.existsSync(FILES.config);
}

/**
 * 探测身份：哪些文件存在、对应什么状态。
 * 用于 doctor / setup 的环境检测步骤（只读，不改）。
 */
export function detectIdentity() {
  return {
    hasDir: fs.existsSync(CONFIG_DIR),
    hasPrivateKey: fs.existsSync(FILES.privateKey),
    hasPublicKey: fs.existsSync(FILES.publicKey),
    author: readText(FILES.author),
    authorUrl: readText(FILES.authorUrl),
    hasConfig: configExists(),
    config: readConfig(),
  };
}

// ---------- v0.2：收藏 + 投稿记录 ----------

/** 读收藏 slug 列表。无文件返回空数组 */
export function readFavorites() {
  try {
    const arr = JSON.parse(fs.readFileSync(FILES.favorites, 'utf8'));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** 写收藏列表（覆盖） */
export function writeFavorites(list) {
  ensureDir();
  fs.writeFileSync(FILES.favorites, JSON.stringify(list, null, 2) + '\n', 'utf8');
}

/** 加收藏（去重） */
export function addFavorite(slug) {
  const list = readFavorites();
  if (!list.includes(slug)) list.push(slug);
  writeFavorites(list);
  return list;
}

/** 移除收藏 */
export function removeFavorite(slug) {
  const list = readFavorites().filter((s) => s !== slug);
  writeFavorites(list);
  return list;
}

/** 读投稿记录。无返回空数组。每条 {slug, version, submittedAt, status} */
export function readSubmissions() {
  try {
    const arr = JSON.parse(fs.readFileSync(FILES.submissions, 'utf8'));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** 追加一条投稿记录（投稿成功后调） */
export function recordSubmission(entry) {
  const list = readSubmissions();
  list.push({ status: 'pending', ...entry, submittedAt: new Date().toISOString() });
  ensureDir();
  fs.writeFileSync(FILES.submissions, JSON.stringify(list, null, 2) + '\n', 'utf8');
}

function ensureDir() {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
}
