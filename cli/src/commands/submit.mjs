// taste-bank submit <pack.json>
import { doSubmit } from '../lib/submission.mjs';
import { logOk, logErr, logWarn, c } from '../lib/ui.mjs';

export async function cmdSubmit(args) {
  const file = args.find((a) => !a.startsWith('-'));
  if (!file) {
    await logErr('用法：taste-bank submit <pack.json>');
    process.exit(1);
  }
  try {
    const result = await doSubmit(file);
    if (result.authorMissing) {
      await logWarn('未配置作者名，使用了 anonymous。运行 taste-bank config author <名字> 设置。');
    }
    await logOk(`投稿成功 → ${c.cyan(result.slug)}（进入审核队列）`);
    // 核对 payloadHash：本地（实际发送的 raw）vs 服务端收到
    const local = result.localPayloadHash;
    const remote = result.payloadHash;
    if (local && remote) {
      const match = local === remote;
      console.log(c.gray(`  payloadHash: ${match ? c.green('✓ 一致') : c.red('✗ 不一致')} ${remote.slice(0, 16)}...`));
      if (!match) {
        console.log(c.gray(`    本地: ${local.slice(0, 32)}...`));
        console.log(c.gray(`    服务端: ${remote.slice(0, 32)}...`));
      }
    } else {
      console.log(c.gray(`  payloadHash: ${remote || '(未返回)'}`));
    }
    console.log(c.gray(`  文件: ${(result.files || []).join(', ')}`));
  } catch (e) {
    await logErr(`投稿失败：${e.message}`);
    process.exit(1);
  }
}
