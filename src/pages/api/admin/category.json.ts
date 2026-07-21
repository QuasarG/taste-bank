import type { APIRoute } from 'astro';
import { json, apiError } from '@lib/api-utils';
import { assertAdmin } from '@lib/admin';
import { setCategory } from '@lib/categories';
import { loadStyle } from '@lib/store';

// 调整已上架风格的分类：POST { slug, category }（category 为空串则清除）
export const POST: APIRoute = async ({ request }) => {
  try {
    assertAdmin(request);
    const body = (await request.json()) as { slug?: string; category?: string };
    if (typeof body.slug !== 'string' || typeof body.category !== 'string') throw new Error('需要 { slug, category }');
    loadStyle(body.slug); // 确认风格存在
    setCategory(body.slug, body.category);
    return json({ slug: body.slug, category: body.category.trim() || null });
  } catch (e) {
    return apiError(e);
  }
};
