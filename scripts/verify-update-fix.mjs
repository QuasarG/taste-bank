// 本地验证脚本：跑通 create→approve→update→approve 全流程，确认 update 走 pending 不覆盖 live
// 用独立临时目录，不碰真实 styles/ 数据
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

// 1. 准备独立临时 STYLE_LAB_DIR
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'style-lab-verify-'));
process.env.STYLE_LAB_DIR = TMP;
fs.mkdirSync(path.join(TMP, 'styles'), { recursive: true });
console.log(`临时数据目录: ${TMP}\n`);

// 2. 动态 import（确保 env 生效后才加载模块）
const { createStylePack, updateStylePack } = await import('../src/lib/create.ts');
const { approveStyle, listPendingMeta, pendingPath } = await import('../src/lib/review.ts');
const { STYLES_DIR } = await import('../src/lib/store.ts');

// 3. 生成临时密钥对
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const pubB64 = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
const privB64 = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64');

// 4. 准备一个邀请码（mock：直接跳过 checkInvite？不行，createStylePack 会调）
//    看 invites.ts 怎么实现——如果走环境变量就最简单。先读一眼。
//    保险起见：直接构造 payload + 手动调内部，绕开 createStylePack 的 invite/auth 校验，
//    因为我们只测 updateStylePack 的写入路径 + approveStyle 的覆盖逻辑。
//    但 updateStylePack 也需要 assertOwnership（live 已存在 + 签名匹配）。
//    所以我们得：先造一个合法的 live 风格（手写 styles/<slug>/ 全部文件 + owner.key），
//    再用对应私钥签名调 updateStylePack。

function sign(action, slug, timestamp, payload) {
  const hash = crypto.createHash('sha256').update(payload).digest('hex');
  const msg = `style-lab:${action}:${slug}:${timestamp}:${hash}`;
  const key = crypto.createPrivateKey({ key: Buffer.from(privB64, 'base64'), format: 'der', type: 'pkcs8' });
  return crypto.sign(null, Buffer.from(msg), key).toString('base64');
}

const SLUG = 'test-verify-update';
const liveDir = path.join(STYLES_DIR, SLUG);

// 5. 手造一个 v1.0.0 的 live 风格（绕开 create+invite，直接放 live 目录）
const liveMeta = {
  slug: SLUG, name: '测试风格', version: '1.0.0',
  summary: '初始版本', mood: ['测试'], useCase: '验证脚本',
  signature: '测试', rules: { do: [], dont: [], voice: '' },
  author: 'tester', createdAt: '2026-07-25',
};
fs.mkdirSync(path.join(liveDir, 'templates'), { recursive: true });
fs.writeFileSync(path.join(liveDir, 'meta.json'), JSON.stringify(liveMeta, null, 2));
fs.writeFileSync(path.join(liveDir, 'tokens.json'), JSON.stringify({
  color: { bg: '#fff', surface: '#fff', text: '#000', muted: '#666', line: '#eee', accent: '#00f' },
  font: { display: 'sans', body: 'sans' },
  size: { display: '24px', h1: '24px', h2: '20px', body: '14px', small: '12px' },
  space: { sm: '8px', md: '16px', lg: '24px' },
  radius: { sm: '4px', md: '8px' },
  shadow: { card: 'none' }, motion: { duration: '150ms', easing: 'ease' },
}, null, 2));
fs.writeFileSync(path.join(liveDir, 'SKILL.md'), '# Test Style Initial\nThis is the initial skill content for the verification script, long enough to pass the fifty character minimum requirement check.');
fs.writeFileSync(path.join(liveDir, 'templates/page.html'), '<!DOCTYPE html><html><body>v1.0.0</body></html>');
fs.writeFileSync(path.join(liveDir, 'owner.key'), pubB64 + '\n');

console.log('=== 步骤 1: 造好 v1.0.0 live 风格 ===');
console.log(`live 目录: ${liveDir}`);
console.log(`live meta.version: ${liveMeta.version}\n`);

