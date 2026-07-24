import type { APIRoute } from 'astro';
import { assertAdmin } from '../../../lib/admin';
import { getTodayStats } from '../../../lib/stats';

export const GET: APIRoute = async ({ request }) => {
  assertAdmin(request);
  return new Response(JSON.stringify(getTodayStats()), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
