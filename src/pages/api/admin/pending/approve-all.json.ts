import type { APIRoute } from 'astro';
import { json, apiError } from '@lib/api-utils';
import { assertAdmin } from '@lib/admin';
import { approveAllStyles } from '@lib/review';

// 一键通过全部待审投稿
export const POST: APIRoute = ({ request }) => {
  try {
    assertAdmin(request);
    return json(approveAllStyles());
  } catch (e) {
    return apiError(e);
  }
};
