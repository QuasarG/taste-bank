// taste-bank keygen
// 生成 ed25519 密钥对 + 绑定作者名。原子写入三文件，强制只生成一次。
import fs from 'node:fs';
import { generateKeypair } from '../lib/auth.mjs';
import { CONFIG_DIR, FILES, keyPairStatus, writeText, writeAuthor, readText } from '../lib/config.mjs';
import { text, confirm, logOk, logErr, logWarn, note, c } from '../lib/ui.mjs';

export async function cmdKeygen(args) {
  const kp = keyPairStatus();

  // 1. private.key 已存在 → 拒绝（已有身份）
  if (kp.hasPrivateKey) {
    const author = readText(FILES.author);
    await logErr(`已存在 ${FILES.privateKey}（${author ? '身份：' + author : '已有密钥'}）。`);
    console.log(c.gray('  覆盖 = 名下风格永久失控。'));
    console.log(c.gray('  换钥匙的正路：用旧私钥 taste-bank update <slug> <pack>，payload 里 ownerPubkey 填新公钥。'));
    process.exit(1);
  }

  // 2. public.key 存在但 private.key 不存在 → 警告残留（可能误删私钥）
  if (kp.hasPublicKey && !kp.hasPrivateKey) {
    await logWarn('检测到残留的 public.key，但 private.key 不存在——可能私钥被误删。');
    await logWarn('如果你有名下风格绑定在这个公钥上，私钥丢失 = 永久失控。');
    const proceed = await confirm('确认没有需要保留的旧身份，继续生成全新密钥对？', { defaultValue: false });
    if (!proceed) {
      console.log(c.gray('已取消。'));
      return;
    }
  }

  // 3. 生成 keypair
  const { publicKey, privateKey } = generateKeypair();

  // 4. 问作者名（绑定）
  const author = await text('输入作者名（投稿时显示，可后续 taste-bank config 改）：', {
    defaultValue: 'anonymous',
    placeholder: '如 QuasarG',
  });
  const authorName = (author || 'anonymous').trim();

  // 5. 原子写入（先确保目录，三个文件一起写）
  try {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    // 先写临时文件，全成功后再 rename（原子性）
    writeText(FILES.privateKey, privateKey, { mode: 0o600 });
    writeText(FILES.publicKey, publicKey);
    writeAuthor(authorName);
  } catch (e) {
    // 写入失败，清理半成品
    try { fs.unlinkSync(FILES.privateKey); } catch {}
    try { fs.unlinkSync(FILES.publicKey); } catch {}
    try { fs.unlinkSync(FILES.author); } catch {}
    await logErr(`写入失败：${e.message}（已清理半成品，请重试）`);
    process.exit(1);
  }

  // 6. 成功输出
  await logOk('身份已创建并绑定：');
  console.log(`  ${c.gray('私钥')} ${FILES.privateKey} ${c.green('chmod 600')}`);
  console.log(`  ${c.gray('公钥')} ${FILES.publicKey}`);
  console.log(`  ${c.gray('作者')} ${c.cyan(authorName)}`);
  console.log();

  // 7. 强提示（note 弹窗）
  await note(c.yellow('⚠ 私钥安全须知'), [
    '私钥是管理风格的唯一凭证，请立即备份：',
    '',
    '  • 不要提交进任何 git 仓库',
    '  • 不要误删 private.key 文件',
    '  • 丢失 = 名下风格永久失控，无法找回',
    '  • 换钥匙的正路：用旧私钥 update 改 ownerPubkey',
    '',
    '备份方法：复制 ~/.style-lab/private.key 到安全位置（如密码管理器、加密 U 盘）。',
  ]);
}
