import type { APIRoute } from 'astro';
import { listApplicants } from '@lib/applicants';
import { assertAdmin } from '@lib/admin';
import { json, apiError } from '@lib/api-utils';

export const GET: APIRoute = ({ request }) => {
  try {
    assertAdmin(request);
    return json({ applicants: listApplicants() });
  } catch (e) {
    return apiError(e);
  }
};
