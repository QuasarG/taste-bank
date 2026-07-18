import type { APIRoute } from 'astro';
import { readStyleFile } from '@lib/store';
import { apiError } from '@lib/api-utils';

// 把 pack 内的模板 HTML 原样吐给 iframe 渲染，默认 page.html
export const GET: APIRoute = ({ params, request }) => {
  try {
    const file = new URL(request.url).searchParams.get('file') ?? 'page.html';
    if (!/^[\w][\w.-]*\.html$/.test(file)) throw new Error(`非法模板文件名: ${file}`);
    const html = readStyleFile(params.slug!, `templates/${file}`);
    return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  } catch (e) {
    return apiError(e);
  }
};
