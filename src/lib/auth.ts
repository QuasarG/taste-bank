import crypto from 'node:crypto';

export interface Keypair {
  publicKey: string;
  privateKey: string;
}

export const TIMESTAMP_WINDOW_MS = 30 * 60 * 1000;

export function generateKeypair(): Keypair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  return {
    publicKey: publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
    privateKey: privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64'),
  };
}

export function isValidPubkey(b64: string): boolean {
  try {
    crypto.createPublicKey({ key: Buffer.from(b64, 'base64'), format: 'der', type: 'spki' });
    return true;
  } catch {
    return false;
  }
}

export function payloadHash(payload: string): string {
  return crypto.createHash('sha256').update(payload).digest('hex');
}

// 签名消息的规范形式，HTTP 与 MCP 共用
export function canonicalMessage(action: string, slug: string, timestamp: string, payload: string): string {
  return `style-lab:${action}:${slug}:${timestamp}:${payloadHash(payload)}`;
}

export function signMessage(message: string, privateKeyB64: string): string {
  const key = crypto.createPrivateKey({ key: Buffer.from(privateKeyB64, 'base64'), format: 'der', type: 'pkcs8' });
  return crypto.sign(null, Buffer.from(message), key).toString('base64');
}

export function verifyMessage(message: string, signatureB64: string, publicKeyB64: string): boolean {
  try {
    const key = crypto.createPublicKey({ key: Buffer.from(publicKeyB64, 'base64'), format: 'der', type: 'spki' });
    return crypto.verify(null, Buffer.from(message), key, Buffer.from(signatureB64, 'base64'));
  } catch {
    return false;
  }
}

export function timestampInWindow(ts: string): boolean {
  const t = Number(ts);
  return Number.isFinite(t) && Math.abs(Date.now() - t) <= TIMESTAMP_WINDOW_MS;
}
