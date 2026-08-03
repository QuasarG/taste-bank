// taste-bank update <slug> <pack.json>
import { doUpdate } from '../lib/submission.mjs';
import { logOk, logErr, c } from '../lib/ui.mjs';

export async function cmdUpdate(args) {
  const slug = args.find((a) => !a.startsWith('-'));
  const file = args.filter((a) => !a.startsWith('-'))[1];
  if (!slug || !file) {
    await logErr('用法：taste-bank update <slug> <pack.json>');
    process.exit(1);
  }
  try {
    const result = await doUpdate(slug, file);
    await logOk(`更新已提交 → ${c.cyan(result.slug)}（进入审核队列）`);
    console.log(c.gray(`  payloadHash: ${result.payloadHash}`));
  } catch (e) {
    await logErr(`更新失败：${e.message}`);
    process.exit(1);
  }
}
