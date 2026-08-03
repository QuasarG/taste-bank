// 风格包缓存：~/.style-lab/cache/<slug>/ 存 pack.json + fetchedAt.json
// TTL 3 天，服务器挂时 fallback 到过期缓存（由 api.mjs 的 getStylePack 控制）
import fs from 'node:fs';
import path from 'node:path';
import { CONFIG_DIR } from './config.mjs';

const CACHE_ROOT = path.join(CONFIG_DIR, 'cache');

function cacheDir(slug) {
  return path.join(CACHE_ROOT, slug);
}

/**
 * 读缓存。无返回 null。
 * @param {string} slug
 * @returns {{data: object, fetchedAt: number} | null}
 */
export function getCache(slug) {
  try {
    const data = fs.readFileSync(path.join(cacheDir(slug), 'pack.json'), 'utf8');
    const meta = fs.readFileSync(path.join(cacheDir(slug), 'fetchedAt.json'), 'utf8');
    return { data: JSON.parse(data), fetchedAt: JSON.parse(meta).fetchedAt };
  } catch {
    return null;
  }
}

/**
 * 写缓存（覆盖）。
 * @param {string} slug
 * @param {object} data - 完整 pack
 */
export function setCache(slug, data) {
  try {
    const dir = cacheDir(slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'pack.json'), JSON.stringify(data), 'utf8');
    fs.writeFileSync(path.join(dir, 'fetchedAt.json'), JSON.stringify({ fetchedAt: Date.now(), slug }), 'utf8');
  } catch {
    // 缓存写入失败不致命，吞掉
  }
}

/** 列所有缓存的 slug（doctor 用） */
export function listCachedSlugs() {
  try {
    return fs.readdirSync(CACHE_ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
  } catch {
    return [];
  }
}

/** 缓存体检：返回 { count, oldestAgeMs } */
export function cacheHealth() {
  const slugs = listCachedSlugs();
  let oldest = Infinity;
  for (const s of slugs) {
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(CACHE_ROOT, s, 'fetchedAt.json'), 'utf8'));
      const age = Date.now() - meta.fetchedAt;
      if (age < oldest) oldest = age;
    } catch { /* skip */ }
  }
  return { count: slugs.length, oldestAgeMs: oldest === Infinity ? null : oldest };
}

export { CACHE_ROOT };
