import type { APIRoute } from 'astro';
import { json, apiError } from '@lib/api-utils';
import { assertAdmin } from '@lib/admin';
import { approveStyle } from '@lib/review';

export const POST: APIRoute = ({ params, request }) => {
  try {
    assertAdmin(request);
    approveStyle(params.slug!);
    return json({ slug: params.slug, approved: true });
  } catch (e) {
    return apiError(e);
  }
};
