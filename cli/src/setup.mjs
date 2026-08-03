// setup 向导：三步（全局装 CLI → 注入 skill → 环境检测）
// 对标 @larksuite/cli 的 install-wizard.js，但无 native binary、无鉴权
import { runSilent, runSyncSilent, run, meetsSkillsNodeRequirement, nodeVersion } from './lib/platform.mjs';
import { detectIdentity } from './lib/config.mjs';
import { ping } from './lib/api.mjs';
import { printLogo, intro, outro, spin, logOk, logErr, logInfo, logWarn, logStep, c, isTTY } from './lib/ui.mjs';
import { getI18n } from './lib/i18n.mjs';

const PKG = 'taste-bank';
// 指向 skills/taste-bank 子目录：仓库根有 MCP 用的 SKILL.md 会 short-circuit，
// 必须明确指向子目录，skills 才会读我们 CLI 用的 SKILL.md（name: taste-bank）
const SKILLS_SOURCE = 'https://github.com/QuasarG/taste-bank/tree/main/skills/taste-bank';

export async function runSetup(args) {
  const lang = parseLangArg(args) || (isTTY ? null : 'en');
  const { t, lang: resolvedLang } = getI18n(lang || undefined);

  if (isTTY) {
    printLogo(t('setupTitle'));
    await intro(c.bold(c.cyan(t('setupTitle'))));
  } else {
    console.log(t('setupTitle'));
  }

  // Step 1: 全局装 CLI（幂等）
  await stepInstallGlobally(t);

  // Step 2: 注入 skill（幂等）
  await stepInstallSkills(t);

  // Step 3: 环境检测（只读报告）
  await stepEnvReport(t);

  if (isTTY) await outro(c.green(t('setupDone')));
  else console.log('\n' + t('setupDone'));
}

// ---------- Step 1 ----------
async function stepInstallGlobally(t) {
  if (isTTY) logStep(t('step1Name'));

  const installed = getGloballyInstalledVersion();
  const latest = getLatestVersion();

  if (installed && (!latest || installed === latest)) {
    await logOk(t('step1Skip', installed));
    return;
  }

  const upgradeMsg = installed && latest ? t('step1Upgrade', installed, latest) : t('step1Installing');
  try {
    await spin(upgradeMsg, async () => {
      await runSilent('npm', ['install', '-g', PKG], { timeout: 120000 });
    });
    await logOk(t('step1Done', latest || installed || 'installed'));
  } catch {
    await logErr(t('step1Fail'));
    process.exit(1);
  }
}

// ---------- Step 2 ----------
async function stepInstallSkills(t) {
  if (isTTY) logStep(t('step2Name'));

  // skills 工具要求 node >= 22.20.0
  if (!meetsSkillsNodeRequirement()) {
    const [maj, min] = nodeVersion();
    await logWarn(t('step2NodeTooOld', `${maj}.${min}`));
    // 非 TTY 直接跳过；TTY 问是否继续
    return;
  }

  if (await skillsAlreadyInstalled()) {
    await logOk(t('step2Skip'));
    return;
  }

  try {
    await spin(t('step2Spinner'), async () => {
      await runSilent('npx', ['-y', 'skills', 'add', SKILLS_SOURCE, '-y', '-g'], { timeout: 180000 });
    });
    await logOk(t('step2Done'));
  } catch {
    await logErr(t('step2Fail'));
    // skill 注入失败不致命——CLI 本身能用，agent 学不会而已
    if (!isTTY) process.exit(1);
  }
}

// ---------- Step 3 ----------
async function stepEnvReport(t) {
  if (isTTY) logStep(t('step3Name'));

  const identity = detectIdentity();
  const netOk = await ping();

  // 网络
  if (netOk) await logInfo(t('networkOk'));
  else await logWarn(t('networkFail', ''));

  // 身份
  if (identity.hasDir) {
    const parts = [];
    if (identity.author) parts.push(`author=${identity.author}`);
    if (identity.hasPrivateKey) parts.push('private.key ✓');
    if (identity.hasConfig) parts.push('config.json ✓');
    await logInfo(`身份：${identity.hasPrivateKey ? c.green('已配置投稿身份') : c.yellow('部分配置')} ${c.gray('(' + (parts.join(', ') || '无身份文件') + ')')}`);
    await logInfo(c.gray('投稿功能将在 v0.2 支持；当前可用 MCP 或 scripts/sign.mjs'));
  } else {
    await logInfo('身份：' + c.gray('无（消费端不需要；投稿时再引导）'));
  }

  // skill 注入状态
  if (await skillsAlreadyInstalled()) {
    const agents = await listInjectedAgents();
    await logInfo(`skill：已注入到 ${c.green(agents.join(', ') || 'agent')}`);
  }
}

// ---------- 探测辅助 ----------

/** npm list -g taste-bank 取已装版本，拿不到返回 null */
function getGloballyInstalledVersion() {
  const out = runSyncSilent('npm', ['list', '-g', PKG, '--depth=0']);
  if (!out) return null;
  const m = out.match(new RegExp(PKG + '@(\\d+\\.\\d+\\.\\d+[^\\s]*)'));
  return m ? m[1] : null;
}

/** npm view taste-bank version 取最新版本 */
function getLatestVersion() {
  const out = runSyncSilent('npm', ['view', PKG, 'version']);
  if (!out) return null;
  const v = out.trim();
  return /^\d+\.\d+\.\d+/.test(v) ? v : null;
}

/** 检查 taste-bank skill 是否已注入（npx skills ls -g 输出里有没有 taste-bank） */
async function skillsAlreadyInstalled() {
  try {
    const out = await runSilent('npx', ['-y', 'skills', 'ls', '-g'], { timeout: 60000 });
    return /^taste-bank\b/m.test(out);
  } catch {
    return false;
  }
}

/** 列出已注入 taste-bank 的 agent（解析 skills ls -g 输出） */
async function listInjectedAgents() {
  try {
    const out = await runSilent('npx', ['-y', 'skills', 'ls', '-g'], { timeout: 60000 });
    const agents = [];
    for (const line of out.split('\n')) {
      if (/agents?:/i.test(line)) {
        const m = line.match(/agents?:\s*(.+)/i);
        if (m) agents.push(...m[1].split(',').map((s) => s.trim()));
      }
    }
    return agents;
  } catch {
    return [];
  }
}

function parseLangArg(args) {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--lang' && args[i + 1]) {
      const v = args[i + 1].toLowerCase();
      if (v === 'zh' || v === 'en') return v;
    }
    if (args[i].startsWith('--lang=')) {
      const v = args[i].split('=')[1].toLowerCase();
      if (v === 'zh' || v === 'en') return v;
    }
  }
  return null;
}
