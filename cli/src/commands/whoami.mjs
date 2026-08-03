// taste-bank whoami
// 凭 invite code 查身份 + 名下风格 + pending。读 ~/.style-lab/config.json 的 inviteCode。
import fs from 'node:fs';
import { whoami as apiWhoami, ApiError } from '../lib/api.mjs';
import { FILES, readConfig, readText } from '../lib/config.mjs';
import { logErr, logOk, logInfo, c, printTable } from '../lib/ui.mjs';

export async function cmdWhoami(args) {
  const config = readConfig();
  const inviteCode = config.inviteCode;
  if (!inviteCode) {
    await logErr('未配置邀请码。请先在 ~/.style-lab/config.json 设置 { "inviteCode": "sl_xxx" }');
    process.exit(1);
  }

  let result;
  try {
    result = await apiWhoami(inviteCode);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 403)) {
      await logErr('邀请码无效或未配置。检查 ~/.style-lab/config.json 的 inviteCode');
    } else {
      await logErr(`查询失败：${e.message}`);
    }
    process.exit(1);
  }

  if (!result.bound) {
    await logInfo(`邀请码有效，但尚未投稿过（未绑定身份）`);
    console.log(c.gray(`  ${result.note}`));
    return;
  }

  await logOk(`身份：${c.cyan(result.author || '(未命名)')}`);

  if (result.styles.length) {
    console.log();
    console.log(c.bold('  已上架风格') + c.gray(` (${result.styles.length})`));
    printTable(['slug', 'name', 'version', 'author'], result.styles.map((s) => [s.slug, s.name, s.version, s.author || '']));
  }
  if (result.pending.length) {
    console.log();
    console.log(c.bold('  审核队列') + c.gray(` (${result.pending.length})`));
    printTable(['slug', 'name', 'version'], result.pending.map((s) => [s.slug, s.name, s.version]));
  }
  if (!result.styles.length && !result.pending.length) {
    console.log(c.gray('  暂无已上架/待审风格'));
  }
  console.log();
  console.log(c.gray(`  ${result.note}`));
}
