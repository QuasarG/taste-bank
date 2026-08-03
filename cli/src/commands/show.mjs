// taste-bank show <slug> [--json]
import { getStyle, ApiError } from '../lib/api.mjs';
import { c, logErr } from '../lib/ui.mjs';
import { getI18n } from '../lib/i18n.mjs';

export async function cmdShow(args) {
  const { t } = getI18n();
  const slug = args[0];
  const json = args.includes('--json');

  if (!slug) {
    await logErr('用法：taste-bank show <slug>');
    process.exit(1);
  }

  let data;
  try {
    data = await getStyle(slug);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      await logErr(t('errStyleNotFound', slug));
    } else {
      await logErr(t('errApiFail', e.message));
    }
    process.exit(1);
  }

  if (json) {
    process.stdout.write(JSON.stringify(data, null, 2) + '\n');
    return;
  }

  const { meta, tokens, files } = data;
  console.log();
  console.log('  ' + c.bold(c.cyan(meta.name)) + ' ' + c.gray(`v${meta.version}`));
  console.log('  ' + c.gray(meta.summary));
  console.log();
  console.log('  ' + c.bold('slug') + '    ' + slug);
  console.log('  ' + c.bold('mood') + '    ' + (meta.mood || []).join(', '));
  console.log('  ' + c.bold('use') + '     ' + meta.useCase);
  console.log('  ' + c.bold('signal') + '  ' + meta.signature);
  if (meta.author) console.log('  ' + c.bold('author') + '  ' + meta.author);
  console.log();

  console.log('  ' + c.bold('design tokens'));
  console.log('  ' + c.gray('─'.repeat(40)));
  // 颜色
  const colors = tokens.color || {};
  console.log('  ' + c.bold('color'));
  for (const [k, v] of Object.entries(colors)) {
    const swatch = c.NO_COLOR ? '' : colorSwatch(v) + ' ';
    console.log(`    ${swatch}${c.gray('--sl-color-' + k)}: ${v}`);
  }
  // 字体
  console.log('  ' + c.bold('font'));
  for (const [k, v] of Object.entries(tokens.font || {})) {
    if (v) console.log(`    ${c.gray('--sl-font-' + k)}: ${v}`);
  }
  // 尺寸
  console.log('  ' + c.bold('size'));
  for (const [k, v] of Object.entries(tokens.size || {})) {
    console.log(`    ${c.gray('--sl-size-' + k)}: ${v}`);
  }
  // 间距 / 圆角 / 阴影 / 动效（精简展示）
  for (const group of ['space', 'radius', 'shadow']) {
    const obj = tokens[group] || {};
    const keys = Object.keys(obj);
    if (keys.length) {
      console.log('  ' + c.bold(group));
      for (const [k, v] of Object.entries(obj)) {
        console.log(`    ${c.gray('--sl-' + group + '-' + k)}: ${v}`);
      }
    }
  }
  if (tokens.motion) {
    console.log('  ' + c.bold('motion'));
    console.log(`    ${c.gray('--sl-duration')}: ${tokens.motion.duration}`);
    console.log(`    ${c.gray('--sl-easing')}:   ${tokens.motion.easing}`);
  }
  console.log();

  if (files && files.length) {
    console.log('  ' + c.bold('files') + ' (' + files.length + ')');
    for (const f of files.slice(0, 10)) console.log('    ' + c.gray(f));
    if (files.length > 10) console.log('    ' + c.gray(`…还有 ${files.length - 10} 个`));
    console.log();
  }

  console.log('  ' + c.gray('完整说明：taste-bank skill ' + slug));
  console.log('  ' + c.gray('落地项目：taste-bank use ' + slug));
  console.log();
}

// 用真实颜色值生成一个 4 字符 ANSI 背景方块（终端里可见色样）
function colorSwatch(hex) {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex || '');
  if (!m) return '';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  // 使用 24-bit truecolor
  return `\x1b[48;2;${r};${g};${b}m    \x1b[0m`;
}
