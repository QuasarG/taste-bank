import type { APIRoute } from 'astro';
import { loadStyle } from '@lib/store';
import { assembleSkill } from '@lib/assemble';
import { apiError, realIp } from '@lib/api-utils';
import { incrementUsageLimited } from '@lib/usage';

export const GET: APIRoute = ({ params, request }) => {
  try {
    const pack = loadStyle(params.slug!);
    incrementUsageLimited(pack.slug, realIp(request));
    return new Response(assembleSkill(pack.meta, pack.tokens, pack.skillRaw), {
      headers: { 'content-type': 'text/markdown; charset=utf-8' },
    });
  } catch (e) {
    return apiError(e);
  }
};
