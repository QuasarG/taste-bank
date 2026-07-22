import type { APIRoute } from 'astro';
import { json, apiError } from '@lib/api-utils';
import { assertAdmin } from '@lib/admin';
import { archiveStyle } from '@lib/review';

// 下架已上架风格（移入 data/archived/，可恢复）
export const POST: APIRoute = ({ params, request }) => {
  try {
    assertAdmin(request);
    archiveStyle(params.slug!);
    return json({ slug: params.slug, archived: true });
  } catch (e) {
    return apiError(e);
  }
};
