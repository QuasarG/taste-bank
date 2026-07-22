import { z } from 'zod';

// 危险片段黑名单：任何字符串值命中即拒收，防注入
const FORBIDDEN = [
  /url\s*\(/i,
  /@import/i,
  /expression\s*\(/i,
  /javascript:/i,
  /<\s*script/i,
  // HTML 属性面：事件处理器、嵌套浏览上下文、外链资源、刷新跳转
  /<\s*iframe/i,
  /<\s*link\b/i,
  /<\s*base\b/i,
  /http-equiv\s*=\s*["']?refresh/i,
  /\son[a-z]+\s*=/i,
];

export const safeString = z
  .string()
  .max(500)
  .refine((v) => !FORBIDDEN.some((r) => r.test(v)), '包含危险片段');

// 高置信度密钥/隐私模式，命中即拒收（语义隐私靠投稿方自查，见 SKILL.md 提炼工作流）
const SECRETS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /AKIA[0-9A-Z]{16}/,
  /ghp_[A-Za-z0-9]{36}/,
  /sk-[A-Za-z0-9]{20,}/,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
];

// 长文本版（SKILL.md / overrides / 模板内容），同一份黑名单
export const safeText = z
  .string()
  .max(200_000)
  .refine((v) => !FORBIDDEN.some((r) => r.test(v)), '包含危险片段')
  .refine((v) => !SECRETS.some((r) => r.test(v)), '疑似包含密钥或隐私信息，请先脱敏');

// 颜色：hex（含 hex8 透明度）或 rgb()/rgba()
export const hexColor = z
  .string()
  .regex(
    /^(#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\))$/,
    '必须是合法颜色（hex / hex8 / rgb() / rgba()）',
  );

export const length = z
  .string()
  .regex(/^\d+(\.\d+)?(px|rem|em|%|vh|vw|ms|s)$/, '必须是合法长度或时间值');

export const tokensSchema = z.object({
  color: z
    .object({
      bg: hexColor,
      surface: hexColor,
      text: hexColor,
      muted: hexColor,
      line: hexColor,
      accent: hexColor,
    })
    .catchall(hexColor),
  font: z.object({
    display: safeString,
    body: safeString,
    mono: safeString.optional(),
    utility: safeString.optional(),
  }),
  size: z
    .object({ display: length, h1: length, h2: length, body: length, small: length })
    .catchall(length),
  space: z.object({ sm: length, md: length, lg: length }).catchall(length),
  radius: z.object({ sm: length, md: length }).catchall(length),
  shadow: z.object({ card: safeString }).catchall(safeString),
  motion: z.object({ duration: length, easing: safeString }),
});

export const metaSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'slug 只允许小写字母数字和连字符'),
  name: z.string().min(1).max(60),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, '版本号必须是 x.y.z'),
  summary: z.string().max(200),
  mood: z.array(z.string().max(20)).max(8),
  useCase: z.string().max(200),
  signature: z.string().max(200),
  rules: z.object({
    do: z.array(z.string().max(200)).default([]),
    dont: z.array(z.string().max(200)).default([]),
    voice: z.string().max(500).default(''),
  }),
  author: z.string().max(60).default('anonymous'),
  // 作者主页（如 GitHub），投稿方须征得作者本人同意后填写
  authorUrl: z.string().max(200).regex(/^https:\/\/[^\s]+$/, 'authorUrl 必须是 https 链接').optional(),
  createdAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期必须是 YYYY-MM-DD'),
});

export type Tokens = z.infer<typeof tokensSchema>;
export type Meta = z.infer<typeof metaSchema>;
