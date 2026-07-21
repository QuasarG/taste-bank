import fs from 'node:fs';
import path from 'node:path';
import { STYLES_DIR, listStyles } from './store';

// 引用计数：agent 每取一次某风格的 SKILL（MCP 或 HTTP），计数 +1
// 落盘在 STYLE_LAB_DIR/data/usage.json，{ slug: count }
function usageFile(): string {
  return path.join(path.dirname(STYLES_DIR), 'data', 'usage.json');
}

export function getAllUsage(): Record<string, number> {
  try {
    const data = JSON.parse(fs.readFileSync(usageFile(), 'utf8'));
    return typeof data === 'object' && data !== null ? data : {};
  } catch {
    return {};
  }
}

export function getUsage(slug: string): number {
  return getAllUsage()[slug] ?? 0;
}

export function incrementUsage(slug: string): number {
  const all = getAllUsage();
  all[slug] = (all[slug] ?? 0) + 1;
  fs.mkdirSync(path.dirname(usageFile()), { recursive: true });
  fs.writeFileSync(usageFile(), JSON.stringify(all, null, 2));
  return all[slug];
}

// 引用量 Top N（仅统计仍在架的风格；并列按 slug 字典序，保证稳定）
export function getTopSlugs(n: number): string[] {
  const all = getAllUsage();
  return listStyles()
    .map((slug) => ({ slug, count: all[slug] ?? 0 }))
    .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug))
    .slice(0, n)
    .map((e) => e.slug);
}

// 某作者全部风格的总引用量
export function getAuthorUsage(authorStyles: string[]): number {
  const all = getAllUsage();
  return authorStyles.reduce((sum, slug) => sum + (all[slug] ?? 0), 0);
}
