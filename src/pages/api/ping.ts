import type { APIRoute } from 'astro';
import { trackVisit } from '../../lib/stats';

export const GET: APIRoute = () => {
  trackVisit();
  return new Response(null, { status: 204 });
};
