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

// ---------- v0.3：身份写入 helpers + key 校验 ----------

/** 通用安全写入纯文本（确保目录存在） */
export function writeText(file, content, { mode } = {}) {
  ensureDir();
  const opts = mode ? { mode } : {};
  fs.writeFileSync(file, content + (content.endsWith('\n') ? '' : '\n'), { ...opts, encoding: 'utf8' });
}

/** 写作者名 */
export function writeAuthor(name) {
  writeText(FILES.author, name);
}

/** 写作者主页 */
export function writeAuthorUrl(url) {
  writeText(FILES.authorUrl, url);
}

/** 写 config.json（合并写入，不覆盖其他字段） */
export function writeConfig(patch) {
  const current = readConfig();
  const next = { ...current, ...patch };
  ensureDir();
  fs.writeFileSync(FILES.config, JSON.stringify(next, null, 2) + '\n', 'utf8');
}

/** 写邀请码到 config.json */
export function writeInviteCode(code) {
  writeConfig({ inviteCode: code });
}

/** 检查密钥对是否成对且完整 */
export function keyPairStatus() {
  const hasPriv = fs.existsSync(FILES.privateKey);
  const hasPub = fs.existsSync(FILES.publicKey);
  let privValid = false;
  let pubValid = false;
  if (hasPriv) {
    const content = readText(FILES.privateKey);
    privValid = !!(content && content.length > 30 && /^[A-Za-z0-9+/=]+$/.test(content));
  }
  if (hasPub) {
    const content = readText(FILES.publicKey);
    pubValid = !!(content && content.length > 30 && /^[A-Za-z0-9+/=]+$/.test(content));
  }
  return {
    hasPrivateKey: hasPriv,
    hasPublicKey: hasPub,
    privateKeyValid: privValid,
    publicKeyValid: pubValid,
    complete: hasPriv && hasPub && privValid && pubValid,
    orphaned: (!hasPriv && hasPub) || (hasPriv && !hasPub), // 只有一个
  };
}
