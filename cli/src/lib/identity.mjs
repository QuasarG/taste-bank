// 共享身份逻辑：检测状态 + 交互式补全。setup/doctor/config 三个入口共用。
import { detectIdentity, keyPairStatus, readText, FILES, writeInviteCode, writeAuthor } from './config.mjs';
import { confirm, text, logInfo, logWarn, logOk, c, isTTY } from './ui.mjs';

/**
 * 只读检测身份状态，返回结构化结果。
 * @returns {{
 *   canConsume: boolean,   // 消费端永远 true（不需要身份）
 *   canSubmit: boolean,    // 投稿需要三件套全齐
 *   missing: string[],     // 缺失项：['inviteCode'|'keypair'|'author']
 *   details: {
 *     inviteCode: boolean,
 *     keyPair: {complete, orphaned, hasPrivateKey, hasPublicKey, privateKeyValid, publicKeyValid},
 *     author: string|null,
 *   }
 * }}
 */
export function identityStatus() {
  const id = detectIdentity();
  const kp = keyPairStatus();
  const inviteOk = !!(id.config?.inviteCode);
  const keyOk = kp.complete;
  const authorOk = !!id.author;

  const missing = [];
  if (!inviteOk) missing.push('inviteCode');
  if (!keyOk) missing.push('keypair');
  if (!authorOk) missing.push('author');

  return {
    canConsume: true,
    canSubmit: inviteOk && keyOk && authorOk,
    missing,
    details: {
      inviteCode: inviteOk,
      keyPair: kp,
      author: id.author,
    },
  };
}

/**
 * 格式化身份状态为人类可读的体检文本（doctor/setup 用）
 */
export function formatIdentityReport(status) {
  const { details, missing, canSubmit } = status;
  const lines = [];

  // 邀请码
  lines.push(`${details.inviteCode ? '✓' : '✗'} 邀请码 (inviteCode) ${details.inviteCode ? c.gray(details.inviteCode ? '已配置' : '') : c.yellow('缺失')}`);

  // 密钥对
  const kp = details.keyPair;
  if (kp.complete) {
    lines.push(`✓ 密钥对 ${c.gray('private.key + public.key 成对')}`);
  } else if (kp.orphaned) {
    lines.push(`✗ 密钥对 ${c.red('不完整（只存在一个，可能误删）')}`);
  } else if (kp.hasPrivateKey) {
    lines.push(`! 密钥对 ${c.yellow('private.key 存在但 public.key 缺失')}`);
  } else if (kp.hasPublicKey) {
    lines.push(`! 密钥对 ${c.yellow('public.key 存在但 private.key 缺失（可能误删私钥）')}`);
  } else {
    lines.push(`✗ 密钥对 ${c.gray('未生成')}`);
  }

  // 作者名
  if (details.author) {
    lines.push(`✓ 作者名 ${c.gray(details.author)}`);
  } else {
    lines.push(`✗ 作者名 ${c.gray('未设置（投稿时默认 anonymous）')}`);
  }

  // 总结
  if (canSubmit) {
    lines.push(c.green('→ 投稿就绪'));
  } else if (missing.length > 0) {
    lines.push(c.gray(`→ 投稿未就绪（缺：${missing.join(', ')}）。消费端不需要身份。`));
  }

  return lines.join('\n');
}

/**
 * 交互式身份补全。检测缺项 → 逐个问用户 → 补全。
 * 仅 TTY 模式会交互；非 TTY 只返回状态不操作。
 * @param {{interactive?: boolean}} opts
 * @returns {Promise<typeof identityStatus returns>}
 */
export async function ensureIdentity(opts = {}) {
  const interactive = opts.interactive !== false && isTTY;
  let status = identityStatus();

  if (!interactive || status.canSubmit) return status;

  // 交互补全
  if (status.missing.length > 0) {
    const doConfig = await confirm(
      `检测到投稿身份未完整（缺 ${status.missing.join(', ')}），要现在配置吗？`,
      { defaultValue: true },
    );
    if (!doConfig) return status;
  }

  // 补密钥对（引导 keygen，不在这里直接生成——因为 keygen 有 author 绑定流程）
  if (status.missing.includes('keypair')) {
    const kp = status.details.keyPair;
    if (kp.hasPublicKey && !kp.hasPrivateKey) {
      await logWarn('检测到残留的 public.key 但 private.key 不存在——可能私钥被误删。');
      await logWarn('如果你有名下风格，私钥丢失 = 永久失控。请确认是否有备份。');
      const proceed = await confirm('继续生成新密钥对？（会创建全新身份）', { defaultValue: false });
      if (!proceed) return status;
    }
    await logInfo('请运行：taste-bank keygen（会同时生成密钥对 + 绑定作者名）');
    return status; // keygen 是独立命令，不在这里内联
  }

  // 补作者名
  if (status.missing.includes('author')) {
    const name = await text('输入你的作者名（投稿时显示）：', { defaultValue: 'anonymous', placeholder: '如 QuasarG' });
    if (name && name !== 'anonymous') {
      writeAuthor(name);
      await logOk(`作者名已设置为 ${c.cyan(name)}`);
    }
  }

  // 补邀请码
  if (status.missing.includes('inviteCode')) {
    const hasCode = await confirm('你有邀请码吗？（投稿需要；没有可在 tastebank.cloud/quick-start 申请）', { defaultValue: false });
    if (hasCode) {
      const code = await text('输入邀请码（sl_ 开头）：', { placeholder: 'sl_xxx' });
      if (code && code.startsWith('sl_')) {
        writeInviteCode(code.trim());
        await logOk('邀请码已保存');
      } else if (code) {
        await logWarn('邀请码应以 sl_ 开头，未保存。请检查后重试。');
      }
    }
  }

  // 重新检测
  return identityStatus();
}
