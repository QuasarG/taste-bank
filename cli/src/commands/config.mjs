// taste-bank config [show|invite <code>|author <name>]
// 交互式身份配置。无参数时进入交互菜单，检测缺项逐个补全。
import { identityStatus, formatIdentityReport, ensureIdentity } from '../lib/identity.mjs';
import { writeInviteCode, writeAuthor, readText, FILES } from '../lib/config.mjs';
import { text, logOk, logErr, logInfo, c } from '../lib/ui.mjs';

export async function cmdConfig(args) {
  const sub = args[0];

  // config show —— 只读显示当前状态
  if (sub === 'show' || sub === 'status') {
    const status = identityStatus();
    console.log();
    console.log(c.bold('  身份状态'));
    console.log(c.gray('  ' + '─'.repeat(36)));
    for (const line of formatIdentityReport(status).split('\n')) {
      console.log('  ' + line);
    }
    console.log();
    return;
  }

  // config invite <code>
  if (sub === 'invite' || sub === 'inviteCode') {
    const code = args[1];
    if (!code) {
      await logErr('用法：taste-bank config invite <sl_xxx>');
      process.exit(1);
    }
    if (!code.startsWith('sl_')) {
      await logErr('邀请码应以 sl_ 开头');
      process.exit(1);
    }
    writeInviteCode(code.trim());
    await logOk('邀请码已保存');
    return;
  }

  // config author <name>
  if (sub === 'author' || sub === 'name') {
    const name = args[1];
    if (!name) {
      await logErr('用法：taste-bank config author <名字>');
      process.exit(1);
    }
    writeAuthor(name.trim());
    await logOk(`作者名已设置为 ${c.cyan(name.trim())}`);
    return;
  }

  // 无参数 —— 交互式补全
  if (!sub) {
    const before = identityStatus();
    console.log();
    console.log(c.bold('  当前身份状态'));
    for (const line of formatIdentityReport(before).split('\n')) {
      console.log('  ' + line);
    }
    console.log();

    if (before.canSubmit) {
      await logInfo('投稿身份已就绪，无需配置。');
      return;
    }

    // 调共享补全逻辑
    const after = await ensureIdentity({ interactive: true });

    console.log();
    if (after.canSubmit) {
      await logOk('投稿身份已就绪 ✓');
    } else if (after.missing.includes('keypair')) {
      await logInfo('运行 taste-bank keygen 生成密钥对（会同时绑定作者名）');
    }
    return;
  }

  await logErr('用法：taste-bank config [show | invite <code> | author <name>]');
  process.exit(1);
}
