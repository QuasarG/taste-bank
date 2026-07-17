import type { APIRoute } from 'astro';
import { loadStyle } from '@lib/store';
import { json, apiError } from '@lib/api-utils';

export const GET: APIRoute = ({ params }) => {
  try {
    const pack = loadStyle(params.slug!);
    return json({ meta: pack.meta, tokens: pack.tokens, files: pack.files });
  } catch (e) {
    return apiError(e);
  }
};
