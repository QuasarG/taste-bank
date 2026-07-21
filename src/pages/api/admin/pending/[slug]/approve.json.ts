import type { APIRoute } from 'astro';
import { json, apiError } from '@lib/api-utils';
import { assertAdmin } from '@lib/admin';
import { approveStyle } from '@lib/review';
import { setCategory } from '@lib/categories';

export const POST: APIRoute = async ({ params, request }) => {
  try {
    assertAdmin(request);
    const body = (await request.json().catch(() => ({}))) as { category?: string };
    approveStyle(params.slug!);
    if (typeof body.category === 'string') setCategory(params.slug!, body.category);
    return json({ slug: params.slug, approved: true });
  } catch (e) {
    return apiError(e);
  }
};
