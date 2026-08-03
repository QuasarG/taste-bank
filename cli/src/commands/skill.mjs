// taste-bank skill <slug> [--md]
// v0.2：默认输出完整 pack 的 JSON（{meta, tokens, skill, css, templates}）。
// --md：切回纯 SKILL.md 文本（向后兼容 pipe 场景）。
// 走 3 天缓存，服务器挂时 fallback 到缓存（打印 warn）。
import { getStylePack, ApiError } from '../lib/api.mjs';
import { logErr, logWarn, c } from '../lib/ui.mjs';
import { getI18n } from '../lib/i18n.mjs';

export async function cmdSkill(args) {
  const { t } = getI18n();
  const wantMd = args.includes('--md') || args.includes('-m');
  const slug = args.find((a) => !a.startsWith('-'));
  const isTTY = process.stdout.isTTY;

  if (!slug) {
    await logErr('用法：taste-bank skill <slug> [--md]');
    process.exit(1);
  }

  let result;
  try {
    result = await getStylePack(slug);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      await logErr(t('errStyleNotFound', slug));
    } else {
      await logErr(t('errApiFail', e.message));
    }
    process.exit(1);
  }

  // 离线用了过期缓存 → 提示到 stderr（不污染 stdout）
  if (result.warning && isTTY) {
    await logWarn(result.warning);
  } else if (result.warning) {
    process.stderr.write(`${result.warning}\n`);
  }

  if (wantMd) {
    // 纯 SKILL.md 文本，向后兼容
    process.stdout.write(result.data.skill);
    if (!result.data.skill.endsWith('\n')) process.stdout.write('\n');
  } else {
    // 默认：JSON 完整包
    process.stdout.write(JSON.stringify(result.data, null, 2) + '\n');
  }
}
