// ed25519 签名逻辑（内联，和主仓库 src/lib/auth.ts 一致）
// 全用 node:crypto，零依赖。base64 DER 格式（公钥 spki，私钥 pkcs8）。
// 致命细节见 api.mjs：submit/update 的签名基于原始请求体字节。

import crypto from 'node:crypto';

export const TIMESTAMP_WINDOW_MS = 30 * 60 * 1000; // 30 分钟窗口

export function generateKeypair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  return {
    publicKey: publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
    privateKey: privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64'),
  };
}

export function isValidPubkey(b64) {
  try {
    crypto.createPublicKey({ key: Buffer.from(b64, 'base64'), format: 'der', type: 'spki' });
    return true;
  } catch {
    return false;
  }
}

export function payloadHash(payload) {
  return crypto.createHash('sha256').update(payload).digest('hex'); // lowercase hex
}

// 签名消息规范形式：style-lab:<action>:<slug>:<timestamp>:<sha256(payload)>
export function canonicalMessage(action, slug, timestamp, payload) {
  return `style-lab:${action}:${slug}:${timestamp}:${payloadHash(payload)}`;
}

// crypto.sign(null, ...) 的 null 是 ed25519 的正确 algorithm 参数
export function signMessage(message, privateKeyB64) {
  const key = crypto.createPrivateKey({ key: Buffer.from(privateKeyB64, 'base64'), format: 'der', type: 'pkcs8' });
  return crypto.sign(null, Buffer.from(message), key).toString('base64');
}

export function verifyMessage(message, signatureB64, publicKeyB64) {
  try {
    const key = crypto.createPublicKey({ key: Buffer.from(publicKeyB64, 'base64'), format: 'der', type: 'spki' });
    return crypto.verify(null, Buffer.from(message), key, Buffer.from(signatureB64, 'base64'));
  } catch {
    return false;
  }
}

export function timestampInWindow(ts) {
  const t = Number(ts);
  return Number.isFinite(t) && Math.abs(Date.now() - t) <= TIMESTAMP_WINDOW_MS;
}

// 比较语义版本号：a < b 返回 true
export function compareVersionLessThan(a, b) {
  const pa = String(a).replace(/-.*$/, '').split('.').map(Number);
  const pb = String(b).replace(/-.*$/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) < (pb[i] || 0)) return true;
    if ((pa[i] || 0) > (pb[i] || 0)) return false;
  }
  return false;
}
