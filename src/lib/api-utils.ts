import { ZodError } from 'zod';
import { StyleConflictError, StyleForbiddenError, StyleVersionError } from './create';

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export function apiError(e: unknown): Response {
  if (e instanceof ZodError) return json({ error: '校验失败', issues: e.issues }, 400);
  if (e instanceof StyleConflictError) return json({ error: e.message }, 409);
  if (e instanceof StyleForbiddenError) return json({ error: e.message }, 403);
  if (e instanceof StyleVersionError) return json({ error: e.message }, 400);
  if (e instanceof Error && e.message.startsWith('风格不存在')) return json({ error: e.message }, 404);
  if (e instanceof Error && (e.message.startsWith('文件不存在') || e.message.startsWith('非法'))) {
    return json({ error: e.message }, 404);
  }
  return json({ error: String(e) }, 500);
}
