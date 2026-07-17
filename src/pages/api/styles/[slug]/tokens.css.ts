import type { APIRoute } from 'astro';
import { loadStyle } from '@lib/store';
import { fullCss } from '@lib/assemble';
import { apiError } from '@lib/api-utils';

export const GET: APIRoute = ({ params }) => {
  try {
    const pack = loadStyle(params.slug!);
    return new Response(fullCss(params.slug!, pack.tokens, pack.overrides), {
      headers: { 'content-type': 'text/css; charset=utf-8' },
    });
  } catch (e) {
    return apiError(e);
  }
};
