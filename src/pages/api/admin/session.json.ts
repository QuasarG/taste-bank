import type { APIRoute } from 'astro';
import { json, apiError } from '@lib/api-utils';
import { assertAdmin, checkAdminToken, adminCookie, clearAdminCookie } from '@lib/admin';
import { StyleForbiddenError } from '@lib/errors';

// 管理台会话：GET 探测登录态，POST 口令登录（发 Cookie），DELETE 退出
export const GET: APIRoute = ({ request }) => {
  try {
    assertAdmin(request);
    return json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json().catch(() => ({}))) as { token?: unknown };
    const token = String(body.token ?? '');
    if (!checkAdminToken(token)) throw new StyleForbiddenError('管理口令无效');
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json; charset=utf-8', 'set-cookie': adminCookie(token) },
    });
  } catch (e) {
    return apiError(e);
  }
};

export const DELETE: APIRoute = () => {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'set-cookie': clearAdminCookie() },
  });
};
