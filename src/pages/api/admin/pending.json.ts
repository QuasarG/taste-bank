import type { APIRoute } from 'astro';
import { json, apiError } from '@lib/api-utils';
import { assertAdmin } from '@lib/admin';
import { listPendingMeta } from '@lib/review';

export const GET: APIRoute = ({ request }) => {
  try {
    assertAdmin(request);
    const entries = listPendingMeta();
    return json({
      count: entries.length,
      pending: entries.map((e) =>
        e.meta
          ? {
              slug: e.slug,
              name: e.meta.name,
              version: e.meta.version,
              mood: e.meta.mood,
              useCase: e.meta.useCase,
              summary: e.meta.summary,
              author: e.meta.author,
              createdAt: e.meta.createdAt,
            }
          : { slug: e.slug, error: e.error },
      ),
    });
  } catch (e) {
    return apiError(e);
  }
};
