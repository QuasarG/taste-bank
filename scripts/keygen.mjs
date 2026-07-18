// 生成一对 ed25519 钥匙：公钥投稿时登记，私钥本地保管用于管理签名
import { generateKeypair } from '../src/lib/auth.ts';

const { publicKey, privateKey } = generateKeypair();
console.log('公钥（投稿时作为 ownerPubkey 提交，可公开）:');
console.log(publicKey);
console.log('\n私钥（本地保管，泄露=失去风格管理权）:');
console.log(privateKey);
console.log('\n签名用法: node scripts/sign.mjs <私钥> <update|delete> <slug> [payload文件]');
