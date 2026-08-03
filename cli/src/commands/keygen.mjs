// taste-bank keygen
// 生成 ed25519 密钥对，写 ~/.style-lab/{private,public}.key（chmod 600）
import fs from 'node:fs';
import path from 'node:path';
import { generateKeypair } from '../lib/auth.mjs';
import { FILES, CONFIG_DIR } from '../lib/config.mjs';
import { logOk, logErr, logWarn, c } from '../lib/ui.mjs';

export async function cmdKeygen(args) {
  // 安全：已存在则拒绝（避免覆盖老私钥导致旧风格失控）
  if (fs.existsSync(FILES.privateKey)) {
    await logErr(`已存在 ${FILES.privateKey}（覆盖 = 旧风格永久失控）。换钥匙请用 update 改 ownerPubkey。`);
    process.exit(1);
  }

  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  const { publicKey, privateKey } = generateKeypair();
  fs.writeFileSync(FILES.privateKey, privateKey + '\n', { mode: 0o600 });
  fs.writeFileSync(FILES.publicKey, publicKey + '\n');

  await logOk(`密钥已生成：`);
  console.log(`  ${c.gray('私钥')} ${FILES.privateKey} ${c.green('chmod 600')}`);
  console.log(`  ${c.gray('公钥')} ${FILES.publicKey} ${c.gray('（可公开，投稿时登记）')}`);
  console.log();
  await logWarn('请立即备份私钥，不要提交进任何 git 仓库。私钥丢失 = 名下风格永久失控。');
}
