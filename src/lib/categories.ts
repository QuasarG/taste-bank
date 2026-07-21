import fs from 'node:fs';
import path from 'node:path';
import { STYLES_DIR } from './store';

// 风格分类：库主审核时手动归类，落盘 STYLE_LAB_DIR/data/categories.json，{ slug: category }
function catFile(): string {
  return path.join(path.dirname(STYLES_DIR), 'data', 'categories.json');
}

export function getAllCategories(): Record<string, string> {
  try {
    const data = JSON.parse(fs.readFileSync(catFile(), 'utf8'));
    return typeof data === 'object' && data !== null ? data : {};
  } catch {
    return {};
  }
}

export function getCategory(slug: string): string | null {
  return getAllCategories()[slug] ?? null;
}

export function setCategory(slug: string, category: string): void {
  const all = getAllCategories();
  const trimmed = category.trim();
  if (trimmed) all[slug] = trimmed.slice(0, 30);
  else delete all[slug];
  fs.mkdirSync(path.dirname(catFile()), { recursive: true });
  fs.writeFileSync(catFile(), JSON.stringify(all, null, 2));
}

// 当前在用的全部分类（去重、字典序）
export function listCategories(): string[] {
  return [...new Set(Object.values(getAllCategories()))].sort();
}
