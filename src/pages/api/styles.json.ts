import type { APIRoute } from 'astro';
import { listStyles, loadStyle } from '@lib/store';
import { createStylePack } from '@lib/create';
import { json, apiError } from '@lib/api-utils';

export const GET: APIRoute = ({ request }) => {
  try {
    const q = new URL(request.url).searchParams.get('q')?.toLowerCase();
    let list = listStyles().map((slug) => {
      const { meta } = loadStyle(slug);
      return { slug, name: meta.name, version: meta.version, mood: meta.mood, useCase: meta.useCase, summary: meta.summary };
    });
    if (q) {
      list = list.filter((s) =>
        [s.slug, s.name, s.summary, s.useCase, ...s.mood].join(' ').toLowerCase().includes(q),
      );
    }
    return json({ count: list.length, styles: list });
  } catch (e) {
    return apiError(e);
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    return json(createStylePack(body), 201);
  } catch (e) {
    if (e instanceof SyntaxError) return json({ error: '请求体不是合法 JSON' }, 400);
    return apiError(e);
  }
};
