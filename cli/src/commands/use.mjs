// taste-bank use <slug> [--as agents|claude|skill]
// 把风格落地成项目级规则文件，用 sentinel 托管块（可重复运行、不覆盖用户块外内容）
import fs from 'node:fs';
import path from 'node:path';
import { getSkillMarkdown, getStyle, ApiError } from '../lib/api.mjs';
import { c, logOk, logErr, logInfo, icon } from '../lib/ui.mjs';
import { getI18n } from '../lib/i18n.mjs';

export async function cmdUse(args) {
  const { t } = getI18n();
  const { slug, target } = parseArgs(args);

  if (!slug) {
    await logErr('用法：taste-bank use <slug> [--as agents|claude|skill]');
    process.exit(1);
  }

  // 先取详情拿版本号（用于 sentinel 标记，方便 doctor 检测更新）
  let version = '';
  let skillMd;
  try {
    const [detail, md] = await Promise.all([getStyle(slug), getSkillMarkdown(slug)]);
    version = detail.meta.version;
    skillMd = md;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      await logErr(t('errStyleNotFound', slug));
    } else {
      await logErr(t('errApiFail', e.message));
    }
    process.exit(1);
  }

  const block = wrapSentinel(slug, version, skillMd);
  const dest = resolveDest(slug, target);
  const existed = fs.existsSync(dest.file);
  let wrote;

  if (!existed) {
    fs.mkdirSync(path.dirname(dest.file), { recursive: true });
    fs.writeFileSync(dest.file, dest.standalone ? block : block + '\n');
    wrote = 'created';
  } else if (dest.standalone) {
    // 独立文件（skill/claude 模式）：整文件就是托管块，直接覆盖
    fs.writeFileSync(dest.file, block + '\n');
    wrote = 'updated';
  } else {
    // 共享文件（agents 模式 = AGENTS.md）：只替换/追加 sentinel 块
    const original = fs.readFileSync(dest.file, 'utf8');
    const next = replaceOrAppendBlock(original, slug, block);
    if (next === original) {
      logInfo(`无变化，${dest.file} 已是最新 (v${version})`);
      return;
    }
    fs.writeFileSync(dest.file, next);
    wrote = original.includes(beginMarker(slug)) ? 'updated' : 'appended';
  }

  logOk(`${wrote} → ${dest.file}`);
  console.log(c.gray(`  风格 ${slug} v${version} 已写入。重运行此命令可更新，不影响块外内容。`));
}

function parseArgs(args) {
  let target = 'skill'; // 默认
  let slug = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--as') target = args[++i];
    else if (a.startsWith('--as=')) target = a.slice(5);
    else if (!slug && !a.startsWith('-')) slug = a;
  }
  if (!['agents', 'claude', 'skill'].includes(target)) {
    logErr(`--as 只支持 agents / claude / skill（收到 ${target}）`);
    process.exit(1);
  }
  return { slug, target };
}

/** 不同 target 决定写到哪个文件、是否独立文件 */
function resolveDest(slug, target) {
  if (target === 'agents') {
    return { file: 'AGENTS.md', standalone: false };
  }
  if (target === 'claude') {
    return { file: path.join('.claude', 'commands', `${slug}.md`), standalone: true };
  }
  // skill：通用 agent skills 目录
  return { file: path.join('.agents', 'skills', slug, 'SKILL.md'), standalone: true };
}

function beginMarker(s) {
  return `<!-- BEGIN taste-bank:${s} `;
}
function endMarker(s) {
  return `<!-- END taste-bank:${s} -->`;
}

/** 把 SKILL.md 内容包进 sentinel 块 */
function wrapSentinel(slug, version, content) {
  return `${beginMarker(slug)}(v${version}) — 勿手改，运行 taste-bank use ${slug} 更新 -->\n${content.trim()}\n${endMarker(slug)}`;
}

/**
 * 在已有内容里替换 sentinel 块；找不到则追加。
 * 保留块外的用户内容原样不动。
 */
function replaceOrAppendBlock(original, slug, block) {
  const begin = beginMarker(slug);
  const end = endMarker(slug);
  const beginIdx = original.indexOf(begin);
  const endIdx = original.indexOf(end);
  if (beginIdx >= 0 && endIdx > beginIdx) {
    const after = endIdx + end.length;
    return original.slice(0, beginIdx) + block + original.slice(after);
  }
  // 追加：用空行隔开已有内容
  const sep = original.endsWith('\n\n') ? '' : original.endsWith('\n') ? '\n' : '\n\n';
  return original + sep + block + '\n';
}

export { beginMarker, endMarker, wrapSentinel };
