import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { metaSchema, tokensSchema, safeText } from './schema';
import { STYLES_DIR } from './store';

export class StyleConflictError extends Error {}

// 投稿契约：meta/tokens 走校验，skill 至少 50 字，模板文件名白名单
export const submitSchema = z.object({
  meta: metaSchema,
  tokens: tokensSchema,
  skill: safeText.refine((v) => v.trim().length >= 50, 'SKILL.md 太短，至少 50 字'),
  overrides: safeText.optional(),
  templates: z.record(z.string(), safeText).optional(),
});

const TEMPLATE_NAME = /^[\w][\w.-]*\.(html|css|vue|jsx|tsx|svelte|md)$/;

export interface SubmitResult {
  slug: string;
  files: string[];
}

export function createStylePack(input: unknown): SubmitResult {
  const data = submitSchema.parse(input);
  const slug = data.meta.slug;
  const dir = path.join(STYLES_DIR, slug);
  if (fs.existsSync(dir)) throw new StyleConflictError(`风格已存在: ${slug}`);

  const templates = data.templates ?? {};
  const names = Object.keys(templates);
  if (!names.some((n) => n.endsWith('.html'))) throw new Error('templates 至少包含一个 .html 文件');
  for (const n of names) {
    if (!TEMPLATE_NAME.test(n)) throw new Error(`非法模板文件名: ${n}`);
  }

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
  for (const n of names) put(`templates/${n}`, templates[n]);
  return { slug, files: written };
}
