import type { APIRoute } from 'astro';
import { readPendingFile } from '@lib/review';
import { assertAdmin } from '@lib/admin';
import { apiError } from '@lib/api-utils';

// 待审模板预览：与公开 template 路由同一份 CSP（禁脚本禁外链），仅管理台可见
export const GET: APIRoute = ({ params, request }) => {
  try {
    assertAdmin(request);
    const file = new URL(request.url).searchParams.get('file') ?? 'page.html';
    if (!/^[\w][\w.-]*\.html$/.test(file)) throw new Error(`非法模板文件名: ${file}`);
    const html = readPendingFile(params.slug!, `templates/${file}`);
    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'content-security-policy':
          "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; object-src 'none'; base-uri 'none'; form-action 'none'",
      },
    });
  } catch (e) {
    return apiError(e);
  }
};
