// 审核队列管理：npm run review -- list | approve <slug> | reject <slug>
// 服务器上数据在 /srv/style-lab，但 systemd 才设 STYLE_LAB_DIR 给 web 进程；
// shell 里跑此脚本时 env 没有，导致 STYLES_DIR 兜底到 cwd/styles（空）。
// 这里补一个 fallback：若 env 未设且 /srv/style-lab 存在，自动用它。
// 注意：必须用动态 import()，ESM 静态 import 会被提升到顶部，env 来不及设。
import fs from 'node:fs';
if (!process.env.STYLE_LAB_DIR && fs.existsSync('/srv/style-lab/styles')) {
  process.env.STYLE_LAB_DIR = '/srv/style-lab';
}

const { listPending, approveStyle, rejectStyle } = await import('../src/lib/review');

const [, , cmd, slug] = process.argv;

if (cmd === 'list') {
  const list = listPending();
  if (list.length === 0) console.log('（审核队列为空）');
  for (const s of list) console.log(s);
} else if (cmd === 'approve' && slug) {
  approveStyle(slug);
  console.log(`已上架: ${slug}`);
} else if (cmd === 'reject' && slug) {
  rejectStyle(slug);
  console.log(`已拒绝并删除: ${slug}`);
} else {
  console.error('用法: npm run review -- list | approve <slug> | reject <slug>');
  process.exit(1);
}
