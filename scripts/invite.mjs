// 邀请码管理：node scripts/invite.mjs create [备注] | list | revoke <hash前缀>
import { createInvite, listInvites, revokeInvite } from '../src/lib/invites.ts';

const [, , cmd, arg] = process.argv;

if (cmd === 'create') {
  const code = createInvite(arg ?? '');
  console.log(`邀请码（只显示这一次，请复制保存）:\n${code}`);
} else if (cmd === 'list') {
  const list = listInvites();
  if (list.length === 0) console.log('（无邀请码）');
  for (const e of list) {
    console.log(`${e.hashPrefix}  ${e.createdAt}  ${e.boundPubkey ? '已绑定身份' : '未使用'}  ${e.note}`);
  }
} else if (cmd === 'revoke' && arg) {
  console.log(revokeInvite(arg) ? '已吊销' : `未找到前缀为 ${arg} 的邀请码`);
} else {
  console.error('用法: node scripts/invite.mjs create [备注] | list | revoke <hash前缀>');
  process.exit(1);
}
