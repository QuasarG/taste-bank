// doctor：只读体检——CLI/网络/身份/skill 注入健康度
import { ping } from './lib/api.mjs';
import { detectIdentity, readFavorites, readSubmissions } from './lib/config.mjs';
import { cacheHealth } from './lib/cache.mjs';
import { readProjectUsage } from './lib/project.mjs';
import { meetsSkillsNodeRequirement, nodeVersion, runSyncSilent, runSilent } from './lib/platform.mjs';
import { printLogo, logOk, logErr, logWarn, logInfo, c, isTTY } from './lib/ui.mjs';
import { getI18n } from './lib/i18n.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PKG_VERSION = readVersion();

export async function runDoctor(args) {
  const { t } = getI18n(parseLangArg(args) || undefined);
  if (isTTY) printLogo(t('doctorTitle'));

  console.log(c.bold('\n  ' + t('doctorTitle')));
  console.log(c.gray('  ' + '─'.repeat(40)));

  // 1. CLI 自身（探测全局装没装）
  const cliVer = getGloballyInstalledVersion();
  if (cliVer) logOk(`${t('doctorCli')}: v${cliVer} ${c.gray('(全局)')}`);
  else logWarn(`${t('doctorCli')}: ${c.yellow('未全局安装')} ${c.gray('(当前通过 npx 运行；运行 taste-bank setup 全局安装)')}`);
  logInfo(`${c.gray('当前进程:')} taste-bank v${PKG_VERSION}, Node v${nodeVersion().join('.')}`);

  // 2. Node 版本（skills 工具要求）
  if (meetsSkillsNodeRequirement()) logOk(`Node: v${nodeVersion().join('.')} ${c.gray('(≥ 22.20.0，满足 skills 工具)')}`);
  else logWarn(`Node: v${nodeVersion().join('.')} ${c.gray('(skills 工具需要 ≥ 22.20.0)')}`);

  // 3. 网络
  const netOk = await ping();
  if (netOk) logOk(t('doctorNetwork') + ': ' + t('networkOk'));
  else logErr(t('doctorNetwork') + ': ' + t('networkFail', ''));

  // 4. 身份
  const id = detectIdentity();
  if (id.hasDir) {
    const bits = [];
    if (id.author) bits.push(`author=${id.author}`);
    if (id.hasPrivateKey) bits.push('private.key');
    if (id.hasPublicKey) bits.push('public.key');
    if (id.hasConfig) bits.push('config.json');
    logInfo(`${t('doctorIdentity')}: ${c.gray('~/.style-lab/')} ${bits.length ? c.gray('(' + bits.join(', ') + ')') : c.gray('(目录存在，无身份文件)')}`);
  } else {
    logInfo(`${t('doctorIdentity')}: ${c.gray('无 ~/.style-lab/（消费端不需要）')}`);
  }

  // 5. skill 注入（两个：消费 + 投稿）
  try {
    const raw = await runSilent('npx', ['-y', 'skills', 'ls', '-g'], { timeout: 30000 });
    const out = raw.replace(/\x1b\[[0-9;]*m/g, '');
    const hasMain = /^taste-bank\b/m.test(out);
    const hasContribute = /^taste-bank-contribute\b/m.test(out);
    if (hasMain) {
      logOk(`${t('doctorSkill')}: 已注入` + (hasContribute ? c.green('（消费 + 投稿）') : c.yellow('（仅消费，投稿 skill 未装）')));
      // 提取 agents 行
      for (const line of out.split('\n')) {
        if (/^taste-bank/i.test(line) && /agents?:/i.test(line)) {
          logInfo(c.gray('  ' + line.trim()));
        }
      }
    } else {
      logWarn(`${t('doctorSkill')}: ${c.yellow('未注入')} ${c.gray('(运行 taste-bank setup)')}`);
    }
  } catch {
    logWarn(`${t('doctorSkill')}: ${c.yellow('skills 工具未安装或不可用')}`);
  }

  // 6. 缓存（v0.2）
  const cache = cacheHealth();
  if (cache.count > 0) {
    const ageStr = cache.oldestAgeMs != null ? `${Math.round(cache.oldestAgeMs / 3600000)}h` : '-';
    logInfo(`缓存: ${c.green(cache.count)} 个风格包 ${c.gray(`(最旧 ${ageStr}，TTL 3 天)`)}`);
  } else {
    logInfo(`缓存: ${c.gray('空（首次 skill 命令会填充）')}`);
  }

  // 7. 收藏（v0.2）
  const favs = readFavorites();
  if (favs.length) logInfo(`收藏: ${c.green(favs.length)} 个 ${c.gray(favs.slice(0, 3).join(', ') + (favs.length > 3 ? '...' : ''))}`);
  else logInfo(`收藏: ${c.gray('无')}`);

  // 8. 投稿记录（v0.2）
  const subs = readSubmissions();
  if (subs.length) logInfo(`投稿: ${c.green(subs.length)} 条 ${c.gray('(状态固定为 pending，实时状态调 whoami)')}`);
  else logInfo(`投稿: ${c.gray('无本地记录')}`);

  // 9. 项目级使用记录（v0.2）
  const used = readProjectUsage();
  if (used.length) logInfo(`项目级: ${c.green(used.length)} 个风格 ${c.gray(used.map((u) => u.slug + '@' + u.version).join(', '))}`);
  else logInfo(`项目级: ${c.gray('无（当前目录未 use 过风格）')}`);

  console.log();
}

function readVersion() {
  try {
    const pj = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'));
    return pj.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

/** npm list -g taste-bank 取已装版本，拿不到返回 null */
function getGloballyInstalledVersion() {
  const out = runSyncSilent('npm', ['list', '-g', 'taste-bank', '--depth=0']);
  if (!out) return null;
  const m = out.match(/taste-bank@(\d+\.\d+\.\d+[^\s]*)/);
  return m ? m[1] : null;
}

function parseLangArg(args) {
  for (let i = 0; args && i < args.length; i++) {
    if (args[i] === '--lang' && args[i + 1]) {
      const v = args[i + 1].toLowerCase();
      if (v === 'zh' || v === 'en') return v;
    }
  }
  return null;
}
