import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ensureScreenshot } from '@lib/screenshot';
import { apiError } from '@lib/api-utils';

// 截图文件名含内容 hash（<slug>-<hash>.png），内容变则文件名变 → 天然版本化，
// 可以安全用 immutable + 长缓存。ETag 用文件名 hash，支持 304。
export const GET: APIRoute = async ({ params, request }) => {
  try {
    const file = new URL(request.url).searchParams.get('file') ?? 'page.html';
    if (!/^[\w][\w.-]*\.html$/.test(file)) throw new Error(`非法模板文件名: ${file}`);
    const templateUrl = new URL(`/styles/${params.slug}/template.html?file=${file}`, request.url);
    const png = await ensureScreenshot(params.slug!, templateUrl.toString(), file);

    // ETag 基于文件名（含内容 hash），稳定且无需读文件内容算 hash
    const etag = `"${crypto.createHash('sha1').update(path.basename(png)).digest('hex').slice(0, 16)}"`;
    if (request.headers.get('if-none-match') === etag) {
      return new Response(null, { status: 304, headers: { etag } });
    }

    return new Response(fs.readFileSync(png), {
      headers: {
        'content-type': 'image/png',
        // 文件名含内容 hash，可 immutable；浏览器/CDN 缓存 7 天
        'cache-control': 'public, max-age=604800, immutable',
        etag,
      },
    });
  } catch (e) {
    return apiError(e);
  }
};
