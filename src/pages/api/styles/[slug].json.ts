import type { APIRoute } from 'astro';
import { loadStyle } from '@lib/store';
import { updateStylePack, deleteStylePack } from '@lib/create';
import { json, apiError } from '@lib/api-utils';

export const GET: APIRoute = ({ params }) => {
  try {
    const pack = loadStyle(params.slug!);
    return json({ meta: pack.meta, tokens: pack.tokens, files: pack.files });
  } catch (e) {
    return apiError(e);
  }
};

function headerAuth(request: Request) {
  return {
    timestamp: request.headers.get('x-timestamp') ?? '',
    signature: request.headers.get('x-signature') ?? '',
  };
}

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const raw = await request.text();
    const body = JSON.parse(raw);
    if (body?.meta?.slug && body.meta.slug !== params.slug) {
      return json({ error: `body 的 slug (${body.meta.slug}) 与路径 (${params.slug}) 不一致` }, 400);
    }
    return json(updateStylePack(body, headerAuth(request), raw));
  } catch (e) {
    if (e instanceof SyntaxError) return json({ error: '请求体不是合法 JSON' }, 400);
    return apiError(e);
  }
};

export const DELETE: APIRoute = ({ params, request }) => {
  try {
    return json(deleteStylePack(params.slug!, headerAuth(request)));
  } catch (e) {
    return apiError(e);
  }
};
