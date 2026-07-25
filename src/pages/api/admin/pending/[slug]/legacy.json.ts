import type { APIRoute } from 'astro';
import path from 'node:path';
import fs from 'node:fs';
import { json, apiError } from '@lib/api-utils';
import { assertAdmin } from '@lib/admin';
import { STYLES_DIR } from '@lib/store';
import { metaSchema } from '@lib/schema';

// 供审核页 diff 用：读取该 slug 当前 live 版本的 meta + skill。
// 仅在 isUpdate=true（pending 是更新、live 已存在）时有意义。
export const GET: APIRoute = ({ params, request }) => {
  try {
    assertAdmin(request);
    const dir = path.join(STYLES_DIR, params.slug!);
    if (!fs.existsSync(dir)) {
      return json({ error: `live 版本不存在: ${params.slug}` }, 404);
    }
    const meta = metaSchema.parse(JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')));
    const skill = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8');
    return json({ slug: params.slug, meta, skill });
  } catch (e) {
    return apiError(e);
  }
};
