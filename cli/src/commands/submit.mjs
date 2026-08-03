// taste-bank submit <pack.json>
import { doSubmit } from '../lib/submission.mjs';
import { logOk, logErr, c } from '../lib/ui.mjs';

export async function cmdSubmit(args) {
  const file = args.find((a) => !a.startsWith('-'));
  if (!file) {
    await logErr('用法：taste-bank submit <pack.json>');
    process.exit(1);
  }
  try {
    const result = await doSubmit(file);
    await logOk(`投稿成功 → ${c.cyan(result.slug)}（进入审核队列）`);
    console.log(c.gray(`  payloadHash: ${result.payloadHash}`));
    console.log(c.gray(`  文件: ${(result.files || []).join(', ')}`));
  } catch (e) {
    await logErr(`投稿失败：${e.message}`);
    process.exit(1);
  }
}
