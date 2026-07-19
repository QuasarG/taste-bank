// 审核队列管理：npm run review -- list | approve <slug> | reject <slug>
import { listPending, approveStyle, rejectStyle } from '../src/lib/review';

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
