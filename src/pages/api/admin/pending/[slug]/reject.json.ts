import type { APIRoute } from 'astro';
import { json, apiError } from '@lib/api-utils';
import { assertAdmin } from '@lib/admin';
import { rejectStyle } from '@lib/review';

export const POST: APIRoute = ({ params, request }) => {
  try {
    assertAdmin(request);
    rejectStyle(params.slug!);
    return json({ slug: params.slug, rejected: true });
  } catch (e) {
    return apiError(e);
  }
};
