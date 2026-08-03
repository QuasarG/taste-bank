// 项目级 ./.style-lab/ 存储（与全局 ~/.style-lab/ 区分）
// 当前唯一用途：used.json 记录"这个项目用了哪些风格、什么版本"
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_DIR = path.join(process.cwd(), '.style-lab');
const USED_FILE = path.join(PROJECT_DIR, 'used.json');

/**
 * 读项目级 used.json。无返回空数组。
 * @returns {Array<{slug: string, version: string, usedAt: string}>}
 */
export function readProjectUsage() {
  try {
    return JSON.parse(fs.readFileSync(USED_FILE, 'utf8')) || [];
  } catch {
    return [];
  }
}

/**
 * upsert 一条使用记录（同 slug 更新 version + usedAt）。
 * @param {{slug: string, version: string}} entry
 */
export function recordProjectUsage({ slug, version }) {
  const list = readProjectUsage();
  const idx = list.findIndex((e) => e.slug === slug);
  const record = { slug, version, usedAt: new Date().toISOString() };
  if (idx >= 0) list[idx] = record;
  else list.push(record);
  try {
    fs.mkdirSync(PROJECT_DIR, { recursive: true });
    fs.writeFileSync(USED_FILE, JSON.stringify(list, null, 2) + '\n', 'utf8');
  } catch {
    // 写失败不致命（use 命令的核心是写规则文件，记录是副产物）
  }
}

export { PROJECT_DIR, USED_FILE };
