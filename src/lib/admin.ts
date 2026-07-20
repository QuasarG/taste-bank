import crypto from 'node:crypto';
import { StyleForbiddenError } from './errors';

// 审核管理台口令：未配置 STYLE_LAB_ADMIN_TOKEN = 管理台整体关闭
const COOKIE_NAME = 'sl_admin';
const COOKIE_MAX_AGE = 7 * 24 * 3600; // 7 天

function configuredToken(): string {
  const t = process.env.STYLE_LAB_ADMIN_TOKEN;
  if (!t) throw new StyleForbiddenError('管理台未启用（未配置 STYLE_LAB_ADMIN_TOKEN）');
  return t;
}

// 两侧都先哈希再比对，避免长度差异泄露 + 时序侧信道
function tokenEqual(a: string, b: string): boolean {
  if (!a) return false;
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function readCookie(request: Request): string | null {
  const header = request.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === COOKIE_NAME) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

export function assertAdmin(request: Request): void {
  const expected = configuredToken();
  const given = request.headers.get('x-admin-token') ?? readCookie(request) ?? '';
  if (!tokenEqual(given, expected)) throw new StyleForbiddenError('管理口令无效');
}

export function checkAdminToken(token: string): boolean {
  return tokenEqual(token, configuredToken());
}

export function adminCookie(token: string): string {
  // 裸 HTTP 阶段不带 Secure；上 HTTPS 后补上
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${COOKIE_MAX_AGE}`;
}

export function clearAdminCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
}
