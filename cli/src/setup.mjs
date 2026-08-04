// setup 向导：三步（全局装 CLI → 注入 skill → 环境检测）
// 对标 @larksuite/cli 的 install-wizard.js，但无 native binary、无鉴权
import { runSilent, runSyncSilent, run, meetsSkillsNodeRequirement, nodeVersion } from './lib/platform.mjs';
import { detectIdentity } from './lib/config.mjs';
import { ping } from './lib/api.mjs';
import { printLogo, intro, outro, spin, logOk, logErr, logInfo, logWarn, logStep, c, isTTY } from './lib/ui.mjs';
import { getI18n } from './lib/i18n.mjs';

const PKG = 'taste-bank';
// 两个 skill（消费 + 投稿）都在 skills/ 子目录，skills 工具从 repo 根递归发现。
// 仓库根已无 SKILL.md（挪到 docs/mcp-usage-guide.md），不会 short-circuit。
const SKILLS_SOURCE = 'QuasarG/taste-bank';

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

  if (await skillsInstalledOk()) {
    await logOk(t('step2Skip'));
    return;
  }

  // 一次 add 整个 repo，skills 工具递归发现 skills/ 下的两个 skill（消费 + 投稿）。
  // TTY 时去掉 -y，让 skills 走原生 agent 选择 UI；非 TTY 全自动。
  const skillsArgs = isTTY
    ? ['-y', 'skills', 'add', SKILLS_SOURCE, '-g']
    : ['-y', 'skills', 'add', SKILLS_SOURCE, '-y', '-g', '--all'];
  try {
    if (isTTY) {
      logInfo(t('step2Spinner'));
      run('npx', skillsArgs);
    } else {
      await spin(t('step2Spinner'), async () => {
        try {
          await runSilent('npx', skillsArgs, { timeout: 180000 });
        } catch {
          // exit code 非 0 不一定是真失败，交给下面验证判定
        }
      });
    }
  } catch {
    // 不致命，继续验证
  }

  if (await skillsInstalledOk()) {
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

  // 身份（分级报告：消费端不需要身份；投稿需要 key + 邀请码）
  if (identity.hasDir || identity.hasPrivateKey) {
    const parts = [];
    if (identity.author) parts.push(`author=${identity.author}`);
    parts.push(identity.hasPrivateKey ? 'private.key ✓' : 'private.key ✗');
    parts.push(identity.hasPublicKey ? 'public.key ✓' : 'public.key ✗');
    parts.push(identity.config.inviteCode ? 'inviteCode ✓' : 'inviteCode ✗');

    const canConsume = true; // 消费不需要任何身份
    const canSubmit = !!(identity.hasPrivateKey && identity.config.inviteCode);

    if (canSubmit) {
      await logInfo(`身份：${c.green('投稿就绪')} ${c.gray('(' + parts.join(', ') + ')')}`);
    } else if (identity.hasPrivateKey) {
      await logInfo(`身份：${c.yellow('部分就绪')}（有私钥但缺邀请码，可消费不能投稿） ${c.gray(parts.join(', '))}`);
    } else {
      await logInfo(`身份：${c.yellow('未配置')}（消费不需要；投稿需运行 taste-bank keygen）`);
    }
  } else {
    await logInfo('身份：' + c.gray('无（消费端不需要；投稿时运行 taste-bank keygen）'));
  }

  // skill 注入状态
  if (await skillsInstalledOk()) {
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

/** 检查两个 skill 是否都已注入。返回 { tasteBank, contribute } */
async function skillsAlreadyInstalled() {
  try {
    const out = await runSilent('npx', ['-y', 'skills', 'ls', '-g'], { timeout: 60000 });
    // skills 输出带 ANSI 颜色码，剥掉后再匹配
    const clean = out.replace(/\x1b\[[0-9;]*m/g, '');
    return {
      tasteBank: /^taste-bank\b/m.test(clean),
      contribute: /^taste-bank-contribute\b/m.test(clean),
    };
  } catch {
    return { tasteBank: false, contribute: false };
  }
}

/** 主 skill（taste-bank）是否已注入——用于 step 的跳过/失败判定 */
async function skillsInstalledOk() {
  const s = await skillsAlreadyInstalled();
  return s.tasteBank; // 主 skill 在就算 OK（contribute 是可选增强）
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
