import type { APIRoute } from 'astro';
import { json, apiError } from '@lib/api-utils';
import { assertAdmin } from '@lib/admin';
import { loadPendingDetail } from '@lib/review';

export const GET: APIRoute = ({ params, request }) => {
  try {
    assertAdmin(request);
    const d = loadPendingDetail(params.slug!);
    return json({ slug: params.slug, meta: d.meta, skill: d.skillRaw, files: d.files });
  } catch (e) {
    return apiError(e);
  }
};
