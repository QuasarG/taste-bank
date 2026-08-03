// taste-bank css <slug>
// 输出 scoped CSS 变量块（含 overrides）到 stdout，可追加到样式表。
import { getStyleCss, ApiError } from '../lib/api.mjs';
import { logErr } from '../lib/ui.mjs';
import { getI18n } from '../lib/i18n.mjs';

export async function cmdCss(args) {
  const { t } = getI18n();
  const slug = args[0];

  if (!slug) {
    await logErr('用法：taste-bank css <slug>');
    process.exit(1);
  }

  try {
    const css = await getStyleCss(slug);
    process.stdout.write(css);
    if (!css.endsWith('\n')) process.stdout.write('\n');
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      await logErr(t('errStyleNotFound', slug));
    } else {
      await logErr(t('errApiFail', e.message));
    }
    process.exit(1);
  }
}
