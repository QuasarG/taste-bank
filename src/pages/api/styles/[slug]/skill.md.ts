import type { APIRoute } from 'astro';
import { loadStyle } from '@lib/store';
import { assembleSkill } from '@lib/assemble';
import { apiError } from '@lib/api-utils';
import { incrementUsage } from '@lib/usage';

export const GET: APIRoute = ({ params }) => {
  try {
    const pack = loadStyle(params.slug!);
    incrementUsage(pack.slug);
    return new Response(assembleSkill(pack.meta, pack.tokens, pack.skillRaw), {
      headers: { 'content-type': 'text/markdown; charset=utf-8' },
    });
  } catch (e) {
    return apiError(e);
  }
};
