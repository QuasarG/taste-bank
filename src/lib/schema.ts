import { z } from 'zod';

// 危险片段黑名单：任何字符串值命中即拒收，防注入
const FORBIDDEN = [/url\s*\(/i, /@import/i, /expression\s*\(/i, /javascript:/i, /<\s*script/i];

export const safeString = z
  .string()
  .max(500)
  .refine((v) => !FORBIDDEN.some((r) => r.test(v)), '包含危险片段');

export const hexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, '必须是合法 hex 颜色');

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
  createdAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期必须是 YYYY-MM-DD'),
});

export type Tokens = z.infer<typeof tokensSchema>;
export type Meta = z.infer<typeof metaSchema>;
