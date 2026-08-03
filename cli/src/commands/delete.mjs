// taste-bank delete <slug>
import { doDelete } from '../lib/submission.mjs';
import { logOk, logErr, c } from '../lib/ui.mjs';

export async function cmdDelete(args) {
  const slug = args.find((a) => !a.startsWith('-'));
  if (!slug) {
    await logErr('用法：taste-bank delete <slug>');
    process.exit(1);
  }
  try {
    const result = await doDelete(slug);
    if (result) {
      await logOk(`已删除 ${c.cyan(result.slug)}`);
    }
  } catch (e) {
    await logErr(`删除失败：${e.message}`);
    process.exit(1);
  }
}