// 6. 调 updateStylePack 提交 v1.1.0（攻击者场景：想覆盖 live）
const fullTokens = {
  color: { bg: '#fff', surface: '#fff', text: '#000', muted: '#666', line: '#eee', accent: '#00f' },
  font: { display: 'sans', body: 'sans' },
  size: { display: '24px', h1: '24px', h2: '20px', body: '14px', small: '12px' },
  space: { sm: '8px', md: '16px', lg: '24px' },
  radius: { sm: '4px', md: '8px' },
  shadow: { card: 'none' },
  motion: { duration: '150ms', easing: 'ease' },
};
const updatePayload = JSON.stringify({
  meta: { ...liveMeta, version: '1.1.0', summary: '被替换的内容' },
  tokens: fullTokens,
  skill: '# Test Style Update\nThis is the updated skill content used by the verification script to ensure the length requirement of at least fifty characters is satisfied.',
  templates: { 'page.html': '<!DOCTYPE html><html><body>v1.1.0 被替换</body></html>' },
  ownerPubkey: pubB64,
});
const ts = Date.now().toString();
const sig = sign('update', SLUG, ts, updatePayload);

console.log('=== 步骤 2: 调用 updateStylePack 提交 v1.1.0 ===');
const result = updateStylePack(JSON.parse(updatePayload), { timestamp: ts, signature: sig }, updatePayload);
console.log(`返回 status: ${result.status} (应为 'pending')\n`);

console.log('=== 步骤 3: 验证 update 写到了 pending，live 没被动 ===');
const liveAfterUpdate = JSON.parse(fs.readFileSync(path.join(liveDir, 'meta.json'), 'utf8'));
const pendingExists = fs.existsSync(pendingPath(SLUG));
console.log(`live 版本: ${liveAfterUpdate.version} (应为 1.0.0，未被覆盖)`);
console.log(`pending 存在: ${pendingExists} (应为 true)`);
if (liveAfterUpdate.version !== '1.0.0') { console.log('❌ 失败：live 被覆盖了！漏洞仍在！'); process.exit(1); }
if (!pendingExists) { console.log('❌ 失败：update 没进 pending！'); process.exit(1); }
console.log('✓ update 正确写入 pending，live 未被动\n');

console.log('=== 步骤 4: listPendingMeta 应标记 isUpdate=true + liveVersion=1.0.0 ===');
const entries = listPendingMeta();
const entry = entries.find((e) => e.slug === SLUG);
console.log(`isUpdate: ${entry?.isUpdate} (应为 true)`);
console.log(`liveVersion: ${entry?.liveVersion} (应为 1.0.0)`);
if (!entry?.isUpdate || entry?.liveVersion !== '1.0.0') { console.log('❌ 失败'); process.exit(1); }
console.log('✓ 元数据正确\n');

console.log('=== 步骤 5: approveStyle 后，旧版归档 + live 变新版 ===');
approveStyle(SLUG);
const liveAfterApprove = JSON.parse(fs.readFileSync(path.join(liveDir, 'meta.json'), 'utf8'));
console.log(`live 版本: ${liveAfterApprove.version} (应为 1.1.0)`);
console.log(`live summary: ${liveAfterApprove.summary} (应为 "被替换的内容")`);
if (liveAfterApprove.version !== '1.1.0') { console.log('❌ 失败：live 没更新到 1.1.0'); process.exit(1); }

const archivedDir = path.join(TMP, 'data', 'archived');
const archives = fs.existsSync(archivedDir) ? fs.readdirSync(archivedDir) : [];
console.log(`归档目录: ${archives.join(', ') || '(空)'}`);
const legacyArchive = archives.find((a) => a.startsWith(`${SLUG}-v1.0.0-`));
if (!legacyArchive) { console.log('❌ 失败：旧版 v1.0.0 未归档'); process.exit(1); }
console.log(`✓ 旧版归档为: ${legacyArchive}`);

// 验证归档内容确实是旧版
const archivedMeta = JSON.parse(fs.readFileSync(path.join(archivedDir, legacyArchive, 'meta.json'), 'utf8'));
console.log(`归档内容版本: ${archivedMeta.version} (应为 1.0.0)`);
if (archivedMeta.version !== '1.0.0') { console.log('❌ 失败：归档的不是旧版'); process.exit(1); }
console.log('✓ 旧版正确归档，可回滚\n');

console.log('=== 步骤 6: pending 已清空 ===');
const pendingStillExists = fs.existsSync(pendingPath(SLUG));
console.log(`pending 还在: ${pendingStillExists} (应为 false)`);
if (pendingStillExists) { console.log('❌ 失败：pending 未清空'); process.exit(1); }
console.log('✓ pending 已清空\n');

console.log('========== 全部 6 步验证通过 ✓ ==========');
console.log(`\n临时目录可手动清理: rm -rf ${TMP}`);
