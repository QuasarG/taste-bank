import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { metaSchema, tokensSchema, type Meta, type Tokens } from './schema';

// 三级兜底：Astro 构建期模块会被打包挪窝，不能只靠 import.meta.url
function resolveStylesDir(): string {
  if (process.env.STYLE_LAB_DIR) return path.resolve(process.env.STYLE_LAB_DIR, 'styles');
  const fromCwd = path.resolve(process.cwd(), 'styles');
  if (fs.existsSync(fromCwd)) return fromCwd;
  return fileURLToPath(new URL('../../styles/', import.meta.url));
}

export const STYLES_DIR = resolveStylesDir();

export interface StylePack {
  slug: string;
  meta: Meta;
  tokens: Tokens;
  skillRaw: string;
  overrides: string | null;
  files: string[];
}

export function listStyles(): string[] {
  if (!fs.existsSync(STYLES_DIR)) return [];
  return fs
    .readdirSync(STYLES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function walk(dir: string, base: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, base, out);
    else out.push(path.relative(base, abs).split(path.sep).join('/'));
  }
}

export function loadStyle(slug: string): StylePack {
  const dir = path.join(STYLES_DIR, slug);
  if (!fs.existsSync(dir)) throw new Error(`风格不存在: ${slug}`);
  const meta = metaSchema.parse(JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')));
  if (meta.slug !== slug) throw new Error(`meta.slug (${meta.slug}) 与目录名 (${slug}) 不一致`);
  const tokens = tokensSchema.parse(JSON.parse(fs.readFileSync(path.join(dir, 'tokens.json'), 'utf8')));
  const skillRaw = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8');
  const ovPath = path.join(dir, 'overrides.css');
  const overrides = fs.existsSync(ovPath) ? fs.readFileSync(ovPath, 'utf8') : null;
  const files: string[] = [];
  walk(dir, dir, files);
  return { slug, meta, tokens, skillRaw, overrides, files: files.sort() };
}

// 读取 pack 内任意文件，禁止路径逃逸
export function readStyleFile(slug: string, relPath: string): string {
  const dir = path.resolve(STYLES_DIR, slug);
  const abs = path.resolve(dir, relPath);
  if (!abs.startsWith(dir + path.sep)) throw new Error(`非法路径: ${relPath}`);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) throw new Error(`文件不存在: ${relPath}`);
  return fs.readFileSync(abs, 'utf8');
}
