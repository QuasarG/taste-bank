import type { APIRoute } from 'astro';
import { assertAdmin } from '../../../lib/admin';
import { apiError } from '../../../lib/api-utils';
import { getTodayStats } from '../../../lib/stats';

export const GET: APIRoute = ({ request }) => {
  try {
    assertAdmin(request);
    return new Response(JSON.stringify(getTodayStats()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    return apiError(e);
  }
};
