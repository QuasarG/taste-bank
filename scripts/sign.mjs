// 管理签名工具：node scripts/sign.mjs <私钥> <submit|update|delete> <slug> [payload文件]
import fs from 'node:fs';
import { canonicalMessage, signMessage } from '../src/lib/auth.ts';

const [, , privateKey, action, slug, payloadFile] = process.argv;
if (!privateKey || !action || !slug || !['submit', 'update', 'delete'].includes(action)) {
  console.error('用法: node scripts/sign.mjs <私钥> <submit|update|delete> <slug> [payload文件]');
  process.exit(1);
}

const payload = payloadFile ? fs.readFileSync(payloadFile, 'utf8') : '';
const timestamp = String(Date.now());
const signature = signMessage(canonicalMessage(action, slug, timestamp, payload), privateKey);

console.log(`timestamp: ${timestamp}`);
console.log(`signature: ${signature}`);
console.log('\ncurl 示例:');
if (action === 'submit') {
  console.log(`curl -X POST http://127.0.0.1:4321/api/styles.json \\
  -H 'content-type: application/json' -H 'x-invite-code: <邀请码>' \\
  -H 'x-timestamp: ${timestamp}' -H 'x-signature: ${signature}' \\
  --data-binary @${payloadFile ?? 'payload.json'}`);
} else if (action === 'update') {
  console.log(`curl -X PUT http://127.0.0.1:4321/api/styles/${slug}.json \\
  -H 'content-type: application/json' \\
  -H 'x-timestamp: ${timestamp}' -H 'x-signature: ${signature}' \\
  --data-binary @${payloadFile ?? 'payload.json'}`);
} else {
  console.log(`curl -X DELETE http://127.0.0.1:4321/api/styles/${slug}.json \\
  -H 'x-timestamp: ${timestamp}' -H 'x-signature: ${signature}'`);
}
