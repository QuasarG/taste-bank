// taste-bank skill <slug>
// 直接把组装好的 SKILL.md 全文输出到 stdout，供 pipe / 粘贴。
// 注意：这是唯一一个不该加装饰的命令——输出必须纯净，能直接喂给 agent。
import { getSkillMarkdown, ApiError } from '../lib/api.mjs';
import { logErr } from '../lib/ui.mjs';
import { getI18n } from '../lib/i18n.mjs';

export async function cmdSkill(args) {
  const { t } = getI18n();
  const slug = args[0];

  if (!slug) {
    await logErr('用法：taste-bank skill <slug>');
    process.exit(1);
  }

  try {
    const md = await getSkillMarkdown(slug);
    process.stdout.write(md);
    if (!md.endsWith('\n')) process.stdout.write('\n');
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      await logErr(t('errStyleNotFound', slug));
    } else {
      await logErr(t('errApiFail', e.message));
    }
    process.exit(1);
  }
}
