import type { APIRoute } from 'astro';
import fs from 'node:fs';
import { ensureScreenshot } from '@lib/screenshot';
import { apiError } from '@lib/api-utils';

export const GET: APIRoute = async ({ params, request }) => {
  try {
    const file = new URL(request.url).searchParams.get('file') ?? 'page.html';
    if (!/^[\w][\w.-]*\.html$/.test(file)) throw new Error(`非法模板文件名: ${file}`);
    const templateUrl = new URL(`/styles/${params.slug}/template.html?file=${file}`, request.url);
    const png = await ensureScreenshot(params.slug!, templateUrl.toString(), file);
    return new Response(fs.readFileSync(png), {
      headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=60' },
    });
  } catch (e) {
    return apiError(e);
  }
};
