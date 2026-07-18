import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { metaSchema, tokensSchema, safeText } from './schema';
import { STYLES_DIR, loadStyle } from './store';
import { canonicalMessage, isValidPubkey, timestampInWindow, verifyMessage } from './auth';

export class StyleConflictError extends Error {}
export class StyleForbiddenError extends Error {}
export class StyleVersionError extends Error {}

// 投稿契约：meta/tokens 走校验，skill 至少 50 字，模板文件名白名单，ownerPubkey 登记所有权
export const submitSchema = z.object({
  meta: metaSchema,
  tokens: tokensSchema,
  skill: safeText.refine((v) => v.trim().length >= 50, 'SKILL.md 太短，至少 50 字'),
  overrides: safeText.optional(),
  templates: z.record(z.string(), safeText).optional(),
  ownerPubkey: z.string().max(200).refine(isValidPubkey, 'ownerPubkey 不是合法 ed25519 公钥').optional(),
});

export const authSchema = z.object({
  timestamp: z.string().max(32),
  signature: z.string().max(200),
});

const TEMPLATE_NAME = /^[\w][\w.-]*\.(html|css|vue|jsx|tsx|svelte|md)$/;

export interface SubmitResult {
  slug: string;
  files: string[];
}

function validateTemplates(templates: Record<string, string>): string[] {
  const names = Object.keys(templates);
  if (!names.some((n) => n.endsWith('.html'))) throw new Error('templates 至少包含一个 .html 文件');
  for (const n of names) {
    if (!TEMPLATE_NAME.test(n)) throw new Error(`非法模板文件名: ${n}`);
  }
  return names;
}

function writePack(dir: string, data: z.infer<typeof submitSchema>, names: string[]): string[] {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'templates'), { recursive: true });
  const written: string[] = [];
  const put = (rel: string, content: string) => {
    fs.writeFileSync(path.join(dir, rel), content, 'utf8');
    written.push(rel);
  };
  put('meta.json', JSON.stringify(data.meta, null, 2) + '\n');
  put('tokens.json', JSON.stringify(data.tokens, null, 2) + '\n');
  put('SKILL.md', data.skill.trim() + '\n');
  if (data.overrides) put('overrides.css', data.overrides.trim() + '\n');
  const templates = data.templates ?? {};
  for (const n of names) put(`templates/${n}`, templates[n]);
  if (data.ownerPubkey) put('owner.key', data.ownerPubkey + '\n');
  return written;
}

export function createStylePack(input: unknown): SubmitResult {
  const data = submitSchema.parse(input);
  const dir = path.join(STYLES_DIR, data.meta.slug);
  if (fs.existsSync(dir)) {
    throw new StyleConflictError(`风格已存在: ${data.meta.slug}，更新请走 PUT /api/styles/:slug.json 或 update_style`);
  }
  const names = validateTemplates(data.templates ?? {});
  return { slug: data.meta.slug, files: writePack(dir, data, names) };
}

// 验明正身：仅登记过 owner.key 的风格可管理，签名证明持有对应私钥
function assertOwnership(slug: string, action: string, payload: string, auth: unknown): void {
  const dir = path.join(STYLES_DIR, slug);
  if (!fs.existsSync(dir)) throw new Error(`风格不存在: ${slug}`);
  const ownerPath = path.join(dir, 'owner.key');
  if (!fs.existsSync(ownerPath)) throw new StyleForbiddenError(`风格 ${slug} 未登记所有者，不可管理`);
  const { timestamp, signature } = authSchema.parse(auth);
  if (!timestampInWindow(timestamp)) throw new StyleForbiddenError('timestamp 超出 5 分钟窗口');
  const owner = fs.readFileSync(ownerPath, 'utf8').trim();
  if (!verifyMessage(canonicalMessage(action, slug, timestamp, payload), signature, owner)) {
    throw new StyleForbiddenError('签名验证失败');
  }
}

export function updateStylePack(input: unknown, auth: unknown, rawPayload: string): SubmitResult {
  const data = submitSchema.parse(input);
  const slug = data.meta.slug;
  assertOwnership(slug, 'update', rawPayload, auth);
  const existing = loadStyle(slug);
  if (compareVersion(data.meta.version, existing.meta.version) <= 0) {
    throw new StyleVersionError(`version ${data.meta.version} 必须大于现有版本 ${existing.meta.version}`);
  }
  // 所有权跨更新保留，除非显式换新公钥
  data.ownerPubkey ??= fs.readFileSync(path.join(STYLES_DIR, slug, 'owner.key'), 'utf8').trim();
  const names = validateTemplates(data.templates ?? {});
  return { slug, files: writePack(path.join(STYLES_DIR, slug), data, names) };
}

export function deleteStylePack(slug: string, auth: unknown): { slug: string; deleted: true } {
  assertOwnership(slug, 'delete', '', auth);
  fs.rmSync(path.join(STYLES_DIR, slug), { recursive: true, force: true });
  return { slug, deleted: true };
}

function compareVersion(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}
