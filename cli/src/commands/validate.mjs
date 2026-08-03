// taste-bank validate <pack.json>
// 本地干跑校验：检查 pack 结构（meta/tokens/skill/templates）符合投稿要求。不发请求、不签名。
import fs from 'node:fs';
import { isValidPubkey } from '../lib/auth.mjs';
import { logOk, logErr, logWarn, c } from '../lib/ui.mjs';

export async function cmdValidate(args) {
  const file = args.find((a) => !a.startsWith('-'));
  if (!file) {
    await logErr('用法：taste-bank validate <pack.json>');
    process.exit(1);
  }

  let pack;
  try {
    pack = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    await logErr(`无法读取 ${file}：${e.message}`);
    process.exit(1);
  }

  const errors = [];
  const warns = [];

  // meta
  const meta = pack.meta || {};
  if (!meta.slug || !/^[a-z0-9-]+$/.test(meta.slug)) errors.push('meta.slug 必须是小写字母数字和连字符');
  if (!meta.name) errors.push('meta.name 必填');
  if (!meta.version || !/^\d+\.\d+\.\d+$/.test(meta.version)) errors.push('meta.version 必须是 x.y.z');
  if (!meta.summary) errors.push('meta.summary 必填');
  if (!meta.useCase) errors.push('meta.useCase 必填');
  if (!meta.signature) errors.push('meta.signature 必填');
  if (!meta.mood || !Array.isArray(meta.mood) || meta.mood.length === 0) errors.push('meta.mood 必须是非空数组');
  if (!meta.createdAt || !/^\d{4}-\d{2}-\d{2}$/.test(meta.createdAt)) errors.push('meta.createdAt 必须是 YYYY-MM-DD');

  // tokens
  const tokens = pack.tokens || {};
  const needColor = ['bg', 'surface', 'text', 'muted', 'line', 'accent'];
  for (const k of needColor) {
    if (!tokens.color?.[k]) errors.push(`tokens.color.${k} 缺失`);
  }
  if (!tokens.font?.display) errors.push('tokens.font.display 缺失');
  if (!tokens.font?.body) errors.push('tokens.font.body 缺失');
  for (const k of ['display', 'h1', 'h2', 'body', 'small']) {
    if (!tokens.size?.[k]) errors.push(`tokens.size.${k} 缺失`);
  }
  if (!tokens.motion?.duration) errors.push('tokens.motion.duration 缺失');
  if (!tokens.motion?.easing) errors.push('tokens.motion.easing 缺失');

  // skill
  if (!pack.skill || pack.skill.trim().length < 50) errors.push('skill 必填且至少 50 字');

  // templates（至少 1 个 html）
  const tplNames = pack.templates ? Object.keys(pack.templates) : [];
  const htmlFiles = tplNames.filter((n) => /\.html$/.test(n));
  if (htmlFiles.length === 0) errors.push('templates 至少要有一个 .html 文件');
  const badTplNames = tplNames.filter((n) => !/^[\w][\w.-]*\.(html|css|vue|jsx|tsx|svelte|md)$/.test(n));
  if (badTplNames.length) errors.push(`templates 文件名不合法：${badTplNames.join(', ')}`);

  // ownerPubkey（可选，但有就要合法）
  if (pack.ownerPubkey && !isValidPubkey(pack.ownerPubkey)) {
    errors.push('ownerPubkey 不是合法的 ed25519 公钥');
  }

  // author（建议）
  if (!meta.author || meta.author === 'anonymous') {
    warns.push('meta.author 未设置（默认 anonymous），投稿前建议在 ~/.style-lab/author 配置');
  }

  if (errors.length) {
    await logErr(`校验失败（${errors.length} 项）：`);
    for (const e of errors) console.log(`  ${c.red('✗')} ${e}`);
    process.exit(1);
  }

  await logOk(`校验通过 ✓`);
  console.log(c.gray(`  slug: ${meta.slug}  version: ${meta.version}  templates: ${tplNames.length}`));
  for (const w of warns) console.log(`  ${c.yellow('!')} ${w}`);
}
