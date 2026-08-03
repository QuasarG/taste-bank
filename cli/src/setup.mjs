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

  // skills add 对部分不支持 global 的 agent（如 PromptScript）会返回非零退出码，
  // 即使主目标 agent 都已成功注入。所以不能靠 exit code 判断成败——
  // 跑完后实际验证 taste-bank 是否在已装列表里。
  //
  // 交互策略：TTY 时去掉 skills 的 -y，让它走原生 agent 选择 UI（用户可挑装到哪些 agent）；
  // 非 TTY 时用 -y --all 全自动（CI/脚本场景，不能弹交互）。
  const skillsArgs = isTTY
    ? ['-y', 'skills', 'add', SKILLS_SOURCE, '-g']
    : ['-y', 'skills', 'add', SKILLS_SOURCE, '-y', '-g', '--all'];
  try {
    if (isTTY) {
      // 交互模式：skills 自己接管终端画选择 UI，用 run（继承 stdio）而非 runSilent
      logInfo(t('step2Spinner'));
      run('npx', skillsArgs);
    } else {
      await spin(t('step2Spinner'), async () => {
        try {
          await runSilent('npx', skillsArgs, { timeout: 180000 });
        } catch {
          // exit code 非 0 不一定是真失败（见上注释），交给下面验证判定
        }
      });
    }
  } catch {
    // spin 包装的错误也不致命，继续验证
  }

  if (await skillsAlreadyInstalled()) {
    await logOk(t('step2Done'));
  } else {
    await logErr(t('step2Fail'));
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
    // skills 输出带 ANSI 颜色码，行首不是 taste-bank 而是 \x1b[36mtaste-bank
    // 剥掉 ANSI 码后再匹配，避免永远 false 的误判
    const clean = out.replace(/\x1b\[[0-9;]*m/g, '');
    return /^taste-bank\b/m.test(clean);
  } catch {
    return false;
  }
}

/** 列出已注入 taste-bank 的 agent（只取 taste-bank 那条的 agents 行） */
async function listInjectedAgents() {
  try {
    const raw = await runSilent('npx', ['-y', 'skills', 'ls', '-g'], { timeout: 60000 });
    const clean = raw.replace(/\x1b\[[0-9;]*m/g, '');
    const lines = clean.split('\n');
    // skills ls -g 格式：skill 名字独占一行，下一行是 "  Agents: ..., ...  Source: ..."
    // 找到 taste-bank 名字行，取紧跟的 Agents 行
    for (let i = 0; i < lines.length; i++) {
      if (/^taste-bank\b/.test(lines[i].trim())) {
        const next = lines[i + 1] || '';
        const m = next.match(/agents?:\s*([^]+)/i);
        if (m) {
          // Agents 行里可能还带 "  Source: ..."，截到 Source 前
          let agentsPart = m[1];
          const srcIdx = agentsPart.search(/\bsource:/i);
          if (srcIdx >= 0) agentsPart = agentsPart.slice(0, srcIdx);
          return agentsPart.split(',').map((s) => s.trim()).filter(Boolean);
        }
        return [];
      }
    }
    return [];
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
