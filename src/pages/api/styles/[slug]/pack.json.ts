import type { APIRoute } from 'astro';
import { loadStyle, readStyleFile } from '@lib/store';
import { assembleSkill, fullCss } from '@lib/assemble';
import { json, apiError } from '@lib/api-utils';
import { incrementUsage } from '@lib/usage';

// 完整风格包：一次返回 meta + tokens + skill(含安全须知+tokens附录) + css(含overrides) + 全部模板文件内容。
// 给 CLI/agent 当上下文用——agent 调一次拿全，不再需要逐个文件拉。
export const GET: APIRoute = ({ params }) => {
  try {
    const slug = params.slug!;
    const pack = loadStyle(slug);
    incrementUsage(pack.slug);

    // 组装 templates 内容 map：key 去掉 "templates/" 前缀，value 为文件全文
    const templates: Record<string, string> = {};
    for (const rel of pack.files) {
      if (!rel.startsWith('templates/')) continue;
      const name = rel.slice('templates/'.length);
      templates[name] = readStyleFile(slug, rel);
    }

    return json({
      meta: pack.meta,
      tokens: pack.tokens,
      skill: assembleSkill(pack.meta, pack.tokens, pack.skillRaw),
      css: fullCss(slug, pack.tokens, pack.overrides),
      templates,
      version: pack.meta.version,
    });
  } catch (e) {
    return apiError(e);
  }
};
